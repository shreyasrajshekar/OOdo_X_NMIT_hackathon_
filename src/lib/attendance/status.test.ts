import { describe, expect, it } from "vitest";
import { deriveStatus, dotForStatus } from "./status";

const base = { isWeekend: false, isHoliday: false, approvedLeave: false };

describe("status derivation", () => {
  it("holiday and weekend win first", () => {
    expect(deriveStatus({ ...base, isHoliday: true })).toBe("holiday");
    expect(deriveStatus({ ...base, isWeekend: true })).toBe("weekend");
  });

  it("approved leave beats a missing attendance row", () => {
    expect(deriveStatus({ ...base, approvedLeave: true })).toBe("leave");
  });

  it("full day present", () => {
    expect(
      deriveStatus({
        ...base,
        row: { check_in: "x", hours_worked: 8.5 },
      }),
    ).toBe("present");
  });

  it("half day between four and standard hours", () => {
    expect(
      deriveStatus({
        ...base,
        row: { check_in: "x", hours_worked: 5 },
      }),
    ).toBe("half_day");
  });

  it("no row on a working day is absent", () => {
    expect(deriveStatus(base)).toBe("absent");
  });
});

describe("dot vocabulary", () => {
  it("maps statuses to dots; weekends and holidays show nothing", () => {
    expect(dotForStatus("present")).toBe("present");
    expect(dotForStatus("half_day")).toBe("present");
    expect(dotForStatus("leave")).toBe("leave");
    expect(dotForStatus("absent")).toBe("absent");
    expect(dotForStatus("weekend")).toBeNull();
    expect(dotForStatus("holiday")).toBeNull();
  });
});

describe("missed check-out", () => {
  it("counts as present rather than absent when hours_worked is null", () => {
    expect(
      deriveStatus({ ...base, row: { check_in: "x", hours_worked: null } }),
    ).toBe("present");
  });
});
