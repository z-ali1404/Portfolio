/**
 * Type definitions for the ClinicalTrials.gov v2 API and for the domain
 * model this app derives from it.
 *
 * The "Raw*" types describe (a subset of) the actual nested JSON shape
 * returned by https://clinicaltrials.gov/api/v2/studies. They are
 * intentionally marked as partial/optional almost everywhere, because the
 * registry allows individual studies to omit entire modules. Every field
 * consumed from these types MUST be accessed defensively (optional
 * chaining / nullish coalescing) in the parsing layer — never assumed to
 * exist.
 *
 * The domain types (TrialSummary, TrialDetail, EvidenceSnapshot, ...) are
 * what the UI actually renders. They are flat, predictable, and always
 * fully constructed (missing data becomes `undefined` or an empty array,
 * never a thrown error).
 */

// ---------------------------------------------------------------------------
// Raw API shape (partial — only the pieces this app reads)
// ---------------------------------------------------------------------------

export interface RawDateStruct {
  date?: string;
  type?: string;
}

export interface RawIdentificationModule {
  nctId?: string;
  briefTitle?: string;
  officialTitle?: string;
  acronym?: string;
  organization?: { fullName?: string; class?: string };
}

export interface RawStatusModule {
  overallStatus?: string;
  lastKnownStatus?: string;
  whyStopped?: string;
  startDateStruct?: RawDateStruct;
  primaryCompletionDateStruct?: RawDateStruct;
  completionDateStruct?: RawDateStruct;
  lastUpdatePostDateStruct?: RawDateStruct;
  studyFirstPostDateStruct?: RawDateStruct;
  resultsFirstPostDateStruct?: RawDateStruct;
}

export interface RawSponsor {
  name?: string;
  class?: string;
}

export interface RawSponsorCollaboratorsModule {
  leadSponsor?: RawSponsor;
  collaborators?: RawSponsor[];
  responsibleParty?: { type?: string };
}

export interface RawDescriptionModule {
  briefSummary?: string;
  detailedDescription?: string;
}

export interface RawConditionsModule {
  conditions?: string[];
  keywords?: string[];
}

export interface RawMaskingInfo {
  masking?: string;
  whoMasked?: string[];
}

export interface RawDesignInfo {
  allocation?: string;
  interventionModel?: string;
  interventionModelDescription?: string;
  primaryPurpose?: string;
  maskingInfo?: RawMaskingInfo;
}

export interface RawEnrollmentInfo {
  count?: number;
  type?: string;
}

export interface RawDesignModule {
  studyType?: string;
  phases?: string[];
  designInfo?: RawDesignInfo;
  enrollmentInfo?: RawEnrollmentInfo;
}

export interface RawArmGroup {
  label?: string;
  type?: string;
  description?: string;
  interventionNames?: string[];
}

export interface RawIntervention {
  type?: string;
  name?: string;
  description?: string;
  armGroupLabels?: string[];
}

export interface RawArmsInterventionsModule {
  armGroups?: RawArmGroup[];
  interventions?: RawIntervention[];
}

export interface RawOutcome {
  measure?: string;
  description?: string;
  timeFrame?: string;
}

export interface RawOutcomesModule {
  primaryOutcomes?: RawOutcome[];
  secondaryOutcomes?: RawOutcome[];
}

export interface RawEligibilityModule {
  eligibilityCriteria?: string;
  healthyVolunteers?: boolean;
  sex?: string;
  minimumAge?: string;
  maximumAge?: string;
  stdAges?: string[];
}

export interface RawLocation {
  facility?: string;
  city?: string;
  state?: string;
  country?: string;
  status?: string;
}

export interface RawContactsLocationsModule {
  locations?: RawLocation[];
}

export interface RawProtocolSection {
  identificationModule?: RawIdentificationModule;
  statusModule?: RawStatusModule;
  sponsorCollaboratorsModule?: RawSponsorCollaboratorsModule;
  descriptionModule?: RawDescriptionModule;
  conditionsModule?: RawConditionsModule;
  designModule?: RawDesignModule;
  armsInterventionsModule?: RawArmsInterventionsModule;
  outcomesModule?: RawOutcomesModule;
  eligibilityModule?: RawEligibilityModule;
  contactsLocationsModule?: RawContactsLocationsModule;
}

