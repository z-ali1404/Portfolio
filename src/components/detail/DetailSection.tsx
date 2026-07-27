import { useState, type ReactNode } from "react";

interface DetailSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

/** A single accordion item used to keep each detail section collapsed until requested — this is what keeps a fully-expanded card from becoming a wall of text. */
export function DetailSection({ title, defaultOpen = false, children }: DetailSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-slate-100 last:border-b-0 dark:border-slate-800">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 py-3 text-left text-sm font-semibold text-slate-800 hover:text-slate-950 dark:text-slate-100 dark:hover:text-white"
        aria-expanded={open}
      >
        {title}
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 flex-none text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.1l3.71-3.87a.75.75 0 1 1 1.08 1.04l-4.25 4.43a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
        </svg>
      </button>
      {open && <div className="animate-expand-in pb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{children}</div>}
    </div>
  );
}
