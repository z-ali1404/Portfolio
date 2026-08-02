import type { TrialSummary } from "@/types/clinicalTrials";

/**
 * Client-side safety net that runs after `query.intr`/`query.cond`/`query.term`
 * results come back from ClinicalTrials.gov. The API's own relevance sort is
 * a reasonable first pass, but it can still rank a trial that merely
 * mentions a drug in its summary above one that studies it as the actual
 * intervention, and it has no notion of "this record satisfies both the
 * intervention AND condition the user searched for." This re-scores and
 * re-sorts using the structured intervention/condition fields (falling back
 * to a couple of general text fields only when neither was searched), so a
 * record matching multiple relevant fields — the exact case the normal
 * search bar's classifier in `lib/queryClassifier.ts` produces from free
 * text like "paracetamol headache" — always ranks above one matching only
 * a single field, regardless of what order the API returned.
 */

export const MATCH_LABELS: Record<number, string> = {
  4: "Drug + condition match",
  3: "Exact match",
  2: "Relevant match",
  1: "Related trial",
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function wholeWordMatch(haystack: string, needle: string): boolean {
  const pattern = new RegExp(`\\b${escapeRegExp(needle)}\\b`, "i");
  return pattern.test(haystack);
}

/**
 * Scores how well a set of field names (e.g. a study's intervention names,
 * or its conditions) matches a space-separated list of search terms:
 *   3 = an exact (case-insensitive) match on some term
 *   2 = a term appears as a whole word within some name
 *   1 = a term appears as a substring — the fuzzy/partial fallback tier, so
 *       a typo'd or truncated term (e.g. "paracet", "head") still surfaces
 *       a non-zero match instead of being scored as if it weren't there
 *   0 = no term matches at all
 *
 * Also returns a 0..1 "specificity" bonus used to break ties within a tier:
 * matches on a name listed earlier (the study's primary intervention/
 * condition rather than its 6th of 8) and matches where the term accounts
 * for most of the matched name (vs. a long name the term is only a small
 * fragment of) score higher. This is what lets two studies that both land
 * in tier 3 ("exact match") still rank distinctly instead of falling back
 * to the API's original order.
 */
function tierScoreWithSpecificity(names: string[], termsRaw: string): { tier: 0 | 1 | 2 | 3; specificity: number } {
  const terms = termsRaw.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0 || names.length === 0) return { tier: 0, specificity: 0 };

  let best: 0 | 1 | 2 | 3 = 0;
  let bestSpecificity = 0;
  const total = names.length;

  names.forEach((rawName, position) => {
    const name = rawName.trim().toLowerCase();
    if (!name) return;
    const positionBonus = 1 - position / total; // 1.0 for first-listed, shrinks toward 0

    for (const term of terms) {
      let tier: 0 | 1 | 2 | 3 = 0;
      let lengthBonus = 0;

      if (name === term) {
        tier = 3;
        lengthBonus = 1;
      } else if (wholeWordMatch(rawName, term)) {
        tier = 2;
        lengthBonus = term.length / name.length;
      } else if (name.includes(term)) {
        tier = 1;
        lengthBonus = term.length / name.length;
      }

      if (tier === 0) continue;
      const specificity = 0.5 * positionBonus + 0.5 * lengthBonus;
      if (tier > best || (tier === best && specificity > bestSpecificity)) {
        best = tier;
        bestSpecificity = specificity;
      }
    }
  });

  return { tier: best, specificity: bestSpecificity };
}

export interface FieldTerms {
  intervention: string;
  condition: string;
  term: string;
}

/**
 * Scores a study against the same three structured fields Advanced Search
 * exposes (Condition, Intervention) plus a generic-text fallback:
 *   4 = both an intervention term AND a condition term matched this record
 *       — reward matches that satisfy both relevant fields simultaneously,
 *       e.g. "paracetamol" (intervention) + "headache" (condition), rather
 *       than ranking on either field alone.
 *   3 = an exact match on whichever single structured field was searched
 *   2 = a partial/whole-word match on a structured field, or one side of a
 *       combined intervention+condition query matched but not the other
 *   1 = only the generic-text fallback matched (title/summary/conditions),
 *       used when no structured field was populated at all
 *   0 = no meaningful match
 */