export interface RawStudy {
  protocolSection?: RawProtocolSection;
  hasResults?: boolean;
}

export interface RawStudiesResponse {
  studies?: RawStudy[];
  totalCount?: number;
  nextPageToken?: string;
}

// ---------------------------------------------------------------------------
// Domain model — what components actually consume
// ---------------------------------------------------------------------------

export interface ArmGroup {
  label: string;
  type?: string;
  description?: string;
  interventionNames: string[];
}

export interface InterventionDetail {
  type?: string;
  name: string;
  description?: string;
  armGroupLabels: string[];
}

export interface Outcome {
  measure: string;
  description?: string;
  timeFrame?: string;
}

export interface EligibilityInfo {
  criteria?: string;
  healthyVolunteers?: boolean;
  sex?: string;
  minimumAge?: string;
  maximumAge?: string;
  stdAges: string[];
}

export interface LocationInfo {
  facility?: string;
  city?: string;
  state?: string;
  country?: string;
  status?: string;
}

export interface DesignInfo {
  allocation?: string;
  interventionModel?: string;
  primaryPurpose?: string;
  masking?: string;
  whoMasked: string[];
}

/**
 * Card-level, "abstract" view of a study. Built from a lighter-weight
 * search response so result lists stay fast even though the registry
 * itself is 500k+ studies deep.
 */
export interface TrialSummary {
  nctId: string;
  briefTitle: string;
  officialTitle?: string;
  overallStatus?: string;
  studyType?: string;
  phases: string[];
  conditions: string[];
  interventionNames: string[];
  leadSponsor?: string;
  collaborators: string[];
  enrollmentCount?: number;
  startDate?: string;
  completionDate?: string;
  lastUpdatePostDate?: string;
  briefSummary?: string;
  hasResults: boolean;
  /** Client-side relevance re-rank score (0-3) — see `lib/relevanceRanking.ts`. Undefined when no search term was active. */
  matchScore?: number;
  /** Human-readable badge text for the matchScore, e.g. "Exact drug match". */
  matchLabel?: string;
}

/**
 * Full detail view, only fetched (via /studies/{NCT_ID}) once a user
 * expands a card — this is the "deeper on demand" layer.
 */
export interface TrialDetail extends TrialSummary {
  detailedDescription?: string;
  keywords: string[];
  designInfo: DesignInfo;
  armGroups: ArmGroup[];
  interventions: InterventionDetail[];
  primaryOutcomes: Outcome[];
  secondaryOutcomes: Outcome[];
  eligibility: EligibilityInfo;
  locations: LocationInfo[];
  whyStopped?: string;
}

// ---------------------------------------------------------------------------
// Evidence review (rule-based, non-diagnostic) domain model
// ---------------------------------------------------------------------------

export type ConfidenceLevel = "stated" | "not-stated";

export interface EvidenceField<T extends string = string> {
  value: T;
  confidence: ConfidenceLevel;
}

export interface EvidenceSnapshot {
  randomization: EvidenceField;
  blinding: EvidenceField;
  comparator: EvidenceField;
  enrollmentScale: EvidenceField;
  phaseContext: EvidenceField;
  recruitmentState: EvidenceField;
  resultsAvailable: boolean;
  cautionFlag: boolean;
  cautionReason?: string;
  interpretationNote: string;
}

// ---------------------------------------------------------------------------
// Search / filter parameters used by the API layer and the search hook
// ---------------------------------------------------------------------------

// Values (other than "relevance") match ClinicalTrials.gov v2 `sort` field
// names exactly, which are PascalCase — e.g. `sort=LastUpdatePostDate:desc`.
export type SortOption =
  | "relevance"
  | "LastUpdatePostDate:desc"
  | "EnrollmentCount:desc"
  | "StartDate:desc";

/** Which field the main search bar routes free text into. */
export type SearchMode = "auto" | "intervention" | "condition" | "term";

export interface TrialSearchParams {
  term?: string;
  condition?: string;
  intervention?: string;
  sponsor?: string;
  nctId?: string;
  statuses: string[];
  phases: string[];
  studyType?: "INTERVENTIONAL" | "OBSERVATIONAL" | "";
  sort: SortOption;
  pageSize: number;
  pageToken?: string;
}

export interface TrialSearchResult {
  studies: TrialSummary[];
  totalCount?: number;
  nextPageToken?: string;
}
