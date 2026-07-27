/** Small, dependency-free display formatters shared across components. */

export function formatDate(iso?: string): string {
  if (!iso) return "Not reported";
  // ClinicalTrials.gov dates are often "YYYY-MM" (month precision only).
  const parts = iso.split("-");
  const year = Number(parts[0]);
  const month = parts[1] ? Number(parts[1]) - 1 : undefined;
  if (!year || Number.isNaN(year)) return "Not reported";

  const date = new Date(Date.UTC(year, month ?? 0, 1));
  return month !== undefined
    ? date.toLocaleDateString("en-US", { year: "numeric", month: "long", timeZone: "UTC" })
    : String(year);
}

export function formatEnrollment(count?: number): string {
  if (count === undefined || count === null || Number.isNaN(count)) return "Not reported";
  return `${count.toLocaleString("en-US")} participants`;
}

const PHASE_LABELS: Record<string, string> = {
  NA: "N/A",
  EARLY_PHASE1: "Early Phase 1",
  PHASE1: "Phase 1",
  PHASE2: "Phase 2",
  PHASE3: "Phase 3",
  PHASE4: "Phase 4",
};

export function formatPhases(phases: string[]): string {
  if (!phases || phases.length === 0) return "Not reported";
  const labels = phases.map((p) => PHASE_LABELS[p] ?? p);
  return labels.join(" / ");
}

const STATUS_DISPLAY: Record<string, { label: string; tone: "positive" | "neutral" | "caution" | "muted" }> = {
  RECRUITING: { label: "Recruiting", tone: "positive" },
  NOT_YET_RECRUITING: { label: "Not yet recruiting", tone: "neutral" },
  ENROLLING_BY_INVITATION: { label: "Enrolling by invitation", tone: "neutral" },
  ACTIVE_NOT_RECRUITING: { label: "Active, not recruiting", tone: "neutral" },
  COMPLETED: { label: "Completed", tone: "muted" },
  TERMINATED: { label: "Terminated", tone: "caution" },
  WITHDRAWN: { label: "Withdrawn", tone: "caution" },
  SUSPENDED: { label: "Suspended", tone: "caution" },
  UNKNOWN: { label: "Status unknown", tone: "muted" },
};

export function formatStatus(status?: string): { label: string; tone: "positive" | "neutral" | "caution" | "muted" } {
  if (!status) return { label: "Not reported", tone: "muted" };
  return STATUS_DISPLAY[status] ?? { label: titleCase(status), tone: "neutral" };
}

export function formatStudyType(studyType?: string): string {
  if (!studyType) return "Not reported";
  return titleCase(studyType);
}

export function titleCase(value: string): string {
  return value
    .toLowerCase()
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

export function truncate(text: string | undefined, maxLength: number): string {
  if (!text) return "";
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trimEnd()}…`;
}
