import type { SearchStatus } from "@/hooks/useTrialSearch";
import type { TrialSummary } from "@/types/clinicalTrials";
import { TrialCard } from "@/components/results/TrialCard";
import { TrialCardSkeleton } from "@/components/results/TrialCardSkeleton";
import { EmptyState } from "@/components/results/EmptyState";
import { ErrorState } from "@/components/results/ErrorState";
import { Button } from "@/components/ui/Button";

interface TrialListProps {
  studies: TrialSummary[];
  status: SearchStatus;
  errorMessage?: string;
  hasQuery: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
}

export function TrialList({
  studies,
  status,
  errorMessage,
  hasQuery,
  hasMore,
  onLoadMore,
  onRetry,
}: TrialListProps) {
  if (status === "loading") {
    return (
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <TrialCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (status === "error" && studies.length === 0) {
    return <ErrorState message={errorMessage ?? "Something went wrong."} onRetry={onRetry} />;
  }

  if (!hasQuery) {
    return <EmptyState variant="no-query" />;
  }

  if (studies.length === 0) {
    return <EmptyState variant="no-results" />;
  }

  return (
    <div className="space-y-4">
      {studies.map((study) => (
        <TrialCard key={study.nctId} summary={study} />
      ))}

      {hasMore && (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" onClick={onLoadMore} disabled={status === "loading-more"}>
            {status === "loading-more" ? "Loading more…" : "Load more trials"}
          </Button>
        </div>
      )}

      {status === "error" && (
        <p className="text-center text-sm text-rose-600 dark:text-rose-400">{errorMessage}</p>
      )}
    </div>
  );
}
