import { Shimmer } from "@/components/results/TrialCardSkeleton";

/** Shape-matched loading state for the compact "at a glance" summary card — mirrors the final
 *  layout (stat row, phase bar, bias line, expand action) so the page doesn't visually jump
 *  once the real data renders. Shown while the full result set (up to 300 trials, possibly
 *  several paginated API calls) is being fetched and aggregated. Intentionally does NOT mimic
 *  the expanded detail view, since that never renders before the user asks for it. */
export function SummarySkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-3">
        <div>
          <Shimmer className="h-7 w-16" />
          <Shimmer className="mt-2 h-3 w-24" />
        </div>
        <div>
          <Shimmer className="h-7 w-20" />
          <Shimmer className="mt-2 h-3 w-28" />
        </div>
        <Shimmer className="h-4 w-48" />
      </div>

      <div className="mt-5">
        <Shimmer className="mb-1.5 h-3 w-28" />
        <Shimmer className="h-2.5 w-full rounded-full" />
      </div>

      <Shimmer className="mt-4 h-4 w-2/3" />
      <Shimmer className="mt-5 h-4 w-40" />
    </div>
  );
}
