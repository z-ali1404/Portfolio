import type { EvidenceField, EvidenceSnapshot, TrialDetail } from "@/types/clinicalTrials";

/**
 * Rule-based "Validity Snapshot" transformation layer.
 *
 * This is the core differentiator of the dashboard: it turns raw registry
 * fields into a structured, reviewer-oriented summary of methodological
 * signals. It is intentionally simple and fully deterministic — every
 * output can be traced back to one or two source fields, with no inference
 * beyond what is explicitly documented below. That's a deliberate design
 * choice, not a limitation:
 *
 *   - It never invents a fact. If a field is absent, ambiguous, or outside
 *     the small set of values we recognize, the result is literally the
 *     string "Not clearly stated" rather than a guess.
 *   - It never renders a verdict ("this is a good/bad trial"). It only
 *     surfaces descriptive signals and one hedged interpretation sentence,
 *     explicitly framed as a review aid — not medical or investment advice.
 *   - Every branch is a plain if/switch over documented ClinicalTrials.gov
 *     v2 enum values, so it's trivial to explain in an interview: "phase
 *     context is derived from the `phases` array, enrollment scale from
 *     a fixed numeric threshold," etc.
 */

const NOT_STATED = "Not clearly stated";

function field<T extends string>(value: T, stated = true): EvidenceField<T> {
  return { value, confidence: stated ? "stated" : "not-stated" };
}

/** Randomization: read from designModule.designInfo.allocation. */
function assessRandomization(detail: TrialDetail): EvidenceField {
  if (detail.studyType === "OBSERVATIONAL") {
    return field("Not applicable (observational study)");
  }
  switch (detail.designInfo.allocation) {
    case "RANDOMIZED":
      return field("Randomized");
    case "NON_RANDOMIZED":
      return field("Non-randomized");
    default:
      return field(NOT_STATED, false);
  }
}

/** Blinding: read from designModule.designInfo.maskingInfo.masking. */
function assessBlinding(detail: TrialDetail): EvidenceField {
  switch (detail.designInfo.masking) {
    case "NONE":
      return field("Open-label");
    case "SINGLE":
      return field("Single-blind");
    case "DOUBLE":
      return field("Double-blind");
    case "TRIPLE":
      return field("Triple-blind");
    case "QUADRUPLE":
      return field("Quadruple-blind");
    default:
      return field(NOT_STATED, false);
  }
}

/** Comparator / control structure: inferred from arm group types. */
function assessComparator(detail: TrialDetail): EvidenceField {
  const armTypes = detail.armGroups.map((a) => a.type).filter(Boolean);

  if (detail.armGroups.length === 0) {
    return field(NOT_STATED, false);
  }
  if (detail.armGroups.length === 1) {
    return field("Single-arm");
  }
  if (armTypes.includes("PLACEBO_COMPARATOR")) {
    return field("Placebo-controlled");
  }
  if (armTypes.includes("ACTIVE_COMPARATOR")) {
    return field("Active-comparator controlled");
  }
  if (armTypes.includes("SHAM_COMPARATOR")) {
    return field("Sham-controlled");
  }
  // Multiple arms exist (e.g. dose-ranging), but none is a recognized
  // comparator/control type — we say so rather than guessing which arm
  // functions as the control.
  return field("Multi-arm (comparator type not clearly stated)", false);
}

/** Enrollment scale: fixed, documented thresholds over enrollmentCount. */
function classifyEnrollmentScale(enrollmentCount?: number): EvidenceField {
  if (enrollmentCount === undefined || enrollmentCount === null || Number.isNaN(enrollmentCount)) {
    return field(NOT_STATED, false);
  }
  if (enrollmentCount < 50) return field("Small (< 50 participants)");
  if (enrollmentCount <= 300) return field("Moderate (50–300 participants)");
  return field("Large (> 300 participants)");
}

