import { useState } from "react";
import type { TrialDetail, TrialSummary } from "@/types/clinicalTrials";
import { getStudyByNctId, ClinicalTrialsApiError } from "@/api/clinicalTrialsApi";
import { parseStudyDetail } from "@/lib/parseStudy";
import { formatDate, formatEnrollment, formatPhases, formatStatus, formatStudyType, truncate } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";
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

export function TrialCard({ summary }: { summary: TrialSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<TrialDetail | undefined>(undefined);
  const [detailState, setDetailState] = useState<DetailFetchState>("idle");
  const [detailError, setDetailError] = useState<string | undefined>(undefined);

  const status = formatStatus(summary.overallStatus);

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
          <Badge tone={status.tone}>{status.label}</Badge>
          <Badge tone="neutral">{formatPhases(summary.phases)}</Badge>
          <Badge tone="neutral">{formatStudyType(summary.studyType)}</Badge>
          {summary.hasResults && <Badge tone="accent">Results posted</Badge>}
          {summary.matchLabel && (
            <Badge tone={(summary.matchScore ?? 0) >= 3 ? "accent" : "neutral"}>{summary.matchLabel}</Badge>
          )}
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
          {summary.leadSponsor && <span>{summary.leadSponsor}</span>}
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
