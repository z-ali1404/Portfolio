import type { ReactNode } from "react";

export type BadgeTone = "positive" | "neutral" | "caution" | "muted" | "accent";

const TONE_CLASSES: Record<BadgeTone, string> = {
  positive:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  neutral:
    "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
  caution:
    "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  muted:
    "bg-slate-50 text-slate-500 ring-1 ring-inset ring-slate-200 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-700",
  accent:
    "bg-accent-50 text-accent-700 ring-1 ring-inset ring-accent-200 dark:bg-accent-500/10 dark:text-accent-300 dark:ring-accent-500/30",
};

export function Badge({ tone = "neutral", children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${TONE_CLASSES[tone]}`}
    >
      {children}
    </span>
  );
}
