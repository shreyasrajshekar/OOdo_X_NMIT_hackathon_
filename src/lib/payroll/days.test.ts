import { describe, expect, it } from "vitest";
import {
  computeDeductions,
  lopDays,
  payableDays,
  prorate,
  workingDays,
} from "./days";

describe("working days (Section 6.5)", () => {
  it("excludes weekends and holidays", () => {
    // Mon 2026-08-03 .. Sun 2026-08-09 : 5 working days
    const n = workingDays(
      { start: "2026-08-03", end: "2026-08-09" },
      new Set(["2026-08-05"]),
    );
    expect(n).toBe(4); // 5 minus one holiday
  });
});

describe("LOP (Section 6.5)", () => {
  it("counts half days as 0.5 and adds unpaid + anomalies + absences", () => {
    const lop = lopDays({
      absentDays: ["2026-08-04"],
      anomalyDays: ["2026-08-05", "2026-08-06"],
      halfDayCount: 2,
      unpaidLeaveDays: 1,
    });
    expect(lop).toBe(5); // 1 + 2 + 1 + 1
  });

  it("payable days never go negative", () => {
    expect(payableDays(22, 25)).toBe(0);
    expect(payableDays(22, 3)).toBe(19);
  });

  it("prorates per working day", () => {
    expect(prorate(22000, 22, 19)).toBe(19000);
  });
});

describe("deductions (Section 6.3)", () => {
  it("caps PF wage at the ceiling and excludes employer share from net", () => {
    const cfg = {
      pf_employee_rate: 12,
      pf_employer_rate: 12,
      professional_tax: 200,
      pf_wage_ceiling: 15000,
    };
    const d = computeDeductions(25000, cfg);
    expect(d.pfEmployeeWage).toBe(15000); // capped
    expect(d.pfEmployee).toBe(1800);
    expect(d.pfEmployer).toBe(1800);
    expect(d.total).toBe(2000);

    const d2 = computeDeductions(10000, cfg);
    expect(d2.pfEmployeeWage).toBe(10000); // under ceiling
    expect(d2.pfEmployee).toBe(1200);
  });
});
