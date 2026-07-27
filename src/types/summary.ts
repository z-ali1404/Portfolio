/**
 * Domain types for the Summary View — the aggregated, whole-result-set
 * overview that sits above the individual trial cards. Every "count"-style
 * result also tracks how many trials had no usable value for that field, so
 * the UI can be explicit about data completeness rather than silently
 * dropping unknowns.
 */

export interface CountBucket {
  label: string;
  count: number;
  percent: number;
  /** Raw registry enum value (e.g. "RECRUITING", "PHASE2") backing this bucket, when it maps to a filter. */
  code?: string;
}

/** A bucketed breakdown plus how many trials had no usable value for the field. */
export interface Breakdown {
  buckets: CountBucket[];
  notStatedCount: number;
  notStatedPercent: number;
  totalConsidered: number;
}

export interface OverviewStats {
  totalMatching: number;
  loadedForSummary: number;
  cappedAt?: number;
  totalEnrollment: number;
  enrollmentReportedCount: number;
  statusCounts: CountBucket[];
  earliestStartDate?: string;
  latestStartDate?: string;
  latestUpdateDate?: string;
}

export interface EnrollmentStats {
  distribution: Breakdown;
  median?: number;
  mean?: number;
  reportedCount: number;
}

export interface RankedItem {
  name: string;
  count: number;
  percent: number;
}

export interface SponsorBreakdown {
  topSponsors: RankedItem[];
  industryCount: number;
  academicOrGovCount: number;
  otherOrUnknownCount: number;
  industryPercent: number;
  academicOrGovPercent: number;
  otherOrUnknownPercent: number;
}

export interface GeographicSpread {
  topCountries: RankedItem[];
  notReportedCount: number;
  notReportedPercent: number;
}

export interface TimelinePoint {
  year: number;
  count: number;
}

export interface TimelineData {
  points: TimelinePoint[];
  notStatedCount: number;
}

export interface BiasLandscape {
  randomization: Breakdown;
  blinding: Breakdown;
  comparator: Breakdown;
}

export interface SummaryData {
  overview: OverviewStats;
  phaseDistribution: Breakdown;
  designBreakdown: {
    randomization: Breakdown;
    blinding: Breakdown;
    comparator: Breakdown;
  };
  biasLandscape: BiasLandscape;
  topInterventions: RankedItem[];
  topConditions: RankedItem[];
  enrollment: EnrollmentStats;
  sponsors: SponsorBreakdown;
  geography: GeographicSpread;
  timeline: TimelineData;
  /** True when the sample is small enough that percentages may be unstable. */
  isSmallSample: boolean;
  /** True when the result set was truncated at the fetch cap. */
  isCapped: boolean;
}
