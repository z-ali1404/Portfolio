import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ClinicalTrialsApiError, searchStudies } from "@/api/clinicalTrialsApi";
import { parseStudySummary } from "@/lib/parseStudy";
import type { SortOption, TrialSearchParams, TrialSummary } from "@/types/clinicalTrials";

const PAGE_SIZE = 20;
const DEBOUNCE_MS = 450;

export type SearchStatus = "idle" | "loading" | "loading-more" | "success" | "error";

export interface TrialFilters {
  term: string;
  condition: string;
  intervention: string;
  sponsor: string;
  nctId: string;
  statuses: string[];
  phases: string[];
  studyType: "" | "INTERVENTIONAL" | "OBSERVATIONAL";
  sort: SortOption;
}

const EMPTY_FILTERS: TrialFilters = {
  term: "",
  condition: "",
  intervention: "",
  sponsor: "",
  nctId: "",
  statuses: [],
  phases: [],
  studyType: "",
  sort: "relevance",
};

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
      setStudies((response.studies ?? []).map(parseStudySummary));
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
      setStudies((prev) => [...prev, ...(response.studies ?? []).map(parseStudySummary)]);
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
