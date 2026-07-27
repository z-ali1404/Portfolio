import type { TimelineData } from "@/types/summary";
import { CompletenessNote, SummaryCard } from "@/components/summary/charts";

export function TimelineChart({ timeline, totalConsidered }: { timeline: TimelineData; totalConsidered: number }) {
  const maxCount = Math.max(...timeline.points.map((p) => p.count), 1);
  const notStatedPercent = totalConsidered > 0 ? Math.round((timeline.notStatedCount / totalConsidered) * 1000) / 10 : 0;

  return (
    <SummaryCard title="Timeline" subtitle="Trials by start year">
      {timeline.points.length === 0 ? (
        <p className="text-sm text-slate-400 dark:text-slate-500">No start-date data available for this result set.</p>
      ) : (
        <div className="flex h-24 items-end gap-1 overflow-x-auto pb-1">
          {timeline.points.map((p) => (
            <div key={p.year} className="flex min-w-[28px] flex-1 flex-col items-center gap-1">
              <div className="flex h-16 w-full items-end">
                <div
                  className="w-full rounded-t bg-accent-500"
                  style={{ height: `${Math.max(4, (p.count / maxCount) * 100)}%` }}
                  title={`${p.year}: ${p.count} trial${p.count === 1 ? "" : "s"}`}
                />
              </div>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">{p.year}</p>
            </div>
          ))}
        </div>
      )}
      <CompletenessNote percent={notStatedPercent} label="start date not reported" />
    </SummaryCard>
  );
}
