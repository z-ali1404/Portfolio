import type { RankedItem } from "@/types/summary";
import { BarRow, ShowMoreList, SummaryCard } from "@/components/summary/charts";

function RankedList({
  title,
  items,
  emptyMessage,
  onSelect,
}: {
  title: string;
  items: RankedItem[];
  emptyMessage: string;
  onSelect?: (name: string) => void;
}) {
  const maxPercent = Math.max(...items.map((i) => i.percent), 1);
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
      <div className="mt-2">
        <ShowMoreList
          items={items}
          emptyMessage={emptyMessage}
          renderItem={(item, i) => (
            <BarRow
              key={item.name}
              label={item.name}
              count={item.count}
              percent={item.percent}
              maxPercent={maxPercent}
              emphasize={i === 0}
              onClick={onSelect ? () => onSelect(item.name) : undefined}
            />
          )}
        />
      </div>
    </div>
  );
}

interface ComparatorsAndConditionsProps {
  topInterventions: RankedItem[];
  topConditions: RankedItem[];
  onSelectIntervention: (name: string) => void;
  onSelectCondition: (name: string) => void;
}

export function ComparatorsAndConditions({
  topInterventions,
  topConditions,
  onSelectIntervention,
  onSelectCondition,
}: ComparatorsAndConditionsProps) {
  return (
    <SummaryCard title="Most common comparators & conditions" subtitle="Click a name to narrow the search to it">
      <div className="grid gap-6 sm:grid-cols-2">
        <RankedList
          title="Interventions studied alongside/against"
          items={topInterventions}
          emptyMessage="No other interventions found across this result set."
          onSelect={onSelectIntervention}
        />
        <RankedList
          title="Conditions studied"
          items={topConditions}
          emptyMessage="No condition data available."
          onSelect={onSelectCondition}
        />
      </div>
    </SummaryCard>
  );
}
