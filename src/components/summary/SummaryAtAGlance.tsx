import type { SummaryData } from "@/types/summary";
import { Chevron, HoverPopover, InlineStackedBar } from "@/components/summary/charts";

interface SummaryAtAGlanceProps {
  data: SummaryData;
  expanded: boolean;
  onToggleExpanded: () => void;
  onSelectPhase: (phaseCode: string) => void;
}

const STATUS_CODE_GROUPS: Record<string, "recruiting" | "completed" | "terminated"> = {
  RECRUITING: "recruiting",
  NOT_YET_RECRUITING: "recruiting",
  ENROLLING_BY_INVITATION: "recruiting",
  COMPLETED: "completed",
  TERMINATED: "terminated",
};

function summarizeStatuses(statusCounts: SummaryData["overview"]["statusCounts"]) {
  let recruiting = 0;
  let completed = 0;
  let terminated = 0;
  let other = 0;
  const otherBreakdown: { label: string; count: number }[] = [];
  for (const bucket of statusCounts) {
    const group = bucket.code ? STATUS_CODE_GROUPS[bucket.code] : undefined;
    if (group === "recruiting") recruiting += bucket.count;
    else if (group === "completed") completed += bucket.count;
    else if (group === "terminated") terminated += bucket.count;
    else {
      other += bucket.count;
      otherBreakdown.push({ label: bucket.label, count: bucket.count });
    }
  }
  otherBreakdown.sort((a, b) => b.count - a.count);
  return { recruiting, completed, terminated, other, otherBreakdown };
}

function biasHeadline(data: SummaryData): string {
  const randomization = data.biasLandscape.randomization;
  const lowRisk = randomization.buckets.find((b) => b.label === "Low risk");
  if (!lowRisk || randomization.totalConsidered === 0) {
    return "Bias/quality signals not clearly reported across this result set.";
  }
  return `${lowRisk.percent}% of trials show low risk of bias in randomization.`;
}

/**
 * The compact, always-visible summary: 4-5 decision-relevant data points
 * only. Everything else (design breakdown, full bias landscape, sponsors,
 * geography, timeline, ranked lists) lives one click away — see
 * `ExpandedSummaryDetail`. This is deliberately the *only* thing rendered
 * before the user asks for more.
 */
export function SummaryAtAGlance({ data, expanded, onToggleExpanded, onSelectPhase }: SummaryAtAGlanceProps) {
  const { overview, phaseDistribution } = data;
  const statuses = summarizeStatuses(overview.statusCounts);

  const phaseSegments = [
    ...phaseDistribution.buckets.map((b) => ({ label: b.label, count: b.count, percent: b.percent, code: b.code })),
    ...(phaseDistribution.notStatedCount > 0
      ? [{ label: "Not reported", count: phaseDistribution.notStatedCount, percent: phaseDistribution.notStatedPercent }]
      : []),
  ];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <div>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">
            {overview.totalMatching.toLocaleString("en-US")}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Matching trials</p>
        </div>
        <div>
          <p className="text-2xl font-semibold text-slate-900 dark:text-white">
            {overview.enrollmentReportedCount > 0 ? `~${overview.totalEnrollment.toLocaleString("en-US")}` : "—"}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Combined enrollment</p>
        </div>
        <div className="text-sm text-slate-600 dark:text-slate-300">
          <span className="font-medium text-slate-900 dark:text-white">{statuses.recruiting}</span> recruiting ·{" "}
          <span className="font-medium text-slate-900 dark:text-white">{statuses.completed}</span> completed ·{" "}
          <span className="font-medium text-slate-900 dark:text-white">{statuses.terminated}</span> terminated
          {statuses.other > 0 && (
            <>
              {" "}
              · <span className="font-medium text-slate-900 dark:text-white">{statuses.other}</span>{" "}
              <HoverPopover trigger="other">
                <p className="mb-1.5 font-medium text-slate-700 dark:text-slate-200">Other statuses</p>
                <div className="space-y-1">
                  {statuses.otherBreakdown.map((b) => (
                    <div key={b.label} className="flex items-center justify-between gap-3 text-slate-600 dark:text-slate-300">
                      <span>{b.label}</span>
                      <span className="tabular-nums">{b.count}</span>
                    </div>
                  ))}
                </div>
              </HoverPopover>
            </>
          )}
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">Phase distribution</p>
        <InlineStackedBar segments={phaseSegments} onSelectSegment={onSelectPhase} />
      </div>

      <p className="mt-4 text-sm text-slate-700 dark:text-slate-300">{biasHeadline(data)}</p>

      <button
        type="button"
        onClick={onToggleExpanded}
        className="mt-5 flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
      >
        {expanded ? "Hide full evidence landscape" : "See full evidence landscape"}
        <Chevron open={expanded} />
      </button>
    </div>
  );
}
