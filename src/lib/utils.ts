// Money/date helpers shared by the payroll engine, the leave rules and the UI.
// `cn` keeps living in ./cn so existing imports stay valid; it is re-exported
// here so callers can pull everything from one place.
export { cn } from "./cn";

/** round2 used everywhere money appears */
export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export function formatMoney(n: number | string | null | undefined): string {
  const v = typeof n === "string" ? Number(n) : n ?? 0;
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(v);
}

export function formatINR(n: number | string | null | undefined): string {
  return `₹${formatMoney(n)}`;
}

export function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}
