import { useState, type FormEvent } from "react";
import type { TrialFilters } from "@/hooks/useTrialSearch";
import { AdvancedSearch } from "@/components/search/AdvancedSearch";
import { looksLikeDrugName } from "@/lib/searchModeHeuristic";
import type { SearchMode } from "@/types/clinicalTrials";

const NCT_ID_PATTERN = /^NCT\d{8}$/i;

interface SearchBarProps {
  filters: TrialFilters;
  onUpdate: (partial: Partial<TrialFilters>) => void;
}

const MODE_OPTIONS: { value: SearchMode; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: "intervention", label: "Drug / Intervention" },
  { value: "condition", label: "Condition" },
  { value: "term", label: "General keyword" },
];

const MODE_PLACEHOLDERS: Record<SearchMode, string> = {
  auto: "Search by condition, intervention, sponsor, keyword, or NCT ID",
  intervention: "Search by drug or intervention name, e.g. amitriptyline",
  condition: "Search by condition, e.g. Type 2 diabetes",
  term: "General keyword search across title, summary, and eligibility text",
};

/**
 * One search box, routed by field rather than always going to free-text
 * `query.term`. It recognizes an NCT ID (e.g. NCT04280705) and routes to
 * the exact-match `query.id` param. Otherwise, in "auto" mode it guesses
 * whether the input looks like a drug/intervention name (routes to
 * `query.intr`) or general text (routes to `query.term`); the mode dropdown
 * lets the user override that guess explicitly.
 */
export function SearchBar({ filters, onUpdate }: SearchBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const rawValue = filters.nctId || filters.intervention || filters.condition || filters.term;

  function routeValue(value: string, mode: SearchMode) {
    const trimmed = value.trim();
    if (NCT_ID_PATTERN.test(trimmed)) {
      onUpdate({ nctId: trimmed.toUpperCase(), term: "", condition: "", intervention: "" });
      return;
    }

    const effectiveMode = mode === "auto" ? (looksLikeDrugName(trimmed) ? "intervention" : "term") : mode;

    onUpdate({
      nctId: "",
      term: effectiveMode === "term" ? value : "",
      condition: effectiveMode === "condition" ? value : "",
      intervention: effectiveMode === "intervention" ? value : "",
    });
  }

  function handleChange(value: string) {
    routeValue(value, filters.mode);
  }

  function handleModeChange(mode: SearchMode) {
    onUpdate({ mode });
    if (rawValue) routeValue(rawValue, mode);
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
  }

  return (
    <div className="space-y-3">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <div className="relative flex-1">
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
            placeholder={MODE_PLACEHOLDERS[filters.mode]}
            className="w-full rounded-lg border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-500"
          />
        </div>
        <select
          value={filters.mode}
          onChange={(e) => handleModeChange(e.target.value as SearchMode)}
          aria-label="Search mode"
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm transition focus:border-accent-500 focus:outline-none focus:ring-2 focus:ring-accent-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
        >
          {MODE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
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
