import { useState, type ReactNode } from "react";

/**
 * Shared card wrapper for every Summary View section. The header lives in its
 * own block with a fixed bottom margin (`mb-4`, not a top-margin on the
 * content) so a section's heading can never be pushed into / overlapped by
 * whatever the content renders below it — this is the fix for the Sample
 * Size Distribution title-overlap bug, applied once here so the same class
 * of layout collision can't recur in any other section.
 */
export function SummaryCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-card dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-4">
        <h3 className="text-sm font-semibold leading-tight text-slate-900 dark:text-white">{title}</h3>
        {subtitle && <p className="mt-1 text-xs leading-snug text-slate-500 dark:text-slate-400">{subtitle}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

/** Smoothly animated expand/collapse wrapper — no abrupt show/hide. */
export function CollapsibleContainer({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={`grid transition-[grid-template-rows] duration-300 ease-in-out ${
        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
      }`}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}

/** Small chevron used on every collapsed section/action so it's always visible where more detail lives. */
export function Chevron({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`h-3.5 w-3.5 shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""} ${className}`}
    >
      <path d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.1l3.71-3.87a.75.75 0 1 1 1.08 1.04l-4.25 4.43a.75.75 0 0 1-1.08 0L5.21 8.27a.75.75 0 0 1 .02-1.06Z" />
    </svg>
  );
}

/** Caps a ranked list at 5 items by default with a "Show more" toggle, instead of always rendering 10-15. */
export function ShowMoreList<T>({
  items,
  visibleCount = 5,
  renderItem,
  emptyMessage,
}: {
  items: T[];
  visibleCount?: number;
  renderItem: (item: T, index: number) => ReactNode;
  emptyMessage: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (items.length === 0) {
    return <p className="text-sm text-slate-400 dark:text-slate-500">{emptyMessage}</p>;
  }
  const visible = expanded ? items : items.slice(0, visibleCount);
  const hiddenCount = items.length - visibleCount;

  return (
    <div>
      <div className="space-y-2.5">{visible.map((item, i) => renderItem(item, i))}</div>
      {hiddenCount > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 text-xs font-medium text-accent-700 hover:underline dark:text-accent-400"
        >
          {expanded ? "Show less" : `Show ${hiddenCount} more`}
        </button>
      )}
    </div>
  );
}

/** A single labeled horizontal bar with count + percent, optionally clickable to drill into the trial list. */
export function BarRow({
  label,
  count,
  percent,
  maxPercent = 100,
  onClick,
  emphasize = false,
}: {
  label: string;
  count: number;
  percent: number;
  maxPercent?: number;
  onClick?: () => void;
  emphasize?: boolean;
}) {
  const widthPct = maxPercent > 0 ? Math.min(100, (percent / maxPercent) * 100) : 0;

  const content = (
    <>
      <div className="flex items-center justify-between text-xs">
        <span
          className={`truncate pr-2 text-slate-700 dark:text-slate-300 ${
            onClick ? "group-hover:text-accent-700 dark:group-hover:text-accent-300" : ""
          }`}
        >
          {label}
        </span>
        <span className="shrink-0 tabular-nums text-slate-500 dark:text-slate-400">
          {count.toLocaleString("en-US")} · {percent}%
        </span>
      </div>
      <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full rounded-full transition-all ${
            emphasize ? "bg-accent-500" : "bg-slate-400 dark:bg-slate-600"
          } ${onClick ? "group-hover:bg-accent-500" : ""}`}
          style={{ width: `${widthPct}%` }}
        />
      </div>
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className="group w-full cursor-pointer text-left">
        {content}
      </button>
    );
  }

  return <div className="group w-full text-left">{content}</div>;
}

/**
 * Wraps a short piece of trigger text (e.g. "other") in a hoverable AND
 * tappable popover that reveals a small breakdown panel — used so a vague
 * bucket label can stay compact in place while still being interactively
 * inspectable, without permanently occupying space in the compact card.
 */
export function HoverPopover({ trigger, children }: { trigger: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span
      className="relative inline-block"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="underline decoration-dotted underline-offset-2 hover:text-accent-700 dark:hover:text-accent-300"
      >
        {trigger}
      </button>
      {open && (
        <span className="absolute left-1/2 top-full z-10 mt-2 w-52 -translate-x-1/2 rounded-lg border border-slate-200 bg-white p-3 text-left text-xs shadow-card-hover dark:border-slate-700 dark:bg-slate-800">
          {children}
        </span>
      )}
    </span>
  );
}

/** Small note explaining incomplete data for a section — always rendered the same way for consistency. */
export function CompletenessNote({ percent, label }: { percent: number; label: string }) {
  if (percent <= 0) return null;
  return (
    <p className="mt-3 text-xs italic text-slate-400 dark:text-slate-500">
      Data not reported for {percent}% of trials{label ? ` (${label})` : ""}.
    </p>
  );
}

/**
 * Single thin horizontal stacked bar (e.g. phase distribution) for the
 * compact "at a glance" card — replaces a full set of labeled rows with one
 * glanceable shape. Each segment shows an exact-count tooltip on hover/tap.
 */
export function InlineStackedBar({
  segments,
  onSelectSegment,
}: {
  segments: { label: string; count: number; percent: number; code?: string }[];
  onSelectSegment?: (code: string) => void;
}) {
  const total = segments.reduce((sum, s) => sum + s.count, 0);
  if (total === 0) {
    return <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800" />;
  }

  // Single-hue accent ramp + neutral slate, largest segment darkest — restrained, not a rainbow.
  const shades = [
    "bg-accent-600",
    "bg-accent-400",
    "bg-accent-300",
    "bg-slate-300 dark:bg-slate-600",
    "bg-slate-200 dark:bg-slate-700",
    "bg-slate-100 dark:bg-slate-800",
  ];

  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full">
      {segments.map((s, i) => {
        const clickable = Boolean(s.code && onSelectSegment);
        const segmentClassName = `h-full ${shades[i] ?? shades[shades.length - 1]} ${
          i > 0 ? "border-l border-white/60 dark:border-slate-900/60" : ""
        } ${clickable ? "cursor-pointer transition-opacity hover:opacity-80" : ""}`;
        const segmentTitle = `${s.label}: ${s.count.toLocaleString("en-US")} (${s.percent}%)`;
        const segmentStyle = { width: `${(s.count / total) * 100}%` };

        return clickable ? (
          <button
            key={s.label}
            type="button"
            onClick={() => onSelectSegment!(s.code!)}
            title={segmentTitle}
            className={segmentClassName}
            style={segmentStyle}
          />
        ) : (
          <div key={s.label} title={segmentTitle} className={segmentClassName} style={segmentStyle} />
        );
      })}
    </div>
  );
}

/** Restrained 2-3 segment donut. Segments are ordered largest-first and colored on a single-hue accent ramp
 *  plus neutral slate — deliberately not a multi-color pie, to keep the tool reading as a serious research aid. */
export function MiniDonut({
  segments,
}: {
  segments: { label: string; value: number; colorClass: string }[];
}) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <svg viewBox="0 0 40 40" className="h-24 w-24 -rotate-90">
      <circle cx="20" cy="20" r={radius} fill="none" strokeWidth="8" className="stroke-slate-100 dark:stroke-slate-800" />
      {segments.map((s, i) => {
        const fraction = s.value / total;
        const dash = fraction * circumference;
        const circle = (
          <circle
            key={i}
            cx="20"
            cy="20"
            r={radius}
            fill="none"
            strokeWidth="8"
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            className={s.colorClass}
          />
        );
        offset += dash;
        return circle;
      })}
    </svg>
  );
}
