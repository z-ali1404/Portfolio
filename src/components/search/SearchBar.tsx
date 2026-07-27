import { useState, type FormEvent } from "react";
import type { TrialFilters } from "@/hooks/useTrialSearch";
import { AdvancedSearch } from "@/components/search/AdvancedSearch";

const NCT_ID_PATTERN = /^NCT\d{8}$/i;

interface SearchBarProps {
  filters: TrialFilters;
  onUpdate: (partial: Partial<TrialFilters>) => void;
}

/**
 * One "intelligent" search box: it recognizes an NCT ID (e.g. NCT04280705)
 * and automatically routes the query to the exact-match `query.id` param
 * instead of free-text `query.term`, rather than making the user pick a
 * search mode up front.
 */
export function SearchBar({ filters, onUpdate }: SearchBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const rawValue = filters.nctId || filters.term;

  function handleChange(value: string) {
    const trimmed = value.trim();
    if (NCT_ID_PATTERN.test(trimmed)) {
      onUpdate({ nctId: trimmed.toUpperCase(), term: "" });
    } else {
      onUpdate({ nctId: "", term: value });
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <svg
          viewBox="0 0 20 20"
          fill="none"
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
        >
          <path
            d="m17.5 17.5-3.6-3.6m1.933-4.4a6.333 6.333 0 1 1-12.666 0 6.333 6.333 0 0 1 12.666 0Z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
        <input
          type="text"
          value={rawValue}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search by condition, intervention, sponsor, keyword, or NCT ID"
          className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
        />
      </form>

      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-sm font-medium text-accent-700 hover:text-accent-800 dark:text-accent-400 dark:hover:text-accent-300"
      >
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-3.5 w-3.5 transition-transform ${advancedOpen ? "rotate-90" : ""}`}
        >
          <path d="M7.05 4.05a1 1 0 0 1 1.414 0l4.243 4.243a1 1 0 0 1 0 1.414L8.464 13.95a1 1 0 1 1-1.414-1.414L10.586 9 7.05 5.464a1 1 0 0 1 0-1.414Z" />
        </svg>
        Advanced search
      </button>

      {advancedOpen && <AdvancedSearch filters={filters} onUpdate={onUpdate} />}
    </div>
  );
}
