import { useState, type ReactNode } from "react";
import type { TrialDetail, TrialSummary } from "@/types/clinicalTrials";
import { getStudyByNctId, ClinicalTrialsApiError } from "@/api/clinicalTrialsApi";
import { parseStudyDetail } from "@/lib/parseStudy";
import { formatDate, formatEnrollment, formatPhases, formatStatus, formatStudyType, truncate } from "@/lib/formatters";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { useRole } from "@/context/RoleContext";
import type { BadgeKey } from "@/config/roleConfig";
import { DetailSection } from "@/components/detail/DetailSection";
import { EvidenceReviewPanel } from "@/components/detail/EvidenceReviewPanel";
import {
  ArmsSection,
  BackgroundSection,
  DesignSection,
  EligibilitySection,
  EnrollmentSection,
  LocationsSection,
  OutcomesSection,
  SponsorSection,
  TimelineSection,
} from "@/components/detail/TrialDetailSections";

type DetailFetchState = "idle" | "loading" | "error";

/** Builds the badge list for a card in whatever order the active role's config prefers — the
 *  same five badges always render (nothing is hidden per role), only their order changes, so this
 *  stays a pure reordering rather than a per-role fork of the card's markup. */
function buildBadges(
  summary: TrialSummary,
  status: { label: string; tone: BadgeTone },
  order: BadgeKey[]
): { key: BadgeKey; node: ReactNode }[] {
  const byKey: Partial<Record<BadgeKey, ReactNode>> = {
    status: <Badge tone={status.tone}>{status.label}</Badge>,
    phase: <Badge tone="neutral">{formatPhases(summary.phases)}</Badge>,
    studyType: <Badge tone="neutral">{formatStudyType(summary.studyType)}</Badge>,
    results: summary.hasResults ? <Badge tone="accent">Results posted</Badge> : undefined,
    match: summary.matchLabel ? (
      <Badge tone={(summary.matchScore ?? 0) >= 3 ? "accent" : "neutral"}>{summary.matchLabel}</Badge>
    ) : undefined,
  };

  return order.filter((key) => byKey[key] !== undefined).map((key) => ({ key, node: byKey[key] }));
}

export function TrialCard({ summary }: { summary: TrialSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<TrialDetail | undefined>(undefined);
  const [detailState, setDetailState] = useState<DetailFetchState>("idle");
  const [detailError, setDetailError] = useState<string | undefined>(undefined);
  const { config: roleConfig } = useRole();

  const status = formatStatus(summary.overallStatus);
  const badges = buildBadges(summary, status, roleConfig.cardBadgeOrder);

  async function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next && !detail && detailState !== "loading") {
      setDetailState("loading");
      try {
        const raw = await getStudyByNctId(summary.nctId);
        setDetail(parseStudyDetail(raw));
        setDetailState("idle");
      } catch (err) {
        setDetailState("error");
        setDetailError(
          err instanceof ClinicalTrialsApiError ? err.message : "Could not load full study details."
        );
      }
    }
  }

  return (
    <article className="rounded-xl border border-slate-200 bg-white shadow-card transition hover:shadow-card-hover dark:border-slate-800 dark:bg-slate-900">
      <div className="p-5">
        <div className="flex flex-wrap items-center gap-1.5">
          {badges.map(({ key, node }) => (
            <span key={key}>{node}</span>
          ))}
        </div>

        <h2 className="mt-2.5 text-base font-semibold leading-snug text-slate-900 dark:text-white">
          {summary.briefTitle}
        </h2>

        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400 dark:text-slate-500">
          <a
            href={`https://clinicaltrials.gov/study/${summary.nctId}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-accent-700 hover:underline dark:text-accent-400"
          >
            {summary.nctId}
          </a>
          {summary.leadSponsor && (
            <span className={roleConfig.emphasizeSponsorOnCard ? "font-medium text-slate-600 dark:text-slate-300" : ""}>
              {summary.leadSponsor}
            </span>
          )}
          {summary.lastUpdatePostDate && <span>Updated {formatDate(summary.lastUpdatePostDate)}</span>}
        </div>

        {summary.conditions.length > 0 && (
          <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
            <span className="font-medium text-slate-500 dark:text-slate-400">Conditions: </span>
            {summary.conditions.slice(0, 2).join(", ")}
            {summary.conditions.length > 2 && ` +${summary.conditions.length - 2} more`}
          </p>
        )}

        <button
          type="button"
          onClick={handleToggle}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          <svg
            viewBox="0 0 20 20"
            fill="currentColor"
            className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.1l3.71-3.87a.75.75 0 1 1 1.08 1.04l-4.25 4.43a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
          </svg>
          {expanded ? "Hide details" : "Inspect methodology & evidence"}
        </button>
      </div>

      {expanded && (
        <div className="border-t border-slate-100 px-5 dark:border-slate-800">
          {detailState === "loading" && (
            <div className="py-6 text-sm text-slate-400 dark:text-slate-500">Loading full study record…</div>
          )}
          {detailState === "error" && (
            <div className="py-6 text-sm text-rose-600 dark:text-rose-400">{detailError}</div>
          )}
          {detail && detailState === "idle" && (
            <div>
              <div className="py-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{formatEnrollment(summary.enrollmentCount)}</span>
              </div>
              {summary.briefSummary && (
                <p className="pb-4 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                  {truncate(summary.briefSummary, 260)}
                </p>
              )}
              <DetailSection title="Evidence Review" defaultOpen>
                <EvidenceReviewPanel detail={detail} />
              </DetailSection>
              <DetailSection title="Background & Brief Summary">
                <BackgroundSection detail={detail} />
              </DetailSection>
              <DetailSection title="Study Design & Methodology">
                <DesignSection detail={detail} />
              </DetailSection>
              <DetailSection title="Enrollment / Sample Size">
                <EnrollmentSection detail={detail} />
              </DetailSection>
              <DetailSection title="Primary & Secondary Outcomes">
                <OutcomesSection detail={detail} />
              </DetailSection>
              <DetailSection title="Eligibility Criteria">
                <EligibilitySection detail={detail} />
              </DetailSection>
              <DetailSection title="Arms & Interventions">
                <ArmsSection detail={detail} />
              </DetailSection>
              <DetailSection title="Status & Timeline">
                <TimelineSection detail={detail} />
              </DetailSection>
              <DetailSection title="Sponsor & Collaborators">
                <SponsorSection detail={detail} />
              </DetailSection>
              <DetailSection title="Locations">
                <LocationsSection detail={detail} />
              </DetailSection>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
