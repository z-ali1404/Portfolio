import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClinicalTrialsApiError, searchStudies } from "@/api/clinicalTrialsApi";
import { parseStudySummary } from "@/lib/parseStudy";
import { debugLogInterventions, rerankByRelevance, type FieldTerms } from "@/lib/relevanceRanking";
import type { SearchMode, SortOption, TrialSearchParams, TrialSummary } from "@/types/clinicalTrials";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 450;

export type SearchStatus = "idle" | "loading" | "loading-more" | "success" | "error";

export interface TrialFilters {
  /** Literal text currently in the main search box, kept in sync regardless of how it gets
   *  classified into the fields below — this is what the input displays, since `term`/
   *  `condition`/`intervention` can now all be populated simultaneously from one query. */
  query: string;
  term: string;
  condition: string;
  intervention: string;
  sponsor: string;
  nctId: string;
  statuses: string[];
  phases: string[];
  studyType: "" | "INTERVENTIONAL" | "OBSERVATIONAL";
  sort: SortOption;
  /** Which field the main search bar is currently routing free text into. */
  mode: SearchMode;
}

const EMPTY_FILTERS: TrialFilters = {
  query: "",
  term: "",
  condition: "",
  intervention: "",
  sponsor: "",
  nctId: "",
  statuses: [],
  phases: [],
  studyType: "",
  sort: "relevance",
  mode: "auto",
};

/** The fields the client-side relevance re-ranker should score results against — the same
 *  three structured fields Advanced Search exposes, so a normal-search query that got split
 *  across Intervention + Condition is scored and ranked exactly like an equivalent Advanced
 *  Search query would be. */
function rerankFields(filters: TrialFilters): FieldTerms {
  return { intervention: filters.intervention, condition: filters.condition, term: filters.term };
}

function toSearchParams(filters: TrialFilters, pageToken?: string): TrialSearchParams {
  return {
    term: filters.term || undefined,
    condition: filters.condition || undefined,
    intervention: filters.intervention || undefined,
    sponsor: filters.sponsor || undefined,
    nctId: filters.nctId || undefined,
    statuses: filters.statuses,
    phases: filters.phases,
    studyType: filters.studyType || undefined,
    sort: filters.sort,
    pageSize: PAGE_SIZE,
    pageToken,
  };
}

export function hasActiveQuery(filters: TrialFilters): boolean {
  return Boolean(
    filters.term ||
      filters.condition ||
      filters.intervention ||
      filters.sponsor ||
      filters.nctId ||
      filters.statuses.length > 0 ||
      filters.phases.length > 0 ||
      filters.studyType
  );
}

export function useTrialSearch() {
  const [filters, setFilters] = useState<TrialFilters>(EMPTY_FILTERS);
  const [studies, setStudies] = useState<TrialSummary[]>([]);
  const [totalCount, setTotalCount] = useState<number | undefined>(undefined);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>(undefined);
  const [status, setStatus] = useState<SearchStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (nextFilters: TrialFilters) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (!hasActiveQuery(nextFilters)) {
      setStudies([]);
      setTotalCount(undefined);
      setNextPageToken(undefined);
      setStatus("idle");
      setErrorMessage(undefined);
      return;
    }

    setStatus("loading");
    setErrorMessage(undefined);
    try {
      const response = await searchStudies(toSearchParams(nextFilters), controller.signal);
      const parsed = (response.studies ?? []).map(parseStudySummary);
      const fields = rerankFields(nextFilters);
      const ranked = rerankByRelevance(parsed, fields);
      if (fields.intervention && ranked.some((s) => (s.matchScore ?? 0) === 0)) {
        debugLogInterventions(fields.intervention, ranked.filter((s) => (s.matchScore ?? 0) === 0));
      }
      setStudies(ranked);
      setTotalCount(response.totalCount);
      setNextPageToken(response.nextPageToken);
      setStatus("success");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setStatus("error");
      setErrorMessage(
        err instanceof ClinicalTrialsApiError ? err.message : "Something went wrong while searching. Please try again."
      );
    }
  }, []);

  // Debounced auto-search whenever any filter changes.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(filters);
    }, DEBOUNCE_MS);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadMore = useCallback(async () => {
    if (!nextPageToken || status === "loading-more") return;
    setStatus("loading-more");
    try {
      const response = await searchStudies(toSearchParams(filters, nextPageToken));
      const parsed = (response.studies ?? []).map(parseStudySummary);
      const fields = rerankFields(filters);
      setStudies((prev) => {
        const combined = [...prev, ...parsed];
        return rerankByRelevance(combined, fields);
      });
      setNextPageToken(response.nextPageToken);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setErrorMessage(
        err instanceof ClinicalTrialsApiError ? err.message : "Could not load more results. Please try again."
      );
    }
  }, [filters, nextPageToken, status]);

  const updateFilters = useCallback((partial: Partial<TrialFilters>) => {
    setFilters((prev) => ({ ...prev, ...partial }));
  }, []);

  const clearFilters = useCallback(() => setFilters(EMPTY_FILTERS), []);

  const activeFilterCount = useMemo(
    () => filters.statuses.length + filters.phases.length + (filters.studyType ? 1 : 0),
    [filters]
  );

  return {
    filters,
    updateFilters,
    clearFilters,
    studies,
    totalCount,
    nextPageToken,
    status,
    errorMessage,
    loadMore,
    activeFilterCount,
    hasQuery: hasActiveQuery(filters),
  };
}
