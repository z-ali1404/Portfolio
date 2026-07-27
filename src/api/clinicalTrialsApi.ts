import type { RawStudiesResponse, RawStudy, TrialSearchParams } from "@/types/clinicalTrials";

/**
 * Thin client for the ClinicalTrials.gov v2 API.
 * Docs: https://clinicaltrials.gov/data-api/api
 *
 * No API key / auth required. CORS is enabled by the registry, so this
 * runs entirely from the browser — no proxy or backend needed.
 */

const BASE_URL = "https://clinicaltrials.gov/api/v2";

/**
 * Module-level field list for search results. Requesting only the modules
 * the trial card needs (rather than the full record, which also includes
 * arms, outcomes, eligibility text, locations, etc.) keeps list responses
 * fast even though a single full study record can be tens of KB.
 * Full detail is fetched separately, per-study, on demand — see
 * `getStudyByNctId` below.
 */
const SUMMARY_FIELDS = [
  "protocolSection.identificationModule",
  "protocolSection.statusModule",
  "protocolSection.sponsorCollaboratorsModule",
  "protocolSection.conditionsModule",
  "protocolSection.designModule",
  "protocolSection.descriptionModule",
  "hasResults",
].join(",");

export class ClinicalTrialsApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = "ClinicalTrialsApiError";
  }
}

/** Builds an Essie boolean expression for fields that lack a dedicated `filter.*` param (phase, study type). */
function buildAdvancedFilter(params: TrialSearchParams): string | undefined {
  const clauses: string[] = [];

  if (params.phases.length > 0) {
    clauses.push(`AREA[Phase](${params.phases.join(" OR ")})`);
  }

  if (params.studyType) {
    clauses.push(`AREA[StudyType]${params.studyType}`);
  }

  return clauses.length > 0 ? clauses.join(" AND ") : undefined;
}

function buildSearchQuery(params: TrialSearchParams): URLSearchParams {
  const query = new URLSearchParams();

  // NCT ID lookup is treated as an exact, standalone identifier search —
  // it takes precedence over free-text term matching.
  if (params.nctId) {
    query.set("query.id", params.nctId.trim());
  } else if (params.term) {
    query.set("query.term", params.term.trim());
  }

  if (params.condition) query.set("query.cond", params.condition.trim());
  if (params.intervention) query.set("query.intr", params.intervention.trim());
  if (params.sponsor) query.set("query.spons", params.sponsor.trim());

  if (params.statuses.length > 0) {
    query.set("filter.overallStatus", params.statuses.join(","));
  }

  const advanced = buildAdvancedFilter(params);
  if (advanced) query.set("filter.advanced", advanced);

  if (params.sort !== "relevance") {
    query.set("sort", params.sort);
  }

  query.set("pageSize", String(params.pageSize));
  query.set("countTotal", "true");
  query.set("fields", SUMMARY_FIELDS);

  if (params.pageToken) {
    query.set("pageToken", params.pageToken);
  }

  return query;
}

export async function searchStudies(
  params: TrialSearchParams,
  signal?: AbortSignal
): Promise<RawStudiesResponse> {
  const query = buildSearchQuery(params);
  const url = `${BASE_URL}/studies?${query.toString()}`;

  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ClinicalTrialsApiError(
      "Could not reach ClinicalTrials.gov. Check your connection and try again."
    );
  }

  if (!response.ok) {
    throw new ClinicalTrialsApiError(
      `ClinicalTrials.gov returned an error (${response.status}). The search may be malformed.`,
      response.status
    );
  }

  return (await response.json()) as RawStudiesResponse;
}

/** Fetches the complete study record — used when a trial card is expanded. */
export async function getStudyByNctId(
  nctId: string,
  signal?: AbortSignal
): Promise<RawStudy> {
  const url = `${BASE_URL}/studies/${encodeURIComponent(nctId)}`;

  let response: Response;
  try {
    response = await fetch(url, { signal });
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") throw err;
    throw new ClinicalTrialsApiError(
      "Could not reach ClinicalTrials.gov while loading study details."
    );
  }

  if (!response.ok) {
    throw new ClinicalTrialsApiError(
      `Could not load details for ${nctId} (${response.status}).`,
      response.status
    );
  }

  return (await response.json()) as RawStudy;
}
