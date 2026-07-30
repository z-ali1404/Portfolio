import type { RoleId } from "@/types/roles";
import type { SortOption } from "@/types/clinicalTrials";
import type { TrialFilters } from "@/hooks/useTrialSearch";
import type { SummaryData } from "@/types/summary";

/**
 * Role-based view-layer configuration. This is the single source of truth
 * for how the dashboard's emphasis changes per role — sort default, which
 * filters are suggested, badge/metadata order on trial cards, which
 * Summary View tab opens first, the compact summary's headline sentence,
 * and role-specific microcopy. Every consuming component derives its
 * rendering from this config rather than switching on a role string
 * itself, so adding a new role later (e.g. "patient", "commissioner")
 * means adding one entry here — no component changes required as long as
 * it fits the same shape.
 *
 * Important: nothing here changes what data exists or fabricates new
 * facts — every field is either a UI ordering/label choice or a sentence
 * built from aggregates `summaryAggregation.ts` already computed. Role
 * switching changes emphasis, not truth.
 */

export type BadgeKey = "status" | "phase" | "studyType" | "results" | "match";
export type SummaryTab = "Design & Quality" | "Landscape" | "Scale & Timeline" | "Geography";

export interface SuggestedFilter {
  label: string;
  filters: Partial<TrialFilters>;
}

export interface RoleConfig {
  id: RoleId;
  label: string;
  /** Short microcopy shown directly under the role selector. */
  description: string;
  /** Slightly longer explainer for the "Why this view?" tooltip. */
  tooltip: string;
  defaultSort: SortOption;
  /** Quick-toggle chips backed by real filter fields — never a fake/nonfunctional filter. */
  suggestedFilters: SuggestedFilter[];
  /** A field this role cares about that has no dedicated filter control yet (e.g. sponsor name),
   *  surfaced honestly as a tip rather than a filter that doesn't really exist. */
  suggestedFilterNote?: string;
  /** Order the existing status/phase/studyType/results/match badges render on a trial card. */
  cardBadgeOrder: BadgeKey[];
  /** Whether the sponsor name in a card's metadata line is visually emphasized. */
  emphasizeSponsorOnCard: boolean;
  /** Order of the Summary View's existing 4 tabs; index 0 opens by default. */
  summaryTabOrder: SummaryTab[];
  /** One-line "what should I take away from this result set" sentence for the compact summary
   *  card, built purely from already-computed aggregates. */
  summaryHeadline: (data: SummaryData) => string;
  /** Extra line appended to the "no query yet" empty state. */
  emptyStateHint?: string;
}

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 1000) / 10 : 0;
}

const RECRUITING_CODES = new Set(["RECRUITING", "NOT_YET_RECRUITING", "ENROLLING_BY_INVITATION"]);

function recruitingCount(data: SummaryData): number {
  return data.overview.statusCounts
    .filter((s) => s.code && RECRUITING_CODES.has(s.code))
    .reduce((sum, s) => sum + s.count, 0);
}

function biasHeadline(data: SummaryData): string {
  const lowRisk = data.biasLandscape.randomization.buckets.find((b) => b.label === "Low risk");
  if (!lowRisk || data.biasLandscape.randomization.totalConsidered === 0) {
    return "Bias/quality signals are not clearly reported across this result set.";
  }
  return `${lowRisk.percent}% of trials show low risk of bias in randomization.`;
}

