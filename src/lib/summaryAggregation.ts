import type { TrialSummary } from "@/types/clinicalTrials";
import type {
  Breakdown,
  BiasLandscape,
  CountBucket,
  EnrollmentStats,
  GeographicSpread,
  OverviewStats,
  RankedItem,
  SponsorBreakdown,
  SummaryData,
  TimelineData,
} from "@/types/summary";
import {
  assessBlinding,
  assessComparator,
  assessRandomization,
  classifyEnrollmentScale,
  type DesignSignals,
} from "@/lib/evidenceReview";
import { formatStatus, titleCase } from "@/lib/formatters";

/**
 * Aggregation layer for the Summary View. Every function here is pure
 * (`TrialSummary[]` in, a typed breakdown out) and every breakdown tracks how
 * many trials had no usable value for that field, rather than silently
 * excluding them from the denominator. Nothing here fetches data — see
 * `api/clinicalTrialsApi.ts#fetchAllStudiesForSummary` for gathering the
 * result set, and `hooks/useSearchSummary.ts` for wiring fetch + cache +
 * these functions together.
 */

const PHASE_LABELS: Record<string, string> = {
  EARLY_PHASE1: "Early Phase 1",
  PHASE1: "Phase 1",
  PHASE2: "Phase 2",
  PHASE3: "Phase 3",
  PHASE4: "Phase 4",
  NA: "Not Applicable",
};
const PHASE_ORDER = ["EARLY_PHASE1", "PHASE1", "PHASE2", "PHASE3", "PHASE4", "NA"];

function pct(n: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((n / total) * 1000) / 10;
}

function toDesignSignals(study: TrialSummary): DesignSignals {
  return {
    studyType: study.studyType,
    allocation: study.allocation,
    masking: study.masking,
    armGroupTypes: study.armGroupTypes,
    phases: study.phases,
  };
}

function buildBreakdown(counts: Map<string, number>, notStatedCount: number, total: number): Breakdown {
  const buckets: CountBucket[] = Array.from(counts.entries())
    .map(([label, count]) => ({ label, count, percent: pct(count, total) }))
    .sort((a, b) => b.count - a.count);

  return {
    buckets,
    notStatedCount,
    notStatedPercent: pct(notStatedCount, total),
    totalConsidered: total,
  };
}

// ---------------------------------------------------------------------------
// 1. Overview stats
// ---------------------------------------------------------------------------

export function calculateOverviewStats(
  studies: TrialSummary[],
  meta: { totalMatching: number; cappedAt?: number }
): OverviewStats {
  let totalEnrollment = 0;
  let enrollmentReportedCount = 0;
  const statusCounts = new Map<string, { count: number; code: string }>();
  let earliestStartDate: string | undefined;
  let latestStartDate: string | undefined;
  let latestUpdateDate: string | undefined;

  for (const study of studies) {
    if (typeof study.enrollmentCount === "number" && !Number.isNaN(study.enrollmentCount)) {
      totalEnrollment += study.enrollmentCount;
      enrollmentReportedCount += 1;
    }

    const statusLabel = formatStatus(study.overallStatus).label;
    const code = study.overallStatus ?? "UNKNOWN";
    const existing = statusCounts.get(statusLabel);
    statusCounts.set(statusLabel, { count: (existing?.count ?? 0) + 1, code });

    if (study.startDate) {
      if (!earliestStartDate || study.startDate < earliestStartDate) earliestStartDate = study.startDate;
      if (!latestStartDate || study.startDate > latestStartDate) latestStartDate = study.startDate;
    }
    if (study.lastUpdatePostDate && (!latestUpdateDate || study.lastUpdatePostDate > latestUpdateDate)) {
      latestUpdateDate = study.lastUpdatePostDate;
    }
  }

  const statusBuckets: CountBucket[] = Array.from(statusCounts.entries())
    .map(([label, v]) => ({ label, count: v.count, percent: pct(v.count, studies.length), code: v.code }))
    .sort((a, b) => b.count - a.count);

  return {
    totalMatching: meta.totalMatching,
    loadedForSummary: studies.length,
    cappedAt: meta.cappedAt,
    totalEnrollment,
    enrollmentReportedCount,
    statusCounts: statusBuckets,
    earliestStartDate,
    latestStartDate,
    latestUpdateDate,
  };
}

