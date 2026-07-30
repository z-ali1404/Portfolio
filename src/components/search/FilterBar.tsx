import type { TrialFilters } from "@/hooks/useTrialSearch";
import type { SortOption } from "@/types/clinicalTrials";
import { useRole } from "@/context/RoleContext";

interface FilterBarProps {
  filters: TrialFilters;
  onUpdate: (partial: Partial<TrialFilters>) => void;
  onClear: () => void;
  activeFilterCount: number;
}

const STATUS_OPTIONS = [
  { value: "RECRUITING", label: "Recruiting" },
  { value: "NOT_YET_RECRUITING", label: "Not yet recruiting" },
  { value: "ENROLLING_BY_INVITATION", label: "Enrolling by invitation" },
  { value: "ACTIVE_NOT_RECRUITING", label: "Active, not recruiting" },
  { value: "COMPLETED", label: "Completed" },
  { value: "TERMINATED", label: "Terminated" },
  { value: "WITHDRAWN", label: "Withdrawn" },
  { value: "SUSPENDED", label: "Suspended" },
];

const PHASE_OPTIONS = [
  { value: "EARLY_PHASE1", label: "Early Phase 1" },
  { value: "PHASE1", label: "Phase 1" },
  { value: "PHASE2", label: "Phase 2" },
  { value: "PHASE3", label: "Phase 3" },
  { value: "PHASE4", label: "Phase 4" },
];

const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "LastUpdatePostDate:desc", label: "Recently updated" },
  { value: "EnrollmentCount:desc", label: "Largest enrollment" },
  { value: "StartDate:desc", label: "Most recently started" },
];

const SELECT_CLASSES =
  "rounded-md border border-slate-300 bg-white py-1.5 pl-2.5 pr-7 text-sm text-slate-700 focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200";

function toggleValue(list: string[], value: string): string[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

/** A suggested chip is "active" when every filter value it would apply is already set. */
function isSuggestionActive(filters: TrialFilters, suggestion: Partial<TrialFilters>): boolean {
  return Object.entries(suggestion).every(([key, value]) => {
    const current = filters[key as keyof TrialFilters];
    if (Array.isArray(value)) return Array.isArray(current) && value.every((v) => current.includes(v));
    return current === value;
  });
}

export function FilterBar({ filters, onUpdate, onClear, activeFilterCount }: FilterBarProps) {
  const { config } = useRole();

  return (
    <div className="space-y-2.5">
      {config.suggestedFilters.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
            Suggested for {config.label}:
          </span>
          {config.suggestedFilters.map((suggestion) => {
            const active = isSuggestionActive(filters, suggestion.filters);
            return (
              <button
                key={suggestion.label}
                type="button"
                onClick={() => onUpdate(suggestion.filters)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  active
                    ? "border-accent-300 bg-accent-50 text-accent-800 dark:border-accent-700 dark:bg-accent-500/10 dark:text-accent-300"
                    : "border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {suggestion.label}
              </button>
            );
          })}
          {config.suggestedFilterNote && (
            <span className="text-xs text-slate-400 dark:text-slate-500">· {config.suggestedFilterNote}</span>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
      <MultiSelect
        label="Status"
        options={STATUS_OPTIONS}
        selected={filters.statuses}
        onToggle={(value) => onUpdate({ statuses: toggleValue(filters.statuses, value) })}
      />
      <MultiSelect
        label="Phase"
        options={PHASE_OPTIONS}
        selected={filters.phases}
        onToggle={(value) => onUpdate({ phases: toggleValue(filters.phases, value) })}
      />

      <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        Study type
        <select
          value={filters.studyType}
          onChange={(e) => onUpdate({ studyType: e.target.value as TrialFilters["studyType"] })}
          className={SELECT_CLASSES}
        >
          <option value="">Any</option>
          <option value="INTERVENTIONAL">Interventional</option>
          <option value="OBSERVATIONAL">Observational</option>
        </select>
      </label>

      <label className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
        Sort by
        <select
          value={filters.sort}
          onChange={(e) => onUpdate({ sort: e.target.value as SortOption })}
          className={SELECT_CLASSES}
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>

      {activeFilterCount > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="ml-auto text-sm font-medium text-slate-500 underline decoration-slate-300 underline-offset-2 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
        >
          Clear filters
        </button>
      )}
      </div>
    </div>
  );
}

function MultiSelect({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <details className="relative">
      <summary
        className={`cursor-pointer list-none rounded-md border px-3 py-1.5 text-sm font-medium ${
          selected.length > 0
            ? "border-accent-300 bg-accent-50 text-accent-800 dark:border-accent-700 dark:bg-accent-500/10 dark:text-accent-300"
            : "border-slate-300 text-slate-600 dark:border-slate-700 dark:text-slate-300"
        }`}
      >
        {label}
        {selected.length > 0 ? ` (${selected.length})` : ""}
      </summary>
      <div className="absolute z-20 mt-2 min-w-[220px] rounded-md border border-slate-200 bg-white p-2 shadow-card-hover dark:border-slate-700 dark:bg-slate-900">
        {options.map((opt) => (
          <label
            key={opt.value}
            className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <input
              type="checkbox"
              checked={selected.includes(opt.value)}
              onChange={() => onToggle(opt.value)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-accent-600 focus:ring-accent-500"
            />
            {opt.label}
          </label>
        ))}
      </div>
    </details>
  );
}
