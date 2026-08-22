"use client";

import { useState } from "react";

/**
 * The shared furniture of the admin screens — header, summary tiles, toolbar
 * controls, table shell, empty state.
 *
 * The directory, attendance and time off are the same kind of page: a count
 * strip you can filter by, a row of controls, and a dense table. Keeping the
 * parts here is what makes them feel like one product rather than three.
 */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-plum">
          {eyebrow}
        </p>
        <h1 className="mt-2 font-display text-[30px] font-extrabold tracking-tight text-ink">
          {title}
        </h1>
        <p className="mt-1 max-w-[60ch] font-body text-[15px] text-ink/70">
          {description}
        </p>
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}

export type Tone = "default" | "success" | "warn" | "plum" | "muted";

const VALUE_TONE: Record<Tone, string> = {
  default: "text-ink",
  success: "text-success",
  warn: "text-warn",
  plum: "text-primary",
  muted: "text-ink/50",
};

/** A count that is also a filter — the quickest route to "show me those". */
export function SummaryTile({
  label,
  value,
  hint,
  tone = "default",
  active,
  onClick,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: Tone;
  active?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-plum">
        {label}
      </p>
      <p
        className={`mt-1 font-display text-[26px] font-extrabold tabular-nums ${VALUE_TONE[tone]}`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 font-body text-[13px] text-ink/60">{hint}</p>
      )}
    </>
  );

  if (!onClick) {
    return (
      <div className="rounded-card border border-line p-4">{body}</div>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-card border p-4 text-left transition-colors ${
        active
          ? "border-plum bg-plum/[0.06]"
          : "border-line hover:border-plum/50 hover:bg-plum/[0.03]"
      }`}
    >
      {body}
    </button>
  );
}

/**
 * One control for both export formats, so the page header does not grow a
 * button per file type.
 */
export function ExportMenu({
  onCsv,
  onPdf,
  busy,
}: {
  onCsv: () => void;
  onPdf: () => void | Promise<void>;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="relative"
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        aria-expanded={open}
        aria-haspopup="menu"
        className="inline-flex h-10 items-center gap-1.5 rounded-pill border border-plum/35 px-5 font-display text-sm font-semibold text-primary transition-colors hover:border-plum/60 hover:bg-plum/10 disabled:opacity-55"
      >
        {busy ? "Preparing…" : "Export"}
        <span aria-hidden className="text-[10px]">▾</span>
      </button>

      {open && !busy && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-30 w-40 overflow-hidden rounded-card border border-line bg-paper p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onCsv();
            }}
            className="block w-full rounded-card px-3 py-2 text-left font-display text-sm text-ink hover:bg-line/60"
          >
            Spreadsheet (CSV)
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              void onPdf();
            }}
            className="block w-full rounded-card px-3 py-2 text-left font-display text-sm text-ink hover:bg-line/60"
          >
            Report (PDF)
          </button>
        </div>
      )}
    </div>
  );
}

export function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-card border border-line bg-paper/70 p-3">
      {children}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <input
      type="search"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 min-w-[15rem] flex-1 rounded-pill border border-line bg-paper px-4 font-display text-sm text-ink focus:border-plum"
    />
  );
}

export function FilterSelect({
  value,
  onChange,
  label,
  options,
}: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-pill border border-line bg-paper px-3 font-display text-sm text-ink focus:border-plum"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex overflow-hidden rounded-pill border border-line"
    >
      {options.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={value === option}
          className={`px-3 py-1.5 font-display text-xs font-semibold capitalize transition-colors ${
            value === option
              ? "bg-primary text-paper"
              : "text-ink/70 hover:bg-line/60"
          }`}
        >
          {option}
        </button>
      ))}
    </div>
  );
}

/** Prev / label / next, used for both the date and the month steppers. */
export function Stepper({
  onPrev,
  onNext,
  onReset,
  resetLabel,
  children,
}: {
  onPrev: () => void;
  onNext: () => void;
  onReset?: () => void;
  resetLabel?: string;
  children: React.ReactNode;
}) {
  const arrow =
    "flex h-9 w-9 items-center justify-center rounded-pill border border-line font-display text-sm text-ink transition-colors hover:border-plum/60 hover:bg-plum/[0.06]";

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={onPrev} aria-label="Previous" className={arrow}>
        ←
      </button>
      {children}
      <button type="button" onClick={onNext} aria-label="Next" className={arrow}>
        →
      </button>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="h-9 rounded-pill border border-line px-3 font-display text-xs font-semibold text-ink/70 transition-colors hover:border-plum/60 hover:text-primary"
        >
          {resetLabel ?? "Today"}
        </button>
      )}
    </div>
  );
}

export function ResultLine({
  showing,
  total,
  noun,
  detail,
  onClear,
}: {
  showing: number;
  total: number;
  noun: string;
  detail?: string;
  onClear?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="font-body text-[15px] text-ink/70">
        Showing <span className="font-semibold text-ink">{showing}</span> of{" "}
        {total} {noun}
        {detail ? ` · ${detail}` : ""}
      </p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="font-display text-sm font-semibold text-primary hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

export function TableShell({
  columns,
  minWidth = "56rem",
  children,
}: {
  columns: string[];
  minWidth?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-x-auto rounded-card border border-line">
      <table className="w-full text-left" style={{ minWidth }}>
        <thead>
          <tr className="border-b border-line bg-line/50">
            {columns.map((column, i) => (
              <th
                key={`${column}-${i}`}
                scope="col"
                className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-plum"
              >
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export function Row({ children }: { children: React.ReactNode }) {
  return (
    <tr className="group border-b border-line/60 transition-colors last:border-0 hover:bg-plum/[0.04]">
      {children}
    </tr>
  );
}

export function EmptyState({
  title,
  description,
  onClear,
}: {
  title: string;
  description: string;
  onClear?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line py-20 text-center">
      <p className="font-display text-sm font-semibold text-ink">{title}</p>
      <p className="max-w-[46ch] font-body text-[15px] text-ink/70">
        {description}
      </p>
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          className="mt-2 font-display text-sm font-semibold text-primary hover:underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

/** Name over email, with the initials avatar the directory uses. */
export function PersonCell({
  initials,
  name,
  meta,
  href,
}: {
  initials: string;
  name: string;
  meta?: string;
  href?: string;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-plum/15 font-mono text-[11px] font-bold uppercase text-primary">
        {initials}
      </span>
      <span className="min-w-0">
        {href ? (
          <a
            href={href}
            className="block truncate font-display text-sm font-semibold text-ink hover:text-primary"
          >
            {name}
          </a>
        ) : (
          <span className="block truncate font-display text-sm font-semibold text-ink">
            {name}
          </span>
        )}
        {meta && (
          <span className="block truncate font-body text-[13px] text-ink/60">
            {meta}
          </span>
        )}
      </span>
    </div>
  );
}

const PILL_TONE: Record<Tone, string> = {
  default: "bg-line text-ink/70",
  success: "bg-success/12 text-success",
  warn: "bg-warn/12 text-warn",
  plum: "bg-plum/12 text-primary",
  muted: "bg-line/60 text-ink/50",
};

const DOT_TONE: Record<Tone, string> = {
  default: "bg-ink/40",
  success: "bg-success",
  warn: "bg-warn",
  plum: "bg-plum",
  muted: "bg-ink/25",
};

export function StatusPill({
  label,
  tone = "default",
  dot = true,
}: {
  label: string;
  tone?: Tone;
  dot?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill px-2.5 py-1 font-display text-xs font-semibold ${PILL_TONE[tone]}`}
    >
      {dot && (
        <span
          className={`h-1.5 w-1.5 rounded-pill ${DOT_TONE[tone]}`}
          aria-hidden
        />
      )}
      {label}
    </span>
  );
}

/** A thin proportion bar — attendance rate, leave used, that sort of thing. */
export function MiniBar({
  value,
  max,
  tone = "plum",
}: {
  value: number;
  max: number;
  tone?: Tone;
}) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <span className="flex items-center gap-2">
      <span className="h-1.5 w-16 overflow-hidden rounded-pill bg-line">
        <span
          className={`block h-full rounded-pill ${DOT_TONE[tone]}`}
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="font-display text-xs tabular-nums text-ink/60">
        {pct}%
      </span>
    </span>
  );
}