// ---------------------------------------------------------------------------
// 2. Phase distribution
// ---------------------------------------------------------------------------

/**
 * A trial can legitimately carry more than one phase value (e.g. a
 * "Phase 2/Phase 3" study), so it is counted once in each of its phases
 * rather than assigned a single "primary" one — bucket percentages are
 * relative to trial count and so may sum to over 100%, which is expected.
 */
export function calculatePhaseDistribution(studies: TrialSummary[]): Breakdown {
  const counts = new Map<string, number>();
  let notStated = 0;

  for (const study of studies) {
    if (study.phases.length === 0) {
      notStated += 1;
      continue;
    }
    for (const phase of study.phases) {
      counts.set(phase, (counts.get(phase) ?? 0) + 1);
    }
  }

  const buckets: CountBucket[] = PHASE_ORDER.filter((p) => counts.has(p))
    .map((code) => ({ label: PHASE_LABELS[code], count: counts.get(code) ?? 0, percent: pct(counts.get(code) ?? 0, studies.length), code }))
    .concat(
      Array.from(counts.entries())
        .filter(([code]) => !PHASE_ORDER.includes(code))
        .map(([code, count]) => ({ label: titleCase(code), count, percent: pct(count, studies.length), code }))
    );

  return {
    buckets,
    notStatedCount: notStated,
    notStatedPercent: pct(notStated, studies.length),
    totalConsidered: studies.length,
  };
}

// ---------------------------------------------------------------------------
// 3. Study design breakdown (randomization / blinding / comparator)
// ---------------------------------------------------------------------------

export function calculateDesignBreakdown(studies: TrialSummary[]): {
  randomization: Breakdown;
  blinding: Breakdown;
  comparator: Breakdown;
} {
  const randomizationCounts = new Map<string, number>();
  const blindingCounts = new Map<string, number>();
  const comparatorCounts = new Map<string, number>();
  let randomizationNotStated = 0;
  let blindingNotStated = 0;
  let comparatorNotStated = 0;

  for (const study of studies) {
    const signals = toDesignSignals(study);

    const randomization = assessRandomization(signals);
    if (randomization.confidence === "not-stated") randomizationNotStated += 1;
    else randomizationCounts.set(randomization.value, (randomizationCounts.get(randomization.value) ?? 0) + 1);

    const blinding = assessBlinding(signals);
    if (blinding.confidence === "not-stated") blindingNotStated += 1;
    else blindingCounts.set(blinding.value, (blindingCounts.get(blinding.value) ?? 0) + 1);

    const comparator = assessComparator(signals);
    if (comparator.confidence === "not-stated") comparatorNotStated += 1;
    else comparatorCounts.set(comparator.value, (comparatorCounts.get(comparator.value) ?? 0) + 1);
  }

  return {
    randomization: buildBreakdown(randomizationCounts, randomizationNotStated, studies.length),
    blinding: buildBreakdown(blindingCounts, blindingNotStated, studies.length),
    comparator: buildBreakdown(comparatorCounts, comparatorNotStated, studies.length),
  };
}

// ---------------------------------------------------------------------------
// 4/5. Top interventions / conditions
// ---------------------------------------------------------------------------

