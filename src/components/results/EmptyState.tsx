interface EmptyStateProps {
  variant: "no-query" | "no-results";
}

export function EmptyState({ variant }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-16 text-center dark:border-slate-700 dark:bg-slate-900/40">
      <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10 text-slate-300 dark:text-slate-600">
        <path
          d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2m-5 8h6m-6 4h6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {variant === "no-query" ? (
        <>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Search the registry to begin your evidence review
          </p>
          <p className="max-w-sm text-sm text-slate-400 dark:text-slate-500">
            Try a condition like "non-small cell lung cancer", an intervention, a sponsor name, or
            an NCT ID.
          </p>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">No trials matched your search</p>
          <p className="max-w-sm text-sm text-slate-400 dark:text-slate-500">
            Try broadening your keyword, removing a filter, or checking the NCT ID for typos.
          </p>
        </>
      )}
    </div>
  );
}
