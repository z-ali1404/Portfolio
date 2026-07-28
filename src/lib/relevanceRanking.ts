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
 */
function tierScore(names: string[], termsRaw: string): 0 | 1 | 2 | 3 {
  const terms = termsRaw.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0 || names.length === 0) return 0;

  let best: 0 | 1 | 2 | 3 = 0;
  for (const rawName of names) {
    const name = rawName.trim().toLowerCase();
    if (!name) continue;
    for (const term of terms) {
      if (name === term) best = 3;
      else if (best < 2 && wholeWordMatch(rawName, term)) best = 2;
      else if (best < 1 && name.includes(term)) best = 1;
    }
    if (best === 3) break;
  }
  return best;
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
  const interventionTier = fields.intervention ? tierScore(study.interventionNames ?? [], fields.intervention) : 0;
  const conditionTier = fields.condition ? tierScore(study.conditions ?? [], fields.condition) : 0;

  if (fields.intervention && fields.condition) {
    if (interventionTier > 0 && conditionTier > 0) return 4;
    return Math.max(interventionTier, conditionTier) > 0 ? 2 : 0;
  }

  if (fields.intervention) return interventionTier;
  if (fields.condition) return conditionTier;

  if (fields.term) {
    const textFields = [study.briefTitle, ...study.conditions, study.briefSummary].filter(
      (v): v is string => Boolean(v)
    );
    return tierScore(textFields, fields.term) > 0 ? 1 : 0;
  }

  return 0;
}

/**
 * Re-ranks studies by relevance score (descending), stable within each
 * score band so the API's own ordering still breaks ties. Attaches
 * `matchScore`/`matchLabel` to each study for the UI badge.
 */
export function rerankByRelevance(studies: TrialSummary[], fields: FieldTerms): TrialSummary[] {
  if (!fields.intervention && !fields.condition && !fields.term) return studies;

  return studies
    .map((study, index) => ({ study, index, score: scoreStudy(study, fields) }))
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.index - b.index))
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
