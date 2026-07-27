import type { EnrollmentStats } from "@/types/summary";
import { CompletenessNote, SummaryCard } from "@/components/summary/charts";

/**
 * Bars use a fixed pixel-height track (BAR_TRACK_PX) with each bar's height
 * computed in pixels, not a CSS percentage of a shrink-to-fit flex parent.
 * The prior version sized bars as a percentage height inside a flex column
 * that also had to fit two lines of text below it — on some bucket
 * combinations the column's natural content height exceeded its container,
 * and the overflow spilled upward into the card's title. Fixed-pixel bars in
 * their own reserved track, with the title living in `SummaryCard`'s
 * separately-margined header block, makes that layout collision impossible.
 */
const BAR_TRACK_PX = 80;

/** A handful of very large trials can pull the mean far above the median — flag it rather than
 *  let the gap look like a bug. 1.5x is a conservative "meaningfully skewed" threshold. */
function isMeanSkewed(median?: number, mean?: number): boolean {
  return median !== undefined && mean !== undefined && median > 0 && mean > median * 1.5;
}

export function EnrollmentDistributionChart({ enrollment }: { enrollment: EnrollmentStats }) {
  const buckets = enrollment.distribution.buckets;
  const maxCount = Math.max(...buckets.map((b) => b.count), 1);

  return (
    <SummaryCard title="Sample size distribution">
      <div className="flex items-end gap-3">
        {buckets.map((b) => (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-1.5">
            <div
              className="flex w-full items-end justify-center"
              style={{ height: BAR_TRACK_PX }}
            >
              <div
                className="w-full rounded-t bg-accent-500"
                style={{ height: Math.max(4, Math.round((b.count / maxCount) * BAR_TRACK_PX)) }}
              />
            </div>
            <p className="whitespace-nowrap text-center text-xs text-slate-500 dark:text-slate-400">{b.label}</p>
            <p className="text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300">{b.count}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-6 border-t border-slate-100 pt-3 text-sm dark:border-slate-800">
        <div>
          <span className="font-semibold text-slate-900 dark:text-white">
            {enrollment.median !== undefined ? Math.round(enrollment.median).toLocaleString("en-US") : "—"}
          </span>{" "}
          <span className="text-xs text-slate-500 dark:text-slate-400">median enrollment</span>
        </div>
        <div>
          <span className="font-semibold text-slate-900 dark:text-white">
            {enrollment.mean !== undefined ? Math.round(enrollment.mean).toLocaleString("en-US") : "—"}
          </span>{" "}
          <span className="text-xs text-slate-500 dark:text-slate-400">mean enrollment</span>
        </div>
      </div>

      {isMeanSkewed(enrollment.median, enrollment.mean) && (
        <p className="mt-3 text-xs italic text-slate-400 dark:text-slate-500">
          Mean is skewed by a small number of very large trials — median is a more typical value.
        </p>
      )}

      <CompletenessNote percent={enrollment.distribution.notStatedPercent} label="enrollment not reported" />
    </SummaryCard>
  );
}
