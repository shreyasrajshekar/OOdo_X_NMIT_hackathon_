// Section 6.5 — payable days and LOP. Pure functions.

import { round2 } from "@/lib/utils";

export interface DayPeriod {
  start: string; // ISO date
  end: string; // ISO date inclusive
}

export function* eachDate(p: DayPeriod): Generator<string> {
  const d = new Date(p.start + "T00:00:00Z");
  const end = new Date(p.end + "T00:00:00Z");
  for (; d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
    yield d.toISOString().slice(0, 10);
  }
}

export function isWeekend(iso: string, weekendDays = [0, 6]): boolean {
  return weekendDays.includes(new Date(iso + "T00:00:00Z").getUTCDay());
}

/**
 * working_days = calendar days in period - weekends - company holidays.
 */
export function workingDays(
  p: DayPeriod,
  holidays: Set<string>,
  weekendDays = [0, 6],
): number {
  let n = 0;
  for (const iso of eachDate(p)) {
    if (!isWeekend(iso, weekendDays) && !holidays.has(iso)) n += 1;
  }
  return n;
}

export interface LopInputs {
  absentDays: string[]; // ISO dates with no attendance and no leave
  anomalyDays: string[]; // unresolved is_anomaly rows
  halfDayCount: number;
  unpaidLeaveDays: number; // approved unpaid day_count overlapping period
}

/** Half-days count 0.5 toward LOP (Section 6.5). */
export function lopDays(inp: LopInputs): number {
  return round2(
    inp.absentDays.length +
      inp.anomalyDays.length +
      inp.halfDayCount * 0.5 +
      inp.unpaidLeaveDays,
  );
}

export function payableDays(workingDaysCount: number, lop: number): number {
  return Math.max(0, round2(workingDaysCount - lop));
}

/** per_day_rate = component_amount / working_days ; prorated = rate * payable. */
export function prorate(full: number, workingDaysCount: number, payable: number): number {
  if (workingDaysCount <= 0) return 0;
  return round2((full / workingDaysCount) * payable);
}

export interface PfConfig {
  pf_employee_rate: number;
  pf_employer_rate: number;
  professional_tax: number;
  pf_wage_ceiling: number | null;
}

export interface Deductions {
  pfEmployeeWage: number;
  pfEmployee: number;
  pfEmployer: number;
  professionalTax: number;
  total: number;
}

/**
 * Deductions (Section 6.3):
 *   PF employee = rate% of BASIC, capped at the PF wage ceiling.
 *   PF employer = same rate, shown but not deducted from net.
 *   Professional tax = flat amount.
 *   Net = gross (prorated) - PF employee - professional tax.
 */
export function computeDeductions(
  basicProrated: number,
  cfg: PfConfig,
): Deductions {
  const ceiling = cfg.pf_wage_ceiling ?? Number.POSITIVE_INFINITY;
  const wage = Math.min(basicProrated, ceiling);
  const pfEmployee = round2((wage * cfg.pf_employee_rate) / 100);
  const pfEmployer = round2((wage * cfg.pf_employer_rate) / 100);
  const tax = round2(cfg.professional_tax);
  return {
    pfEmployeeWage: round2(wage),
    pfEmployee,
    pfEmployer,
    professionalTax: tax,
    total: round2(pfEmployee + tax),
  };
}