export const ROLE_CONFIG: Record<RoleId, RoleConfig> = {
  general: {
    id: "general",
    label: "General",
    description: "A neutral view with no particular emphasis — good for a first look.",
    tooltip: "Shows the standard dashboard with no role-specific reordering or emphasis applied.",
    defaultSort: "relevance",
    suggestedFilters: [],
    cardBadgeOrder: ["status", "phase", "studyType", "results", "match"],
    emphasizeSponsorOnCard: false,
    summaryTabOrder: ["Design & Quality", "Landscape", "Scale & Timeline", "Geography"],
    summaryHeadline: biasHeadline,
  },

  clinician: {
    id: "clinician",
    label: "Clinician",
    description: "Prioritises intervention relevance, recruitment status, and practical trial signals.",
    tooltip:
      "Surfaces whether trials are recruiting, what's being studied and in whom, and whether results are posted — the questions that matter most when weighing relevance to a patient population.",
    defaultSort: "relevance",
    suggestedFilters: [
      { label: "Recruiting", filters: { statuses: ["RECRUITING"] } },
      { label: "Phase 3", filters: { phases: ["PHASE3"] } },
    ],
    suggestedFilterNote: "Looking for a specific age group? Check each trial's Eligibility Criteria section.",
    cardBadgeOrder: ["status", "phase", "studyType", "results", "match"],
    emphasizeSponsorOnCard: false,
    summaryTabOrder: ["Design & Quality", "Scale & Timeline", "Landscape", "Geography"],
    summaryHeadline: (data) => {
      const recruiting = recruitingCount(data);
      return `${recruiting} of ${data.overview.loadedForSummary} trials are currently recruiting or enrolling — ${biasHeadline(data).toLowerCase()}`;
    },
    emptyStateHint:
      "Try a condition + intervention pair, e.g. \"atrial fibrillation apixaban\", to see clinical relevance at a glance.",
  },

  evidenceReviewer: {
    id: "evidenceReviewer",
    label: "Evidence Reviewer",
    description: "Prioritises comparability, methodology, and design quality indicators.",
    tooltip:
      "Leads with randomization, blinding, comparator structure, and the aggregated bias landscape — the signals that determine whether a set of trials is suitable to compare or synthesise.",
    defaultSort: "relevance",
    suggestedFilters: [
      { label: "Interventional only", filters: { studyType: "INTERVENTIONAL" } },
      { label: "Phase 3", filters: { phases: ["PHASE3"] } },
    ],
    suggestedFilterNote: "Want only trials with posted results? Check each card's \"Results posted\" badge.",
    cardBadgeOrder: ["studyType", "phase", "status", "results", "match"],
    emphasizeSponsorOnCard: false,
    summaryTabOrder: ["Design & Quality", "Landscape", "Scale & Timeline", "Geography"],
    summaryHeadline: (data) => {
      const designs = data.designBreakdown.comparator.buckets.length;
      return `${biasHeadline(data)} ${designs} distinct comparator structure${designs === 1 ? "" : "s"} across this result set — see Design & Quality for the full design mix.`;
    },
    emptyStateHint:
      "Once results load, check Design & Quality for randomization, blinding, and comparator mix across the whole set.",
  },

  hospitalTeam: {
    id: "hospitalTeam",
    label: "Hospital Team",
    description: "Prioritises recruiting studies, locations, sponsors, and operational relevance.",
    tooltip:
      "Leads with what's active right now and where, plus which sponsors are running it — built for identifying live studies and service-level relevance rather than academic methodology.",
    defaultSort: "LastUpdatePostDate:desc",
    suggestedFilters: [
      { label: "Recruiting", filters: { statuses: ["RECRUITING"] } },
      { label: "Not yet recruiting", filters: { statuses: ["NOT_YET_RECRUITING"] } },
    ],
    suggestedFilterNote: "Looking for a specific country? Check the Geography tab in the summary above.",
    cardBadgeOrder: ["status", "phase", "studyType", "results", "match"],
    emphasizeSponsorOnCard: true,
    summaryTabOrder: ["Geography", "Landscape", "Scale & Timeline", "Design & Quality"],
    summaryHeadline: (data) => {
      const recruiting = recruitingCount(data);
      const countryCount = data.geography.topCountries.length;
      return `${recruiting} of ${data.overview.loadedForSummary} trials are recruiting or enrolling now, across ${countryCount} countr${countryCount === 1 ? "y" : "ies"} with reported sites.`;
    },
    emptyStateHint: "Add a recruiting-status filter to see which studies are open for referral right now.",
  },

  pharma: {
    id: "pharma",
    label: "Pharma",
    description: "Prioritises sponsor activity, phase mix, and competitive landscape signals.",
    tooltip:
      "Leads with sponsor concentration, intervention clustering, and phase distribution — built for reading the competitive landscape in an indication rather than any single trial.",
    defaultSort: "relevance",
    suggestedFilters: [
      { label: "Phase 2", filters: { phases: ["PHASE2"] } },
      { label: "Phase 3", filters: { phases: ["PHASE3"] } },
    ],
    suggestedFilterNote: "Looking for a specific sponsor? Add it in Advanced Search, or click one in the Landscape tab.",
    cardBadgeOrder: ["phase", "status", "studyType", "results", "match"],
    emphasizeSponsorOnCard: true,
    summaryTabOrder: ["Landscape", "Design & Quality", "Scale & Timeline", "Geography"],
    summaryHeadline: (data) => {
      const topSponsor = data.sponsors.topSponsors[0];
      const phaseCount = data.phaseDistribution.buckets.length;
      if (!topSponsor) return `${phaseCount} phases represented across this result set — see Landscape for sponsor activity.`;
      return `${topSponsor.name} leads with ${topSponsor.count} trial${topSponsor.count === 1 ? "" : "s"} (${pct(topSponsor.count, data.overview.loadedForSummary)}%); ${phaseCount} phases represented.`;
    },
    emptyStateHint: "Check the Landscape tab for sponsor concentration and phase mix once results load.",
  },
};

export function getRoleConfig(role: RoleId): RoleConfig {
  return ROLE_CONFIG[role];
}
