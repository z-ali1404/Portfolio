export function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded bg-slate-200 dark:bg-slate-800 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/10" />
    </div>
  );
}

export function TrialCardSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <Shimmer className="h-5 w-24" />
        <Shimmer className="h-5 w-20" />
        <Shimmer className="h-5 w-28" />
      </div>
      <Shimmer className="mt-3 h-5 w-3/4" />
      <Shimmer className="mt-2 h-4 w-1/2" />
      <div className="mt-4 space-y-2">
        <Shimmer className="h-3.5 w-full" />
        <Shimmer className="h-3.5 w-full" />
        <Shimmer className="h-3.5 w-2/3" />
      </div>
      <div className="mt-4 flex gap-4">
        <Shimmer className="h-3.5 w-20" />
        <Shimmer className="h-3.5 w-20" />
        <Shimmer className="h-3.5 w-20" />
      </div>
    </div>
  );
}
