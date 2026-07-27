import type { TrialFilters } from "@/hooks/useTrialSearch";

interface AdvancedSearchProps {
  filters: TrialFilters;
  onUpdate: (partial: Partial<TrialFilters>) => void;
}

const FIELD_CLASSES =
  "w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500";

export function AdvancedSearch({ filters, onUpdate }: AdvancedSearchProps) {
  return (
    <div className="grid animate-expand-in grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-900/40">
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        Condition
        <input
          type="text"
          value={filters.condition}
          onChange={(e) => onUpdate({ condition: e.target.value })}
          placeholder="e.g. Type 2 diabetes"
          className={FIELD_CLASSES}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        Intervention
        <input
          type="text"
          value={filters.intervention}
          onChange={(e) => onUpdate({ intervention: e.target.value })}
          placeholder="e.g. Semaglutide"
          className={FIELD_CLASSES}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        Sponsor
        <input
          type="text"
          value={filters.sponsor}
          onChange={(e) => onUpdate({ sponsor: e.target.value })}
          placeholder="e.g. Pfizer"
          className={FIELD_CLASSES}
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        NCT ID
        <input
          type="text"
          value={filters.nctId}
          onChange={(e) => onUpdate({ nctId: e.target.value.toUpperCase(), term: "" })}
          placeholder="e.g. NCT04280705"
          className={FIELD_CLASSES}
        />
      </label>
    </div>
  );
}
