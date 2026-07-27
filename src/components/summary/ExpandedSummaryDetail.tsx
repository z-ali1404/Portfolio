import { useState } from "react";
import type { SummaryData } from "@/types/summary";
import { DesignQualityPanel } from "@/components/summary/DesignQualityPanel";
import { ComparatorsAndConditions } from "@/components/summary/ComparatorsAndConditions";
import { SponsorBreakdownSection } from "@/components/summary/SponsorBreakdownSection";
import { EnrollmentDistributionChart } from "@/components/summary/EnrollmentDistributionChart";
import { TimelineChart } from "@/components/summary/TimelineChart";
import { GeographicSpreadSection } from "@/components/summary/GeographicSpreadSection";

const TABS = ["Design & Quality", "Landscape", "Scale & Timeline", "Geography"] as const;
type Tab = (typeof TABS)[number];

interface ExpandedSummaryDetailProps {
  data: SummaryData;
  onSelectIntervention: (name: string) => void;
  onSelectCondition: (name: string) => void;
  onSelectSponsor: (name: string) => void;
}

/**
 * The full detail view, organized as tabs rather than one long stacked
 * scroll — only one tab's content is on screen at a time by default, so
 * drilling into e.g. "Design & Quality" doesn't also force Geography and
 * Sponsors to take up scroll space.
 */
export function ExpandedSummaryDetail({
  data,
  onSelectIntervention,
  onSelectCondition,
  onSelectSponsor,
}: ExpandedSummaryDetailProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Design & Quality");

  return (
    <div className="pt-2">
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-3 dark:border-slate-800">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              activeTab === tab
                ? "bg-accent-600 text-white"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        {activeTab === "Design & Quality" && (
          <DesignQualityPanel designBreakdown={data.designBreakdown} biasLandscape={data.biasLandscape} />
        )}

        {activeTab === "Landscape" && (
          <div className="space-y-4">
            <ComparatorsAndConditions
              topInterventions={data.topInterventions}
              topConditions={data.topConditions}
              onSelectIntervention={onSelectIntervention}
              onSelectCondition={onSelectCondition}
            />
            <SponsorBreakdownSection sponsors={data.sponsors} onSelectSponsor={onSelectSponsor} />
          </div>
        )}

        {activeTab === "Scale & Timeline" && (
          <div className="grid gap-4 lg:grid-cols-2">
            <EnrollmentDistributionChart enrollment={data.enrollment} />
            <TimelineChart timeline={data.timeline} totalConsidered={data.overview.loadedForSummary} />
          </div>
        )}

        {activeTab === "Geography" && <GeographicSpreadSection geography={data.geography} />}
      </div>
    </div>
  );
}
