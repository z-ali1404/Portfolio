import type { TrialSummary } from "@/types/clinicalTrials";

/**
 * Client-side safety net that runs after `query.intr`/`query.term` results
 * come back from ClinicalTrials.gov. The API's own relevance sort is a
 * reasonable first pass, but it can still rank a trial that merely mentions
 * a drug in its summary above one that studies it as the actual
 * intervention. This re-scores and re-sorts using only the intervention
 * list plus a couple of text fields, so an exact intervention-name match is
 * always first regardless of what order the API returned.
 */

export const MATCH_LABELS: Record<number, string> = {
  3: "Exact drug match",
  2: "Drug match",
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
 * Scores a single study against a search term:
 *   3 = an intervention name is an exact match (case-insensitive) to the term
 *   2 = an intervention name contains the term as a whole word
 *   1 = the term appears in title/conditions/summary but not in the interventions
 *   0 = no meaningful match
 */
export function scoreStudy(study: TrialSummary, searchTerm: string): number {
  const term = searchTerm.trim().toLowerCase();
  if (!term) return 0;

  const interventionNames = study.interventionNames ?? [];

  if (interventionNames.some((name) => name.trim().toLowerCase() === term)) {
    return 3;
  }

  if (interventionNames.some((name) => wholeWordMatch(name, term))) {
    return 2;
  }

  const textFields = [study.briefTitle, ...study.conditions, study.briefSummary].filter(
    (v): v is string => Boolean(v)
  );
  if (textFields.some((field) => wholeWordMatch(field, term))) {
    return 1;
  }

  return 0;
}

/**
 * Re-ranks studies by relevance score (descending), stable within each
 * score band so the API's own ordering still breaks ties. Attaches
 * `matchScore`/`matchLabel` to each study for the UI badge.
 */
export function rerankByRelevance(studies: TrialSummary[], searchTerm: string): TrialSummary[] {
  const term = searchTerm.trim();
  if (!term) return studies;

  return studies
    .map((study, index) => ({ study, index, score: scoreStudy(study, term) }))
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
