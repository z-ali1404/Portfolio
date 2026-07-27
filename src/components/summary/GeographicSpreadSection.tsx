import type { GeographicSpread } from "@/types/summary";
import { BarRow, CompletenessNote, ShowMoreList, SummaryCard } from "@/components/summary/charts";

export function GeographicSpreadSection({ geography }: { geography: GeographicSpread }) {
  const topCountry = geography.topCountries[0];
  const maxPercent = Math.max(...geography.topCountries.map((c) => c.percent), 1);

  return (
    <SummaryCard title="Geographic spread" subtitle="Trial sites by country">
      <ShowMoreList
        items={geography.topCountries}
        emptyMessage="No location data available for this result set."
        renderItem={(c, i) => (
          <BarRow key={c.name} label={c.name} count={c.count} percent={c.percent} maxPercent={maxPercent} emphasize={i === 0} />
        )}
      />
      {topCountry && (
        <p className="mt-3 text-xs italic text-slate-400 dark:text-slate-500">
          Bars are scaled relative to the top country ({topCountry.name}, {topCountry.percent}%), not to 100% of all
          trials — this keeps smaller countries readable rather than flattening them to near-zero width.
        </p>
      )}
      <CompletenessNote percent={geography.notReportedPercent} label="no location data" />
    </SummaryCard>
  );
}
