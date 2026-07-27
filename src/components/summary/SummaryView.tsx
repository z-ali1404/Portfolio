import { useState } from "react";
import type { TrialFilters } from "@/hooks/useTrialSearch";
import { useSearchSummary } from "@/hooks/useSearchSummary";
import { SummarySkeleton } from "@/components/summary/SummarySkeleton";
import { SummaryAtAGlance } from "@/components/summary/SummaryAtAGlance";
import { ExpandedSummaryDetail } from "@/components/summary/ExpandedSummaryDetail";
import { CollapsibleContainer } from "@/components/summary/charts";

interface SummaryViewProps {
  filters: TrialFilters;
  onUpdateFilters: (partial: Partial<TrialFilters>) => void;
  onDrillDown: () => void;
}

/**
 * The Summary View: an aggregated, synthesised overview of the entire
 * matching result set (not just the current page), rendered above the
 * individual trial cards. See `hooks/useSearchSummary.ts` for how the full
 * (capped) result set is fetched and cached, and `lib/summaryAggregation.ts`
 * for every calculation performed here.
 *
 * Progressive disclosure: only `SummaryAtAGlance` (4-5 data points) renders
 * by default. `ExpandedSummaryDetail` (the other 9 sections, tabbed) only
 * mounts once the user explicitly asks for it. `expanded` intentionally
 * lives in this component's own state rather than being derived from the
 * search — it survives filter changes (status/phase toggles don't unmount
 * this component) but a genuinely new search still starts collapsed, since
 * `SummaryView` itself remounts each time `hasQuery` flips through false.
 */
export function SummaryView({ filters, onUpdateFilters, onDrillDown }: SummaryViewProps) {
  const { status, data, errorMessage } = useSearchSummary(filters);
  const [expanded, setExpanded] = useState(false);

  if (status === "idle") return null;

  if (status === "loading") {
    return <SummarySkeleton />;
  }

  if (status === "error") {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
        {errorMessage ?? "Could not build a summary for this search."}
      </div>
    );
  }

  if (!data) return null;

  const selectPhase = (phaseCode: string) => {
    onUpdateFilters({ phases: [phaseCode] });
    onDrillDown();
  };
  const selectIntervention = (name: string) => {
    onUpdateFilters({ intervention: name });
    onDrillDown();
  };
  const selectCondition = (name: string) => {
    onUpdateFilters({ condition: name });
    onDrillDown();
  };
  const selectSponsor = (name: string) => {
    onUpdateFilters({ sponsor: name });
    onDrillDown();
  };

  return (
    <div className="space-y-3">
      {(data.isSmallSample || data.isCapped) && (
        <div className="space-y-1.5">
          {data.isSmallSample && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Small result set ({data.overview.totalMatching} trials) — summary statistics may be less representative.
            </p>
          )}
          {data.isCapped && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Summary based on the most relevant {data.overview.loadedForSummary} of {data.overview.totalMatching}{" "}
              total matching trials.
            </p>
          )}
        </div>
      )}

      <SummaryAtAGlance
        data={data}
        expanded={expanded}
        onToggleExpanded={() => setExpanded((v) => !v)}
        onSelectPhase={selectPhase}
      />

      <CollapsibleContainer open={expanded}>
        <ExpandedSummaryDetail
          data={data}
          onSelectIntervention={selectIntervention}
          onSelectCondition={selectCondition}
          onSelectSponsor={selectSponsor}
        />
      </CollapsibleContainer>
    </div>
  );
}
