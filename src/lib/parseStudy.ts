import type {
  ArmGroup,
  EligibilityInfo,
  InterventionDetail,
  LocationInfo,
  Outcome,
  RawArmGroup,
  RawLocation,
  RawOutcome,
  RawStudy,
  TrialDetail,
  TrialSummary,
} from "@/types/clinicalTrials";

/**
 * Parsing / mapping layer for ClinicalTrials.gov v2 study records.
 *
 * This is the single place in the app that reaches into the raw,
 * deeply-nested `protocolSection.*` JSON. Every access uses optional
 * chaining: a missing module, a missing field, or an unexpected shape
 * never throws — it just becomes `undefined` or an empty array in the
 * resulting domain object, and the UI is responsible for rendering that
 * gracefully (e.g. "Not reported").
 *
 * Note: intermediate values are read via `?.` chains rather than
 * `moduleX ?? {}` fallbacks — the latter widens to a `Module | {}` union
 * in TypeScript, and property access on the `{}` arm doesn't typecheck.
 */

function safeArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

function nonEmptyStrings(values: (string | undefined)[]): string[] {
  return values.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

export function parseStudySummary(raw: RawStudy): TrialSummary {
  const protocol = raw.protocolSection;

  return {
    nctId: protocol?.identificationModule?.nctId ?? "UNKNOWN",
    briefTitle: protocol?.identificationModule?.briefTitle ?? "Untitled study",
    officialTitle: protocol?.identificationModule?.officialTitle,
    overallStatus: protocol?.statusModule?.overallStatus,
    studyType: protocol?.designModule?.studyType,
    phases: safeArray(protocol?.designModule?.phases),
    conditions: safeArray(protocol?.conditionsModule?.conditions),
    interventionNames: [], // populated in detail view; list payload omits armsInterventionsModule
    leadSponsor: protocol?.sponsorCollaboratorsModule?.leadSponsor?.name,
    collaborators: nonEmptyStrings(
      safeArray(protocol?.sponsorCollaboratorsModule?.collaborators).map((c) => c.name)
    ),
    enrollmentCount: protocol?.designModule?.enrollmentInfo?.count,
    startDate: protocol?.statusModule?.startDateStruct?.date,
    completionDate: protocol?.statusModule?.completionDateStruct?.date,
    lastUpdatePostDate: protocol?.statusModule?.lastUpdatePostDateStruct?.date,
    briefSummary: protocol?.descriptionModule?.briefSummary,
    hasResults: raw.hasResults === true,
  };
}

function parseArmGroup(raw: RawArmGroup): ArmGroup {
  return {
    label: raw.label ?? "Unlabeled arm",
    type: raw.type,
    description: raw.description,
    interventionNames: nonEmptyStrings(safeArray(raw.interventionNames)),
  };
}

function parseOutcome(raw: RawOutcome): Outcome {
  return {
    measure: raw.measure ?? "Not reported",
    description: raw.description,
    timeFrame: raw.timeFrame,
  };
}

function parseLocation(raw: RawLocation): LocationInfo {
  return {
    facility: raw.facility,
    city: raw.city,
    state: raw.state,
    country: raw.country,
    status: raw.status,
  };
}

export function parseStudyDetail(raw: RawStudy): TrialDetail {
  const summary = parseStudySummary(raw);
  const protocol = raw.protocolSection;

  const armsModule = protocol?.armsInterventionsModule;
  const designInfoRaw = protocol?.designModule?.designInfo;
  const eligibilityModule = protocol?.eligibilityModule;

  const interventions: InterventionDetail[] = safeArray(armsModule?.interventions).map((iv) => ({
    type: iv.type,
    name: iv.name ?? "Unnamed intervention",
    description: iv.description,
    armGroupLabels: nonEmptyStrings(safeArray(iv.armGroupLabels)),
  }));

  const eligibility: EligibilityInfo = {
    criteria: eligibilityModule?.eligibilityCriteria,
    healthyVolunteers: eligibilityModule?.healthyVolunteers,
    sex: eligibilityModule?.sex,
    minimumAge: eligibilityModule?.minimumAge,
    maximumAge: eligibilityModule?.maximumAge,
    stdAges: nonEmptyStrings(safeArray(eligibilityModule?.stdAges)),
  };

  return {
    ...summary,
    // Detail fetches return the full record, so interventionNames can now
    // be populated (the summary/list fetch intentionally omits this module).
    interventionNames: nonEmptyStrings(safeArray(armsModule?.interventions).map((iv) => iv.name)),
    detailedDescription: protocol?.descriptionModule?.detailedDescription,
    keywords: nonEmptyStrings(safeArray(protocol?.conditionsModule?.keywords)),
    designInfo: {
      allocation: designInfoRaw?.allocation,
      interventionModel: designInfoRaw?.interventionModel,
      primaryPurpose: designInfoRaw?.primaryPurpose,
      masking: designInfoRaw?.maskingInfo?.masking,
      whoMasked: nonEmptyStrings(safeArray(designInfoRaw?.maskingInfo?.whoMasked)),
    },
    armGroups: safeArray(armsModule?.armGroups).map(parseArmGroup),
    interventions,
    primaryOutcomes: safeArray(protocol?.outcomesModule?.primaryOutcomes).map(parseOutcome),
    secondaryOutcomes: safeArray(protocol?.outcomesModule?.secondaryOutcomes).map(parseOutcome),
    eligibility,
    locations: safeArray(protocol?.contactsLocationsModule?.locations).map(parseLocation),
    whyStopped: protocol?.statusModule?.whyStopped,
  };
}
