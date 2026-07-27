import type { ReactNode } from "react";
import { buildEvidenceSnapshot } from "@/lib/evidenceReview";
import type { EvidenceField, TrialDetail } from "@/types/clinicalTrials";
import { Badge } from "@/components/ui/Badge";

function ConfidenceBadge({ field }: { field: EvidenceField }) {
  return <Badge tone={field.confidence === "stated" ? "accent" : "muted"}>{field.value}</Badge>;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
      <dt className="w-40 flex-none text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

/**
 * The dashboard's core differentiator: a rule-based "Validity Snapshot"
 * that surfaces methodological signals (randomization, blinding,
 * comparator structure, enrollment scale, phase context, recruitment
 * state) without ever asserting a quality verdict. Every value here is
 * traceable to a specific ClinicalTrials.gov field — see
 * src/lib/evidenceReview.ts for the exact rules.
 */
export function EvidenceReviewPanel({ detail }: { detail: TrialDetail }) {
  const snapshot = buildEvidenceSnapshot(detail);

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-accent-100 bg-accent-50/60 px-4 py-3 text-xs text-accent-900 dark:border-accent-900/40 dark:bg-accent-500/5 dark:text-accent-200">
        Structured review aid, not medical advice. Every field below is derived directly from the
        registry record; anything the registry doesn't clearly state is labeled "Not clearly
        stated" rather than inferred.
      </div>

      {snapshot.cautionFlag && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-500/10 dark:text-amber-300">
          <svg viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 flex-none">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.63-1.516 2.63H3.72c-1.347 0-2.189-1.463-1.516-2.63L8.485 2.495ZM10 6a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 8a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          <span>
            Recruitment status is <strong>{snapshot.recruitmentState.value}</strong>
            {snapshot.cautionReason ? ` — reported reason: "${snapshot.cautionReason}"` : ""}.
          </span>
        </div>
      )}

      <dl className="space-y-2.5">
        <Row label="Randomization">
          <ConfidenceBadge field={snapshot.randomization} />
        </Row>
        <Row label="Blinding">
          <ConfidenceBadge field={snapshot.blinding} />
        </Row>
        <Row label="Comparator">
          <ConfidenceBadge field={snapshot.comparator} />
        </Row>
        <Row label="Enrollment scale">
          <ConfidenceBadge field={snapshot.enrollmentScale} />
        </Row>
        <Row label="Phase context">
          <ConfidenceBadge field={snapshot.phaseContext} />
        </Row>
        <Row label="Recruitment state">
          <ConfidenceBadge field={snapshot.recruitmentState} />
        </Row>
        <Row label="Results posted">
          <Badge tone={snapshot.resultsAvailable ? "positive" : "muted"}>
            {snapshot.resultsAvailable ? "Yes, results available" : "No results posted yet"}
          </Badge>
        </Row>
      </dl>

      <div className="rounded-lg bg-slate-50 px-4 py-3 dark:bg-slate-800/50">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
          Interpretation note
        </p>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {snapshot.interpretationNote}
        </p>
      </div>
    </div>
  );
}
