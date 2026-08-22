"use server";

import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  computeDeductions,
  isWeekend,
  lopDays,
  payableDays,
  prorate,
  workingDays,
  type DayPeriod,
} from "@/lib/payroll/days";
import { round2 } from "@/lib/utils";

/**
 * Payslip generation.
 *
 * This is the part of the spec that makes the product more than a set of
 * forms: attendance is the *input* to payroll. Working days come from the
 * calendar; absences, half days and approved unpaid leave come out of the
 * attendance and leave tables; what is left is what the employee is paid for.
 * Change someone's attendance and their next payslip changes with it.
 *
 * Runs server-side: it needs the service-role client to read any employee's
 * salary structure regardless of who is asking.
 */

/** Flat professional tax, per the spec's payroll configuration. */
const PROFESSIONAL_TAX = 200;

export type PayslipLine = { code: string; name: string; full: number; prorated: number };

export type PayslipResult =
  | {
      ok: true;
      employeeName: string;
      loginId: string;
      jobTitle: string;
      department: string;
      periodStart: string;
      periodEnd: string;
      reference: string;
      workingDays: number;
      payableDays: number;
      lopDays: number;
      /** What drove the LOP, so the number is explainable rather than asserted. */
      breakdown: { absentDays: number; halfDays: number; unpaidLeaveDays: number };
      /** Holidays that came off working days this period. */
      holidays: { date: string; name: string }[];
      earnings: PayslipLine[];
      deductions: { code: string; name: string; amount: number }[];
      gross: number;
      totalDeduct: number;
      netPay: number;
    }
  | { ok: false; error: string };

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Working days of an approved leave request inside the period: no weekends, no holidays. */
function leaveDaysInPeriod(
  from: string,
  to: string,
  period: DayPeriod,
  holidays: Set<string>,
): number {
  const start = from > period.start ? from : period.start;
  const end = to < period.end ? to : period.end;
  if (start > end) return 0;
  let n = 0;
  const d = new Date(start + "T00:00:00Z");
  const last = new Date(end + "T00:00:00Z");
  for (; d <= last; d.setUTCDate(d.getUTCDate() + 1)) {
    const day = d.getUTCDay();
    const iso = d.toISOString().slice(0, 10);
    if (day !== 0 && day !== 6 && !holidays.has(iso)) n += 1;
  }
  return n;
}

