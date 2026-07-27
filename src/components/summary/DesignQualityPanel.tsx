import type { BiasLandscape, Breakdown } from "@/types/summary";
import { BarRow, CompletenessNote, SummaryCard } from "@/components/summary/charts";

function MiniBreakdown({ title, breakdown }: { title: string; breakdown: Breakdown }) {
  const maxPercent = Math.max(...breakdown.buckets.map((b) => b.percent), 1);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <div className="mt-2 space-y-2.5">
        {breakdown.buckets.map((b, i) => (
          <BarRow key={b.label} label={b.label} count={b.count} percent={b.percent} maxPercent={maxPercent} emphasize={i === 0} />
        ))}
      </div>
      <CompletenessNote percent={breakdown.notStatedPercent} label={`${title.toLowerCase()} not reported`} />
    </div>
  );
}

interface DesignQualityPanelProps {
  designBreakdown: { randomization: Breakdown; blinding: Breakdown; comparator: Breakdown };
  biasLandscape: BiasLandscape;
}

/**
 * Groups study-design breakdown and bias/quality landscape together, per the
 * product spec: design quality is the single most differentiating section
 * of the whole Summary View, so it's placed directly under the overview
 * stats rather than mixed in with scale/geography stats further down.
 */
export function DesignQualityPanel({ designBreakdown, biasLandscape }: DesignQualityPanelProps) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <SummaryCard title="Study design breakdown" subtitle="Randomization, blinding, and comparator structure across all trials">
        <div className="space-y-5">
          <MiniBreakdown title="Randomization" breakdown={designBreakdown.randomization} />
          <MiniBreakdown title="Blinding" breakdown={designBreakdown.blinding} />
          <MiniBreakdown title="Comparator type" breakdown={designBreakdown.comparator} />
        </div>
      </SummaryCard>

      <SummaryCard
        title="Bias / quality landscape"
        subtitle="Same per-trial classification used in each card's Evidence Review panel, aggregated here"
      >
        <div className="space-y-5">
          <MiniBreakdown title="Randomization risk" breakdown={biasLandscape.randomization} />
          <MiniBreakdown title="Blinding risk" breakdown={biasLandscape.blinding} />
          <MiniBreakdown title="Comparator / confounding risk" breakdown={biasLandscape.comparator} />
        </div>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          Rule-based classification of registry fields, not a validated risk-of-bias instrument (e.g. Cochrane RoB2) —
          it does not assess any trial's actual execution quality.
        </p>
      </SummaryCard>
    </div>
  );
}
