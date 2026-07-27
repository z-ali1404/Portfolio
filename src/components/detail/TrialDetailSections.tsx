import type { TrialDetail } from "@/types/clinicalTrials";
import { formatDate, formatEnrollment, titleCase, truncate } from "@/lib/formatters";
import { Badge } from "@/components/ui/Badge";

/** Background / brief + detailed summary. */
export function BackgroundSection({ detail }: { detail: TrialDetail }) {
  return (
    <div className="space-y-3">
      <p>{detail.briefSummary || "No brief summary was provided for this study."}</p>
      {detail.detailedDescription && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-accent-700 dark:text-accent-400">
            Read detailed description
          </summary>
          <p className="mt-2 whitespace-pre-line text-slate-600 dark:text-slate-300">
            {detail.detailedDescription}
          </p>
        </details>
      )}
      {detail.keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {detail.keywords.map((kw) => (
            <Badge key={kw} tone="neutral">
              {kw}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

/** Study design / methodology module. */
export function DesignSection({ detail }: { detail: TrialDetail }) {
  const { designInfo } = detail;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      <Field label="Allocation" value={designInfo.allocation ? titleCase(designInfo.allocation) : undefined} />
      <Field
        label="Intervention model"
        value={designInfo.interventionModel ? titleCase(designInfo.interventionModel) : undefined}
      />
      <Field label="Primary purpose" value={designInfo.primaryPurpose ? titleCase(designInfo.primaryPurpose) : undefined} />
      <Field label="Masking" value={designInfo.masking ? titleCase(designInfo.masking) : undefined} />
      {designInfo.whoMasked.length > 0 && (
        <Field label="Who is masked" value={designInfo.whoMasked.map(titleCase).join(", ")} />
      )}
    </dl>
  );
}

/** Enrollment / sample size. */
export function EnrollmentSection({ detail }: { detail: TrialDetail }) {
  return (
    <p>
      <span className="font-medium text-slate-800 dark:text-slate-100">
        {formatEnrollment(detail.enrollmentCount)}
      </span>{" "}
      {detail.studyType && <>enrolled in this {titleCase(detail.studyType).toLowerCase()} study.</>}
    </p>
  );
}

/** Primary and secondary outcomes. */
export function OutcomesSection({ detail }: { detail: TrialDetail }) {
  return (
    <div className="space-y-4">
      <OutcomeList title="Primary outcomes" outcomes={detail.primaryOutcomes} />
      <OutcomeList title="Secondary outcomes" outcomes={detail.secondaryOutcomes} />
    </div>
  );
}

function OutcomeList({ title, outcomes }: { title: string; outcomes: TrialDetail["primaryOutcomes"] }) {
  if (outcomes.length === 0) {
    return (
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{title}</p>
        <p className="mt-1 text-slate-500 dark:text-slate-400">Not reported.</p>
      </div>
    );
  }
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{title}</p>
      <ol className="mt-1.5 space-y-2.5">
        {outcomes.map((outcome, i) => (
          <li key={i} className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
            <p className="font-medium text-slate-800 dark:text-slate-100">{outcome.measure}</p>
            {outcome.description && <p className="mt-0.5 text-slate-500 dark:text-slate-400">{outcome.description}</p>}
            {outcome.timeFrame && (
              <p className="mt-0.5 text-xs text-slate-400 dark:text-slate-500">Time frame: {outcome.timeFrame}</p>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Eligibility criteria. */
export function EligibilitySection({ detail }: { detail: TrialDetail }) {
  const { eligibility } = detail;
  const ageRange = [eligibility.minimumAge, eligibility.maximumAge].filter(Boolean).join(" – ");

  return (
    <div className="space-y-3">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
        <Field label="Sex" value={eligibility.sex ? titleCase(eligibility.sex) : undefined} />
        <Field label="Age range" value={ageRange || undefined} />
        <Field
          label="Accepts healthy volunteers"
          value={
            eligibility.healthyVolunteers === undefined
              ? undefined
              : eligibility.healthyVolunteers
              ? "Yes"
              : "No"
          }
        />
        {eligibility.stdAges.length > 0 && (
          <Field label="Age groups" value={eligibility.stdAges.map(titleCase).join(", ")} />
        )}
      </dl>
      {eligibility.criteria && (
        <details className="text-sm">
          <summary className="cursor-pointer font-medium text-accent-700 dark:text-accent-400">
            Read full eligibility criteria
          </summary>
          <p className="mt-2 whitespace-pre-line text-slate-600 dark:text-slate-300">{eligibility.criteria}</p>
        </details>
      )}
    </div>
  );
}

/** Arms and interventions. */
export function ArmsSection({ detail }: { detail: TrialDetail }) {
  if (detail.armGroups.length === 0 && detail.interventions.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400">Not reported.</p>;
  }
  return (
    <div className="space-y-3">
      {detail.armGroups.map((arm, i) => (
        <div key={i} className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="font-medium text-slate-800 dark:text-slate-100">{arm.label}</p>
            {arm.type && <Badge tone="neutral">{titleCase(arm.type)}</Badge>}
          </div>
          {arm.description && <p className="mt-1 text-slate-500 dark:text-slate-400">{truncate(arm.description, 240)}</p>}
          {arm.interventionNames.length > 0 && (
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Interventions: {arm.interventionNames.join(", ")}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/** Status and timeline. */
export function TimelineSection({ detail }: { detail: TrialDetail }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      <Field label="Start date" value={formatDate(detail.startDate)} />
      <Field label="Completion date" value={formatDate(detail.completionDate)} />
      <Field label="Last updated" value={formatDate(detail.lastUpdatePostDate)} />
      {detail.whyStopped && <Field label="Reason stopped" value={detail.whyStopped} />}
    </dl>
  );
}

/** Sponsor / collaborators. */
export function SponsorSection({ detail }: { detail: TrialDetail }) {
  return (
    <div className="space-y-1.5">
      <Field label="Lead sponsor" value={detail.leadSponsor} />
      {detail.collaborators.length > 0 && (
        <Field label="Collaborators" value={detail.collaborators.join(", ")} />
      )}
    </div>
  );
}

/** Locations. */
export function LocationsSection({ detail }: { detail: TrialDetail }) {
  if (detail.locations.length === 0) {
    return <p className="text-slate-500 dark:text-slate-400">No site locations reported.</p>;
  }
  return (
    <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {detail.locations.slice(0, 12).map((loc, i) => (
        <li key={i} className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-800/50">
          <p className="font-medium text-slate-800 dark:text-slate-100">{loc.facility || "Unnamed site"}</p>
          <p className="text-slate-500 dark:text-slate-400">
            {[loc.city, loc.state, loc.country].filter(Boolean).join(", ") || "Location not specified"}
          </p>
          {loc.status && <p className="text-xs text-slate-400 dark:text-slate-500">{titleCase(loc.status)}</p>}
        </li>
      ))}
      {detail.locations.length > 12 && (
        <li className="text-xs text-slate-400 dark:text-slate-500">
          + {detail.locations.length - 12} more site(s) not shown
        </li>
      )}
    </ul>
  );
}

function Field({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">{label}</dt>
      <dd className="text-slate-700 dark:text-slate-200">{value || "Not reported"}</dd>
    </div>
  );
}
