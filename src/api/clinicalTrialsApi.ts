import type { RawStudiesResponse, RawStudy, TrialSearchParams, TrialSummary } from "@/types/clinicalTrials";
import { parseStudySummary } from "@/lib/parseStudy";

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
  // Interventions are included in the summary payload (despite the extra
  // weight) because the client-side relevance re-ranker needs each study's
  // intervention list to score exact/near-exact drug-name matches.
  "protocolSection.armsInterventionsModule",
  // Needed for the Summary View's geographic spread section. Only country
  // is actually read out of this module (see parseStudySummary), but the
  // API does not support requesting a sub-field of a module.
  "protocolSection.contactsLocationsModule",
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

  // The API has no literal "relevance" sort value — relevance-ranked order
  // (best match to query.term/query.intr/query.cond first) is what you get
  // by omitting `sort` entirely. Only send `sort` for the explicit
  // field-based options below; leaving it unset is the deliberate way to
  // request relevance ordering, not an oversight.
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

/** Server page size used specifically when gathering the full set for the Summary View. */
const SUMMARY_FETCH_PAGE_SIZE = 100;

export interface SummaryFetchResult {
  studies: TrialSummary[];
  /** Total trials matching the query on the server, which may exceed `studies.length` if the cap was hit. */
  totalCount: number;
  /** True if `studies.length` was cut short by `cap` rather than running out of pages. */
  isCapped: boolean;
}

/**
 * Gathers up to `cap` studies for a query by following `nextPageToken` across
 * as many requests as needed, for the Summary View's whole-result-set
 * aggregation. This is intentionally separate from the paginated fetch that
 * powers the visible trial list — the two have different goals (a fast,
 * fully-detailed first page vs. a complete-enough sample of summary fields).
 */
export async function fetchAllStudiesForSummary(
  params: Omit<TrialSearchParams, "pageSize" | "pageToken">,
  cap: number,
  signal?: AbortSignal
): Promise<SummaryFetchResult> {
  const studies: TrialSummary[] = [];
  let pageToken: string | undefined;
  let totalCount = 0;

  // Upper bound on requests, purely as a defensive guard against an
  // unexpected API response looping forever (e.g. a token that never clears).
  const maxRequests = Math.ceil(cap / SUMMARY_FETCH_PAGE_SIZE) + 1;

  for (let i = 0; i < maxRequests; i++) {
    const response = await searchStudies(
      { ...params, pageSize: SUMMARY_FETCH_PAGE_SIZE, pageToken },
      signal
    );
    totalCount = response.totalCount ?? totalCount;
    studies.push(...(response.studies ?? []).map(parseStudySummary));

    pageToken = response.nextPageToken;
    if (!pageToken || studies.length >= cap) break;
  }

  const trimmed = studies.slice(0, cap);
  const isCapped = totalCount > trimmed.length;

  return {
    studies: trimmed,
    totalCount,
    isCapped,
  };
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
