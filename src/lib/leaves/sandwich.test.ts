import { describe, expect, it } from "vitest";
import { countLeaveDays, sickNeedsAttachment } from "./sandwich";

const NO_HOLIDAYS = new Set<string>();

describe("day count excludes weekends and holidays (Section 6.6)", () => {
  it("Mon..Fri = 5, Mon..Sun = 5", () => {
    // 2026-08-03 is a Monday
    expect(
      countLeaveDays("2026-08-03", "2026-08-07", { holidays: NO_HOLIDAYS, sandwich: false }).total,
    ).toBe(5);
    expect(
      countLeaveDays("2026-08-03", "2026-08-09", { holidays: NO_HOLIDAYS, sandwich: false }).total,
    ).toBe(5);
  });

  it("holidays inside the window are free", () => {
    expect(
      countLeaveDays("2026-08-03", "2026-08-07", {
        holidays: new Set(["2026-08-05"]),
        sandwich: false,
      }).total,
    ).toBe(4);
  });
});

describe("sandwich rule", () => {
  it("counts the weekend between two flanking working days when enabled", () => {
    // Fri 07 .. Mon 10 Aug 2026: Fri+Mon working, Sat/Sun sandwiched.
    const off = countLeaveDays("2026-08-07", "2026-08-10", {
      holidays: NO_HOLIDAYS,
      sandwich: false,
    });
    expect(off.total).toBe(2);

    const on = countLeaveDays("2026-08-07", "2026-08-10", {
      holidays: NO_HOLIDAYS,
      sandwich: true,
    });
    expect(on.plainWorkingDays).toBe(2);
    expect(on.sandwichExtra).toBe(2);
    expect(on.total).toBe(4);
  });

  it("does not sandwich trailing non-working days at window edges", () => {
    // Sat .. Sun only: no working day on either side, nothing counts.
    const r = countLeaveDays("2026-08-08", "2026-08-09", {
      holidays: NO_HOLIDAYS,
      sandwich: true,
    });
    expect(r.total).toBe(0);
  });
});

describe("sick certificate rule (Section 6.6)", () => {
  it("requires attachment beyond two days", () => {
    expect(sickNeedsAttachment(2)).toBe(false);
    expect(sickNeedsAttachment(3)).toBe(true);
  });
});
