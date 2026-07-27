import type { SponsorBreakdown } from "@/types/summary";
import { BarRow, MiniDonut, ShowMoreList, SummaryCard } from "@/components/summary/charts";

interface SponsorBreakdownSectionProps {
  sponsors: SponsorBreakdown;
  onSelectSponsor: (name: string) => void;
}

/**
 * Distinct hues per sponsor category, shared by the donut strokes and the
 * legend dots below so the two stay visually consistent: primary teal
 * (industry) vs. blue (academic/government) vs. neutral grey (other/unknown)
 * — three genuinely different colors rather than three shades of one hue,
 * so segments read apart at a glance without relying on the legend text.
 * Checked in both themes: blue-500/grey-400 against white, and
 * blue-400/grey-400 against slate-900 both hold clear separation from the
 * accent teal and from each other.
 */
const SPONSOR_COLORS = {
  industry: { stroke: "stroke-accent-500", dot: "bg-accent-500" },
  academicOrGov: { stroke: "stroke-blue-500 dark:stroke-blue-400", dot: "bg-blue-500 dark:bg-blue-400" },
  other: { stroke: "stroke-slate-400 dark:stroke-slate-500", dot: "bg-slate-400 dark:bg-slate-500" },
};

export function SponsorBreakdownSection({ sponsors, onSelectSponsor }: SponsorBreakdownSectionProps) {
  const maxPercent = Math.max(...sponsors.topSponsors.map((s) => s.percent), 1);

  return (
    <SummaryCard title="Sponsors" subtitle="Click a sponsor to filter the trial list below">
      <div className="flex items-center gap-4">
        <MiniDonut
          segments={[
            { label: "Industry", value: sponsors.industryCount, colorClass: SPONSOR_COLORS.industry.stroke },
            { label: "Academic/Gov", value: sponsors.academicOrGovCount, colorClass: SPONSOR_COLORS.academicOrGov.stroke },
            { label: "Other/Unknown", value: sponsors.otherOrUnknownCount, colorClass: SPONSOR_COLORS.other.stroke },
          ]}
        />
        <div className="space-y-1 text-xs">
          <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className={`h-2 w-2 rounded-full ${SPONSOR_COLORS.industry.dot}`} /> Industry-sponsored (
            {sponsors.industryPercent}%)
          </p>
          <p className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <span className={`h-2 w-2 rounded-full ${SPONSOR_COLORS.academicOrGov.dot}`} /> Academic/government (
            {sponsors.academicOrGovPercent}%)
          </p>
          <p className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
            <span className={`h-2 w-2 rounded-full ${SPONSOR_COLORS.other.dot}`} /> Other/unknown (
            {sponsors.otherOrUnknownPercent}%)
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <ShowMoreList
          items={sponsors.topSponsors}
          emptyMessage="No sponsor data available."
          renderItem={(s, i) => (
            <BarRow
              key={s.name}
              label={s.name}
              count={s.count}
              percent={s.percent}
              maxPercent={maxPercent}
              emphasize={i === 0}
              onClick={() => onSelectSponsor(s.name)}
            />
          )}
        />
      </div>
    </SummaryCard>
  );
}