export function scoreStudy(study: TrialSummary, fields: FieldTerms): number {
  return scoreStudyWithSpecificity(study, fields).score;
}

/**
 * Whether a search term shows up in the trial's own title — a strong signal
 * that the term is what the study is actually *about*, as opposed to a drug
 * or condition that's merely present in the record (e.g. a background
 * medication continued alongside the arm under study, or a comparator).
 * Two records can both be a clean "exact match" on the structured
 * intervention field yet differ enormously in relevance for exactly this
 * reason, so this is folded into specificity to separate them.
 */
function titleBonus(title: string | undefined, termsRaw: string): number {
  if (!title) return 0;
  const terms = termsRaw.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return 0;
  return terms.some((term) => wholeWordMatch(title, term)) ? 1 : 0;
}

/** Same as `scoreStudy`, plus a 0..1 specificity value used to break ties within a score band. */
function scoreStudyWithSpecificity(study: TrialSummary, fields: FieldTerms): { score: number; specificity: number } {
  const intervention = fields.intervention
    ? tierScoreWithSpecificity(study.interventionNames ?? [], fields.intervention)
    : { tier: 0 as const, specificity: 0 };
  const condition = fields.condition
    ? tierScoreWithSpecificity(study.conditions ?? [], fields.condition)
    : { tier: 0 as const, specificity: 0 };

  // Blend in title relevance: 2/3 structured-field specificity, 1/3 whether
  // the term is prominent enough to appear in the title itself.
  const withTitle = (base: { tier: 0 | 1 | 2 | 3; specificity: number }, field: string) => ({
    tier: base.tier,
    specificity: base.tier > 0 ? (2 / 3) * base.specificity + (1 / 3) * titleBonus(study.briefTitle, field) : 0,
  });
  const interventionScored = fields.intervention ? withTitle(intervention, fields.intervention) : intervention;
  const conditionScored = fields.condition ? withTitle(condition, fields.condition) : condition;

  if (fields.intervention && fields.condition) {
    if (interventionScored.tier > 0 && conditionScored.tier > 0) {
      return { score: 4, specificity: (interventionScored.specificity + conditionScored.specificity) / 2 };
    }
    const best = interventionScored.tier > conditionScored.tier ? interventionScored : conditionScored;
    return { score: best.tier > 0 ? 2 : 0, specificity: best.specificity };
  }

  if (fields.intervention) return { score: interventionScored.tier, specificity: interventionScored.specificity };
  if (fields.condition) return { score: conditionScored.tier, specificity: conditionScored.specificity };

  if (fields.term) {
    const textFields = [study.briefTitle, ...study.conditions, study.briefSummary].filter(
      (v): v is string => Boolean(v)
    );
    const text = tierScoreWithSpecificity(textFields, fields.term);
    return { score: text.tier > 0 ? 1 : 0, specificity: text.specificity };
  }

  return { score: 0, specificity: 0 };
}

/**
 * Re-ranks studies by relevance score (descending). Within a score band,
 * ties are broken by specificity (how prominently and cleanly the term
 * matched — see `tierScoreWithSpecificity`) before finally falling back to
 * the API's own ordering. Attaches `matchScore`/`matchLabel` to each study
 * for the UI badge.
 */
export function rerankByRelevance(studies: TrialSummary[], fields: FieldTerms): TrialSummary[] {
  if (!fields.intervention && !fields.condition && !fields.term) return studies;

  return studies
    .map((study, index) => ({ study, index, ...scoreStudyWithSpecificity(study, fields) }))
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.specificity !== a.specificity) return b.specificity - a.specificity;
      return a.index - b.index;
    })
    .map(({ study, score }) => ({
      ...study,
      matchScore: score,
      matchLabel: MATCH_LABELS[score],
    }));
}

/** Logs raw intervention field values for a study — used to debug why a query.intr match didn't trigger. */
export function debugLogInterventions(searchTerm: string, studies: TrialSummary[]): void {
  // eslint-disable-next-line no-console
  console.debug(
    `[relevanceRanking] "${searchTerm}" — intervention lists returned by the API:`,
    studies.map((s) => ({ nctId: s.nctId, title: s.briefTitle, interventionNames: s.interventionNames }))
  );
}