/** Phase context: derived from the phases array, highest phase wins. */
function classifyPhaseContext(detail: TrialDetail): EvidenceField {
  if (detail.studyType === "OBSERVATIONAL") {
    return field("Not applicable (observational study)");
  }
  const phases = detail.phases;
  if (phases.includes("PHASE4")) return field("Post-marketing (Phase 4)");
  if (phases.includes("PHASE3")) return field("Later-phase / confirmatory (Phase 3)");
  if (phases.includes("PHASE2")) return field("Mid-phase / developmental (Phase 2)");
  if (phases.includes("PHASE1") || phases.includes("EARLY_PHASE1")) {
    return field("Early-phase (Phase 1)");
  }
  return field(NOT_STATED, false);
}

const STATUS_LABELS: Record<string, string> = {
  RECRUITING: "Recruiting",
  NOT_YET_RECRUITING: "Not yet recruiting",
  ENROLLING_BY_INVITATION: "Enrolling by invitation",
  ACTIVE_NOT_RECRUITING: "Active, not recruiting",
  COMPLETED: "Completed",
  TERMINATED: "Terminated",
  WITHDRAWN: "Withdrawn",
  SUSPENDED: "Suspended",
  UNKNOWN: "Status unknown",
};

const CAUTION_STATUSES = new Set(["TERMINATED", "WITHDRAWN", "SUSPENDED"]);

function describeRecruitmentState(overallStatus?: string): EvidenceField {
  if (!overallStatus || !(overallStatus in STATUS_LABELS)) {
    return field(NOT_STATED, false);
  }
  return field(STATUS_LABELS[overallStatus]);
}

function buildInterpretationNote(detail: TrialDetail, snapshot: Omit<EvidenceSnapshot, "interpretationNote">): string {
  const sentences: string[] = [];

  if (snapshot.cautionFlag) {
    sentences.push(
      `This trial's recorded status is "${snapshot.recruitmentState.value}"${
        snapshot.cautionReason ? ` (${snapshot.cautionReason})` : ""
      }, which is worth weighing before treating any reported findings as conclusive.`
    );
  }

  const designKnown =
    snapshot.randomization.confidence === "stated" || snapshot.blinding.confidence === "stated";

  if (detail.studyType === "OBSERVATIONAL") {
    sentences.push(
      "As an observational study, randomization and blinding concepts do not directly apply — causal claims from this design are generally considered weaker than from a controlled trial, on general methodological grounds."
    );
  } else if (designKnown) {
    const parts: string[] = [];
    if (snapshot.randomization.confidence === "stated") parts.push(snapshot.randomization.value.toLowerCase());
    if (snapshot.blinding.confidence === "stated") parts.push(snapshot.blinding.value.toLowerCase());
    if (snapshot.comparator.confidence === "stated") parts.push(snapshot.comparator.value.toLowerCase());
    sentences.push(
      `The registry describes this trial as ${parts.join(", ")}; in general, randomized, blinded, and controlled designs are considered by reviewers to support stronger causal confidence than single-arm or open-label designs, though this snapshot does not evaluate execution quality or actual results.`
    );
  } else {
    sentences.push(
      "Key design fields (randomization, blinding, comparator) are not clearly stated in the registry record, so methodological strength cannot be inferred from this snapshot alone — consult the full protocol or publication."
    );
  }

  if (snapshot.resultsAvailable) {
    sentences.push("Results have been posted to the registry for this study.");
  }

  return sentences.join(" ");
}

export function buildEvidenceSnapshot(detail: TrialDetail): EvidenceSnapshot {
  const randomization = assessRandomization(detail);
  const blinding = assessBlinding(detail);
  const comparator = assessComparator(detail);
  const enrollmentScale = classifyEnrollmentScale(detail.enrollmentCount);
  const phaseContext = classifyPhaseContext(detail);
  const recruitmentState = describeRecruitmentState(detail.overallStatus);

  const cautionFlag = detail.overallStatus ? CAUTION_STATUSES.has(detail.overallStatus) : false;
  const cautionReason = detail.whyStopped;

  const partialSnapshot = {
    randomization,
    blinding,
    comparator,
    enrollmentScale,
    phaseContext,
    recruitmentState,
    resultsAvailable: detail.hasResults,
    cautionFlag,
    cautionReason,
  };

  return {
    ...partialSnapshot,
    interpretationNote: buildInterpretationNote(detail, partialSnapshot),
  };
}
