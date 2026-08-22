// Section 6.6 — day counting with the sandwich rule.
// Day count excludes weekends and company holidays by default.
// Sandwich rule: non-working days strictly between two working days of the
// request window also count as leave. Applies to unpaid leave only, behind
// the payroll_config.sandwich_unpaid_leaves flag.

import { eachDate, isWeekend } from "@/lib/payroll/days";

export interface CountOptions {
  holidays: Set<string>;
  weekendDays?: number[];
  sandwich: boolean;
}

export interface DayCount {
  plainWorkingDays: number;
  sandwichExtra: number;
  total: number;
}

export function countLeaveDays(
  startISO: string,
  endISO: string,
  opts: CountOptions,
): DayCount {
  const weekendDays = opts.weekendDays ?? [0, 6];
  const dates = [...eachDate({ start: startISO, end: endISO })];
  const isWorking = (iso: string) =>
    !isWeekend(iso, weekendDays) && !opts.holidays.has(iso);

  let plainWorkingDays = 0;
  for (const iso of dates) if (isWorking(iso)) plainWorkingDays += 1;

  let sandwichExtra = 0;
  if (opts.sandwich) {
    for (let i = 0; i < dates.length; i++) {
      const iso = dates[i];
      if (isWorking(iso)) continue;
      const hasWorkingBefore = dates.slice(0, i).some(isWorking);
      const hasWorkingAfter = dates
        .slice(i + 1)
        .some(isWorking);
      if (hasWorkingBefore && hasWorkingAfter) sandwichExtra += 1;
    }
  }

  return {
    plainWorkingDays,
    sandwichExtra,
    total: plainWorkingDays + sandwichExtra,
  };
}

/** Sick leave needs a certificate beyond two days (Section 6.6). */
export function sickNeedsAttachment(dayCount: number): boolean {
  return dayCount > 2;
}
