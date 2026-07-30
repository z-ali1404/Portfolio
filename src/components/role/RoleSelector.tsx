import { useRole } from "@/context/RoleContext";
import { ROLE_CONFIG } from "@/config/roleConfig";
import { ROLE_IDS } from "@/types/roles";
import { HoverPopover } from "@/components/summary/charts";

/**
 * Lightweight "view as" segmented control. Switching role only changes
 * `RoleContext`'s value — it's a pure view-layer read for every consumer
 * (trial cards, summary tabs, suggested filters), so switching is instant
 * and never touches search state or re-fetches anything.
 */
export function RoleSelector() {
  const { role, setRole, config } = useRole();

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">View as</span>
        <div
          role="tablist"
          aria-label="Dashboard view"
          className="flex flex-wrap gap-1 rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900"
        >
          {ROLE_IDS.map((id) => {
            const active = id === role;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setRole(id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-500 ${
                  active
                    ? "bg-white text-accent-700 shadow-card dark:bg-slate-800 dark:text-accent-300"
                    : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                }`}
              >
                {ROLE_CONFIG[id].label}
              </button>
            );
          })}
        </div>
        <HoverPopover trigger="Why this view?">
          <p className="mb-1.5 font-medium text-slate-700 dark:text-slate-200">{config.label}</p>
          <p className="text-slate-600 dark:text-slate-300">{config.tooltip}</p>
        </HoverPopover>
      </div>
      <p className="text-xs text-slate-400 dark:text-slate-500">{config.description}</p>
    </div>
  );
}
