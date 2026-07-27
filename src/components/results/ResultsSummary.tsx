import type { TrialFilters } from "@/hooks/useTrialSearch";
import { titleCase } from "@/lib/formatters";

interface ResultsSummaryProps {
  filters: TrialFilters;
  totalCount?: number;
  loadedCount: number;
}

function describeQuery(filters: TrialFilters): string | undefined {
  if (filters.nctId) return `NCT ID "${filters.nctId}"`;
  const parts: string[] = [];
  if (filters.term) parts.push(`"${filters.term}"`);
  if (filters.condition) parts.push(`condition: ${filters.condition}`);
  if (filters.intervention) parts.push(`intervention: ${filters.intervention}`);
  if (filters.sponsor) parts.push(`sponsor: ${filters.sponsor}`);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function ResultsSummary({ filters, totalCount, loadedCount }: ResultsSummaryProps) {
  const queryDescription = describeQuery(filters);
  const activeChips = [
    ...filters.statuses.map((s) => titleCase(s)),
    ...filters.phases.map((p) => titleCase(p)),
    ...(filters.studyType ? [titleCase(filters.studyType)] : []),
  ];

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
      <div className="text-slate-600 dark:text-slate-300">
        <span className="font-semibold text-slate-900 dark:text-white">
          {totalCount !== undefined ? totalCount.toLocaleString("en-US") : loadedCount}
        </span>{" "}
        {totalCount === 1 ? "trial" : "trials"} found
        {queryDescription && (
          <>
            {" "}
            for <span className="font-medium">{queryDescription}</span>
          </>
        )}
        {activeChips.length > 0 && (
          <span className="text-slate-400 dark:text-slate-500"> · filters: {activeChips.join(", ")}</span>
        )}
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">Data sourced from ClinicalTrials.gov</p>
    </div>
  );
}
