import { useEffect, useRef } from "react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SearchBar } from "@/components/search/SearchBar";
import { FilterBar } from "@/components/search/FilterBar";
import { ResultsSummary } from "@/components/results/ResultsSummary";
import { TrialList } from "@/components/results/TrialList";
import { SummaryView } from "@/components/summary/SummaryView";
import { RoleSelector } from "@/components/role/RoleSelector";
import { useTrialSearch } from "@/hooks/useTrialSearch";
import { useRole } from "@/context/RoleContext";

export default function App() {
  const trialListRef = useRef<HTMLDivElement>(null);
  const { config: roleConfig } = useRole();
  const {
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
    hasQuery,
  } = useTrialSearch();

  // Role switching resets the sort to that role's default emphasis — e.g. Hospital Team defaults
  // to "recently updated" instead of relevance — without touching any other filter or re-fetching
  // anything beyond the normal debounced search that a sort change already triggers.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    updateFilters({ sort: roleConfig.defaultSort });
  }, [roleConfig.id]);

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <RoleSelector />

        <section className="mt-4 space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <SearchBar filters={filters} onUpdate={updateFilters} />
          <FilterBar
            filters={filters}
            onUpdate={updateFilters}
            onClear={clearFilters}
            activeFilterCount={activeFilterCount}
          />
        </section>

        {hasQuery && (
          <section className="mt-8">
            <SummaryView
              filters={filters}
              onUpdateFilters={updateFilters}
              onDrillDown={() => trialListRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
          </section>
        )}

        <section className="mt-8 space-y-5" ref={trialListRef}>
          {hasQuery && (
            <ResultsSummary filters={filters} totalCount={totalCount} loadedCount={studies.length} />
          )}
          <TrialList
            studies={studies}
            status={status}
            errorMessage={errorMessage}
            hasQuery={hasQuery}
            hasMore={Boolean(nextPageToken)}
            onLoadMore={loadMore}
            onRetry={() => updateFilters({})}
          />
        </section>
      </main>

      <Footer />
    </div>
  );
}