function rankNames(values: string[][], exclude?: string): RankedItem[] {
  const counts = new Map<string, number>();
  const excludeLower = exclude?.trim().toLowerCase();

  for (const list of values) {
    const seenInTrial = new Set<string>();
    for (const raw of list) {
      const name = raw.trim();
      if (!name) continue;
      const lower = name.toLowerCase();
      if (excludeLower && lower.includes(excludeLower)) continue;
      // Count each trial once per distinct name, even if the raw list repeats it.
      if (seenInTrial.has(lower)) continue;
      seenInTrial.add(lower);
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count, percent: pct(count, values.length) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function calculateTopInterventions(studies: TrialSummary[], excludeTerm?: string): RankedItem[] {
  return rankNames(
    studies.map((s) => s.interventionNames),
    excludeTerm
  );
}

export function calculateTopConditions(studies: TrialSummary[]): RankedItem[] {
  return rankNames(studies.map((s) => s.conditions));
}

// ---------------------------------------------------------------------------
// 6. Sample size distribution
// ---------------------------------------------------------------------------

export function calculateEnrollmentDistribution(studies: TrialSummary[]): EnrollmentStats {
  const counts = new Map<string, number>();
  let notStated = 0;
  const reported: number[] = [];

  for (const study of studies) {
    const scale = classifyEnrollmentScale(study.enrollmentCount);
    if (scale.confidence === "not-stated") {
      notStated += 1;
    } else {
      counts.set(scale.value, (counts.get(scale.value) ?? 0) + 1);
      if (typeof study.enrollmentCount === "number") reported.push(study.enrollmentCount);
    }
  }

  reported.sort((a, b) => a - b);
  const median =
    reported.length === 0
      ? undefined
      : reported.length % 2 === 1
        ? reported[(reported.length - 1) / 2]
        : (reported[reported.length / 2 - 1] + reported[reported.length / 2]) / 2;
  const mean = reported.length === 0 ? undefined : reported.reduce((a, b) => a + b, 0) / reported.length;

  return {
    distribution: buildBreakdown(counts, notStated, studies.length),
    median,
    mean,
    reportedCount: reported.length,
  };
}

// ---------------------------------------------------------------------------
// 7. Sponsor breakdown
// ---------------------------------------------------------------------------

const ACADEMIC_OR_GOV_CLASSES = new Set(["NIH", "FED", "OTHER_GOV", "NETWORK"]);

export function calculateSponsorBreakdown(studies: TrialSummary[]): SponsorBreakdown {
  const sponsorCounts = new Map<string, number>();
  let industryCount = 0;
  let academicOrGovCount = 0;
  let otherOrUnknownCount = 0;

  for (const study of studies) {
    if (study.leadSponsor) {
      sponsorCounts.set(study.leadSponsor, (sponsorCounts.get(study.leadSponsor) ?? 0) + 1);
    }
    if (study.sponsorClass === "INDUSTRY") industryCount += 1;
    else if (study.sponsorClass && ACADEMIC_OR_GOV_CLASSES.has(study.sponsorClass)) academicOrGovCount += 1;
    else otherOrUnknownCount += 1;
  }

  const topSponsors: RankedItem[] = Array.from(sponsorCounts.entries())
    .map(([name, count]) => ({ name, count, percent: pct(count, studies.length) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    topSponsors,
    industryCount,
    academicOrGovCount,
    otherOrUnknownCount,
    industryPercent: pct(industryCount, studies.length),
    academicOrGovPercent: pct(academicOrGovCount, studies.length),
    otherOrUnknownPercent: pct(otherOrUnknownCount, studies.length),
  };
}

// ---------------------------------------------------------------------------
// 8. Geographic spread
// ---------------------------------------------------------------------------

export function calculateGeographicSpread(studies: TrialSummary[]): GeographicSpread {
  const counts = new Map<string, number>();
  let notReported = 0;

  for (const study of studies) {
    if (study.countries.length === 0) {
      notReported += 1;
      continue;
    }
    for (const country of study.countries) {
      counts.set(country, (counts.get(country) ?? 0) + 1);
    }
  }

  const topCountries: RankedItem[] = Array.from(counts.entries())
    .map(([name, count]) => ({ name, count, percent: pct(count, studies.length) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 15);

  return {
    topCountries,
    notReportedCount: notReported,
    notReportedPercent: pct(notReported, studies.length),
  };
}

// ---------------------------------------------------------------------------
// 9. Bias / quality landscape
// ---------------------------------------------------------------------------

/**
 * Reframes the same per-trial randomization/blinding/comparator
 * classifications (already used in the individual card's Evidence Review
 * panel) into a 3-tier risk-of-bias-style view, aggregated across the whole
 * result set. This is a transparent, rule-based bucketing of registry
 * fields — not a validated risk-of-bias tool (e.g. Cochrane RoB2) — and it
 * never renders a verdict on any single trial's actual execution quality.
 */
function riskTier(value: string, confidence: "stated" | "not-stated", lowRiskValues: string[]): string {
  if (confidence === "not-stated") return "Not clearly stated";
  return lowRiskValues.includes(value) ? "Low risk" : "Some concerns";
}

export function calculateBiasLandscape(studies: TrialSummary[]): BiasLandscape {
  const randomizationCounts = new Map<string, number>();
  const blindingCounts = new Map<string, number>();
  const comparatorCounts = new Map<string, number>();

  for (const study of studies) {
    const signals = toDesignSignals(study);

    const randomization = assessRandomization(signals);
    const randomizationTier = riskTier(randomization.value, randomization.confidence, ["Randomized"]);
    randomizationCounts.set(randomizationTier, (randomizationCounts.get(randomizationTier) ?? 0) + 1);

    const blinding = assessBlinding(signals);
    const blindingTier = riskTier(blinding.value, blinding.confidence, [
      "Double-blind",
      "Triple-blind",
      "Quadruple-blind",
    ]);
    blindingCounts.set(blindingTier, (blindingCounts.get(blindingTier) ?? 0) + 1);

    const comparator = assessComparator(signals);
    const comparatorTier = riskTier(comparator.value, comparator.confidence, [
      "Placebo-controlled",
      "Active-comparator controlled",
      "Sham-controlled",
    ]);
    comparatorCounts.set(comparatorTier, (comparatorCounts.get(comparatorTier) ?? 0) + 1);
  }

  const toBreakdown = (counts: Map<string, number>) =>
    buildBreakdown(
      new Map(Array.from(counts.entries()).filter(([label]) => label !== "Not clearly stated")),
      counts.get("Not clearly stated") ?? 0,
      studies.length
    );

  return {
    randomization: toBreakdown(randomizationCounts),
    blinding: toBreakdown(blindingCounts),
    comparator: toBreakdown(comparatorCounts),
  };
}

// ---------------------------------------------------------------------------
// 10. Timeline
// ---------------------------------------------------------------------------

export function calculateTimeline(studies: TrialSummary[]): TimelineData {
  const counts = new Map<number, number>();
  let notStated = 0;

  for (const study of studies) {
    const year = study.startDate ? Number(study.startDate.slice(0, 4)) : NaN;
    if (!year || Number.isNaN(year)) {
      notStated += 1;
      continue;
    }
    counts.set(year, (counts.get(year) ?? 0) + 1);
  }

  const points = Array.from(counts.entries())
    .map(([year, count]) => ({ year, count }))
    .sort((a, b) => a.year - b.year);

  return { points, notStatedCount: notStated };
}

// ---------------------------------------------------------------------------
// Top-level composition
// ---------------------------------------------------------------------------

export function aggregateSearchResults(
  studies: TrialSummary[],
  meta: { totalMatching: number; cap: number; isCapped: boolean; excludeTerm?: string }
): SummaryData {
  return {
    overview: calculateOverviewStats(studies, { totalMatching: meta.totalMatching, cappedAt: meta.cap }),
    phaseDistribution: calculatePhaseDistribution(studies),
    designBreakdown: calculateDesignBreakdown(studies),
    biasLandscape: calculateBiasLandscape(studies),
    topInterventions: calculateTopInterventions(studies, meta.excludeTerm),
    topConditions: calculateTopConditions(studies),
    enrollment: calculateEnrollmentDistribution(studies),
    sponsors: calculateSponsorBreakdown(studies),
    geography: calculateGeographicSpread(studies),
    timeline: calculateTimeline(studies),
    isSmallSample: meta.totalMatching < 10,
    isCapped: meta.isCapped,
  };
}
