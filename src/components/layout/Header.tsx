import { ThemeToggle } from "@/components/ui/ThemeToggle";

export function Header() {
  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-7xl items-start justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 flex-none items-center justify-center rounded-lg bg-accent-600 text-white shadow-card">
            <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
              <path
                d="M12 3v6m0 0-3 9h6l-3-9Zm-7 9a7 7 0 0 0 14 0"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-white sm:text-xl">
              Clinical Trials Evidence Dashboard
            </h1>
            <p className="mt-0.5 max-w-xl text-sm text-slate-500 dark:text-slate-400">
              Structured evidence review for clinical trials — scan the summary, then drill into
              methodology, endpoints, and validity signals on demand.
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>
    </header>
  );
}
