export function Footer() {
  return (
    <footer className="border-t border-slate-200 py-8 dark:border-slate-800">
      <div className="mx-auto max-w-7xl px-4 text-center text-xs text-slate-400 sm:px-6 lg:px-8 dark:text-slate-500">
        <p>
          Data sourced live from{" "}
          <a
            href="https://clinicaltrials.gov"
            target="_blank"
            rel="noreferrer"
            className="underline decoration-slate-300 underline-offset-2 hover:text-accent-600 dark:decoration-slate-600"
          >
            ClinicalTrials.gov
          </a>{" "}
          (v2 API). This tool structures publicly registered trial data for faster review — it is
          not medical advice and does not evaluate clinical validity or study quality.
        </p>
      </div>
    </footer>
  );
}
