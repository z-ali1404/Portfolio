import { useEffect, useRef, useState } from "react";
import { fetchAllStudiesForSummary, ClinicalTrialsApiError } from "@/api/clinicalTrialsApi";
import { aggregateSearchResults } from "@/lib/summaryAggregation";
import { hasActiveQuery, type TrialFilters } from "@/hooks/useTrialSearch";
import type { SummaryData } from "@/types/summary";

const SUMMARY_CAP = 300;

export type SummaryStatus = "idle" | "loading" | "success" | "error";

/** Filter fields that change which trials match — sort/mode don't affect the result set itself. */
function summaryCacheKey(filters: TrialFilters): string {
  return JSON.stringify({
    term: filters.term,
    condition: filters.condition,
    intervention: filters.intervention,
    sponsor: filters.sponsor,
    nctId: filters.nctId,
    statuses: [...filters.statuses].sort(),
    phases: [...filters.phases].sort(),
    studyType: filters.studyType,
  });
}

interface CacheEntry {
  data: SummaryData;
}

/**
 * Fetches the full (capped) result set for the current search and computes
 * the Summary View's aggregate statistics. Session-cached per distinct
 * search — switching status/phase filters that don't change the underlying
 * query, then switching back, does not refetch or recompute.
 */
export function useSearchSummary(filters: TrialFilters) {
  const [status, setStatus] = useState<SummaryStatus>("idle");
  const [data, setData] = useState<SummaryData | undefined>(undefined);
  const [errorMessage, setErrorMessage] = useState<string | undefined>(undefined);

  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    abortRef.current?.abort();

    if (!hasActiveQuery(filters)) {
      setStatus("idle");
      setData(undefined);
      return;
    }

    const key = summaryCacheKey(filters);
    const cached = cacheRef.current.get(key);
    if (cached) {
      setData(cached.data);
      setStatus("success");
      return;
    }

    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    setErrorMessage(undefined);

    (async () => {
      try {
        const result = await fetchAllStudiesForSummary(
          {
            term: filters.term || undefined,
            condition: filters.condition || undefined,
            intervention: filters.intervention || undefined,
            sponsor: filters.sponsor || undefined,
            nctId: filters.nctId || undefined,
            statuses: filters.statuses,
            phases: filters.phases,
            studyType: filters.studyType || undefined,
            sort: filters.sort,
          },
          SUMMARY_CAP,
          controller.signal
        );

        const aggregated = aggregateSearchResults(result.studies, {
          totalMatching: result.totalCount,
          cap: SUMMARY_CAP,
          isCapped: result.isCapped,
          excludeTerm: filters.intervention || filters.term || undefined,
        });

        cacheRef.current.set(key, { data: aggregated });
        setData(aggregated);
        setStatus("success");
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setStatus("error");
        setErrorMessage(
          err instanceof ClinicalTrialsApiError
            ? err.message
            : "Could not build the summary for this search. Please try again."
        );
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.term,
    filters.condition,
    filters.intervention,
    filters.sponsor,
    filters.nctId,
    filters.statuses,
    filters.phases,
    filters.studyType,
  ]);

  return { status, data, errorMessage };
}