export async function generatePayslip(params: {
  employeeId: string;
  month: number; // 1-12
  year: number;
  /** Persist to salary_records. Preview runs the same maths without writing. */
  persist?: boolean;
}): Promise<PayslipResult> {
  const { employeeId, month, year } = params;
  if (month < 1 || month > 12) return { ok: false, error: "Month must be 1-12." };

  let admin: ReturnType<typeof supabaseAdmin>;
  try {
    admin = supabaseAdmin();
  } catch {
    return {
      ok: false,
      error: "SUPABASE_SERVICE_ROLE_KEY is not set, so payslips cannot be generated.",
    };
  }

  const period: DayPeriod = {
    start: iso(new Date(Date.UTC(year, month - 1, 1))),
    end: iso(new Date(Date.UTC(year, month, 0))),
  };

  const [
    { data: profile },
    { data: structure },
    { data: attendance },
    { data: leaves },
    { data: holidayRows },
  ] = await Promise.all([
      admin
        .from("profiles")
        .select("first_name,last_name,position,department,login_id")
        .eq("id", employeeId)
        .maybeSingle(),
      admin
        .from("salary_structure")
        .select("basic,hra,da,allowance,pf_rate,tax_rate")
        .eq("employee_id", employeeId)
        .maybeSingle(),
      admin
        .from("attendance")
        .select("date,status")
        .eq("employee_id", employeeId)
        .gte("date", period.start)
        .lte("date", period.end),
      admin
        .from("leave_requests")
        .select("from_date,to_date,leave_type,status")
        .eq("employee_id", employeeId)
        .eq("status", "approved")
        .lte("from_date", period.end)
        .gte("to_date", period.start),
      admin
        .from("holidays")
        .select("date,name,kind")
        .gte("date", period.start)
        .lte("date", period.end)
        .neq("kind", "optional"),
    ]);

  if (!profile) return { ok: false, error: "Employee not found." };
  if (!structure) {
    return {
      ok: false,
      error: "This employee has no salary structure, so there is nothing to pay.",
    };
  }

  // Optional/restricted holidays are excluded: they are the employee's to take
  // or not, so they cannot come off everyone's working days.
  const observed = (holidayRows ?? []).filter((h) => !isWeekend(h.date));
  const holidays = new Set(observed.map((h) => h.date));
  const working = workingDays(period, holidays);

  // Only days that were working days can cost anyone pay. The seed has people
  // marked absent on Labour Day and half-day on the company holiday; counting
  // those as loss of pay would dock them twice, since the holiday has already
  // come out of the working-day divisor.
  const isWorkingDay = (d: string) => !isWeekend(d) && !holidays.has(d);

  const rows = (attendance ?? []).filter((r) => isWorkingDay(r.date));
  const absentDays = rows.filter((r) => r.status === "absent").map((r) => r.date);
  const halfDayCount = rows.filter((r) => r.status === "half_day").length;
  const unpaidLeaveDays = (leaves ?? [])
    .filter((l) => l.leave_type === "unpaid")
    .reduce(
      (sum, l) => sum + leaveDaysInPeriod(l.from_date, l.to_date, period, holidays),
      0,
    );

  const lop = lopDays({ absentDays, anomalyDays: [], halfDayCount, unpaidLeaveDays });
  const payable = payableDays(working, lop);

  const components = [
    { code: "BASIC", name: "Basic Salary", full: Number(structure.basic) },
    { code: "HRA", name: "House Rent Allowance", full: Number(structure.hra) },
    { code: "DA", name: "Dearness Allowance", full: Number(structure.da) },
    { code: "ALLOW", name: "Other Allowances", full: Number(structure.allowance) },
  ];

  const earnings: PayslipLine[] = components.map((c) => ({
    ...c,
    prorated: prorate(c.full, working, payable),
  }));

  const gross = round2(earnings.reduce((s, e) => s + e.prorated, 0));
  const basicProrated = earnings.find((e) => e.code === "BASIC")?.prorated ?? 0;

  const pfRate = Number(structure.pf_rate ?? 12);
  const pf = computeDeductions(basicProrated, {
    pf_employee_rate: pfRate,
    pf_employer_rate: pfRate,
    professional_tax: PROFESSIONAL_TAX,
    pf_wage_ceiling: null,
  });
  const taxRate = Number(structure.tax_rate ?? 0);
  const incomeTax = round2((gross * taxRate) / 100);

  const deductions = [
    { code: "PF", name: `Provident Fund (${pfRate}% of Basic)`, amount: pf.pfEmployee },
    { code: "PT", name: "Professional Tax", amount: PROFESSIONAL_TAX },
    ...(incomeTax > 0
      ? [{ code: "TAX", name: `Income Tax (${taxRate}%)`, amount: incomeTax }]
      : []),
  ];

  const totalDeduct = round2(deductions.reduce((s, d) => s + d.amount, 0));
  const netPay = round2(gross - totalDeduct);

  if (params.persist) {
    const { error } = await admin.from("salary_records").upsert(
      {
        employee_id: employeeId,
        month,
        year,
        basic: earnings[0].prorated,
        hra: earnings[1].prorated,
        da: earnings[2].prorated,
        allowance: earnings[3].prorated,
        pf_deduction: pf.pfEmployee,
        tax_deduction: incomeTax,
        other_deduction: PROFESSIONAL_TAX,
        net_pay: netPay,
        status: "processed",
      },
      { onConflict: "employee_id,month,year" },
    );
    if (error) return { ok: false, error: `Could not save the payslip: ${error.message}` };
  }

  return {
    ok: true,
    employeeName: `${profile.first_name} ${profile.last_name}`,
    loginId: profile.login_id ?? "—",
    jobTitle: profile.position ?? "—",
    department: profile.department ?? "—",
    periodStart: period.start,
    periodEnd: period.end,
    reference: `PS-${year}${String(month).padStart(2, "0")}-${employeeId.slice(0, 8).toUpperCase()}`,
    workingDays: working,
    payableDays: payable,
    lopDays: lop,
    breakdown: { absentDays: absentDays.length, halfDays: halfDayCount, unpaidLeaveDays },
    holidays: observed.map((h) => ({ date: h.date, name: h.name })),
    earnings,
    deductions,
    gross,
    totalDeduct,
    netPay,
  };
}
