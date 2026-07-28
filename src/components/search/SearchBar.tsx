import { useState, type FormEvent } from "react";
import type { TrialFilters } from "@/hooks/useTrialSearch";
import { AdvancedSearch } from "@/components/search/AdvancedSearch";
import { classifyFreeText } from "@/lib/queryClassifier";
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
 * the exact-match `query.id` param. Otherwise, in "auto" mode it tokenizes
 * the input and classifies each token against the same structured fields
 * Advanced Search exposes — so "paracetamol headache" becomes
 * Intervention=paracetamol AND Condition=headache in one search, not a
 * single flat full-text scan. See `lib/queryClassifier.ts` for why this is
 * a rule-based classifier rather than a fuzzy-search library: this app's
 * data source is the live, paginated ClinicalTrials.gov registry, not a
 * local corpus, so a library like Fuse.js could only re-rank whatever page
 * was already fetched — it can't route the query to the server's own
 * Condition/Intervention fields the way a classifier can. The mode
 * dropdown still lets the user force everything into one specific field.
 */
export function SearchBar({ filters, onUpdate }: SearchBarProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  // True when auto-detect couldn't match any word in a multi-word query against its
  // dictionaries at all, so the search fell back to plain full-text rather than a precise
  // Condition/Intervention split — surfaced as a hint rather than silently returning a lower-
  // precision result the user has no way of noticing.
  const [unrecognizedQuery, setUnrecognizedQuery] = useState(false);
  // `query` is the literal text as typed — used for the input's displayed value, since auto
  // mode can now populate condition/intervention/term simultaneously from one query and any
  // single one of them is no longer guaranteed to hold the full original string. Falls back to
  // the individual fields for the case where Advanced Search was used directly, without typing
  // in this box first.
  const rawValue = filters.nctId || filters.query || filters.intervention || filters.condition || filters.term;

  function routeValue(value: string, mode: SearchMode) {
    const trimmed = value.trim();
    if (NCT_ID_PATTERN.test(trimmed)) {
      onUpdate({ nctId: trimmed.toUpperCase(), query: "", term: "", condition: "", intervention: "" });
      setUnrecognizedQuery(false);
      return;
    }

    if (mode === "auto") {
      const classified = classifyFreeText(trimmed);
      onUpdate({
        nctId: "",
        query: value,
        term: classified.term,
        condition: classified.condition,
        intervention: classified.intervention,
      });
      // Nothing was recognized as a specific drug or condition at all — only flag this for
      // multi-word queries, since a single unrecognized keyword is plausibly an intentional
      // general search rather than a missed drug+condition pair.
      const wordCount = trimmed.split(/\s+/).filter(Boolean).length;
      setUnrecognizedQuery(!classified.condition && !classified.intervention && wordCount >= 2);
      return;
    }

    setUnrecognizedQuery(false);
    onUpdate({
      nctId: "",
      query: value,
      term: mode === "term" ? value : "",
      condition: mode === "condition" ? value : "",
      intervention: mode === "intervention" ? value : "",
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

      {unrecognizedQuery && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Didn't recognize this as a specific drug or condition — results use a general keyword
          search instead.{" "}
          <button
            type="button"
            onClick={() => setAdvancedOpen(true)}
            className="font-medium text-accent-700 hover:underline dark:text-accent-400"
          >
            Try Advanced search
          </button>{" "}
          for precise field control.
        </p>
      )}

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
