import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SearchBar } from "@/components/search/SearchBar";
import { FilterBar } from "@/components/search/FilterBar";
import { ResultsSummary } from "@/components/results/ResultsSummary";
import { TrialList } from "@/components/results/TrialList";
import { useTrialSearch } from "@/hooks/useTrialSearch";

export default function App() {
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

  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
          <SearchBar filters={filters} onUpdate={updateFilters} />
          <FilterBar
            filters={filters}
            onUpdate={updateFilters}
            onClear={clearFilters}
            activeFilterCount={activeFilterCount}
          />
        </section>

        <section className="mt-6 space-y-4">
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
