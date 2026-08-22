import { describe, expect, it } from "vitest";
import { resolve, type ComponentDef } from "./engine";

/** The six seeded defaults from Section 5.3. */
function defaults(): ComponentDef[] {
  return [
    { code: "BASIC", name: "Basic Salary", computation: "percent_of_wage", percent_value: 50, base_component_code: null, fixed_amount: null, sequence: 10 },
    { code: "HRA", name: "House Rent Allowance", computation: "percent_of_component", percent_value: 50, base_component_code: "BASIC", fixed_amount: null, sequence: 20 },
    { code: "STD", name: "Standard Allowance", computation: "percent_of_wage", percent_value: 4, base_component_code: null, fixed_amount: null, sequence: 30 },
    { code: "PERF", name: "Performance Bonus", computation: "percent_of_wage", percent_value: 8.33, base_component_code: null, fixed_amount: null, sequence: 40 },
    { code: "LTA", name: "Leave Travel Allowance", computation: "percent_of_wage", percent_value: 8.33, base_component_code: null, fixed_amount: null, sequence: 50 },
    { code: "FIXED", name: "Fixed Allowance", computation: "balance", percent_value: null, base_component_code: null, fixed_amount: null, sequence: 99 },
  ];
}

describe("component resolution (Section 6.3 worked example)", () => {
  it("resolves the spec's ₹50,000 example exactly", () => {
    const r = resolve(50000, defaults());
    expect(r.errors).toEqual([]);
    expect(r.amounts).toEqual({
      BASIC: 25000,
      HRA: 12500,
      STD: 2000,
      PERF: 4165,
      LTA: 4165,
      FIXED: 2170,
    });
    expect(r.gross).toBe(50000);
  });

  it("recomputes live when the wage changes (demo moment 1)", () => {
    const r = resolve(80000, defaults());
    expect(r.amounts.BASIC).toBe(40000);
    expect(r.amounts.HRA).toBe(20000); // 50% of Basic, not of wage
    expect(r.amounts.FIXED).toBeCloseTo(
      80000 - (40000 + 20000 + 3200 + 6664 + 6664),
      2,
    );
    expect(r.gross).toBe(80000);
    expect(r.errors).toEqual([]);
  });
});

describe("validation", () => {
  it("blocks percent edits pushing the total over 100%", () => {
    const comps = [
      { ...defaults()[0], percent_value: 60 },
      { ...defaults()[1], percent_value: 50 }, // HRA 50% of BASIC = 30% of wage
      ...defaults().slice(2),
    ];
    const r = resolve(50000, comps);
    // 60% wage + 4% + 8.33% + 8.33% direct + 30% via BASIC = 110.66%
    expect(r.errors.some((e) => e.message.includes("above 100%"))).toBe(true);
    // The balance component would go negative — it is blocked, not recorded.
    expect(r.amounts.FIXED).toBeUndefined();
  });

  it("rejects forward references to a later-sequence component", () => {
    const comps: ComponentDef[] = [
      { code: "HRA", name: "HRA", computation: "percent_of_component", percent_value: 50, base_component_code: "BASIC", fixed_amount: null, sequence: 10 },
      { code: "BASIC", name: "Basic", computation: "fixed", percent_value: null, base_component_code: null, fixed_amount: 25000, sequence: 20 },
    ];
    const r = resolve(50000, comps);
    expect(r.errors.some((e) => e.message.includes("forward"))).toBe(true);
  });

  it("rejects unknown base component codes", () => {
    const comps: ComponentDef[] = [
      { code: "HRA", name: "HRA", computation: "percent_of_component", percent_value: 50, base_component_code: "NOPE", fixed_amount: null, sequence: 10 },
    ];
    const r = resolve(50000, comps);
    expect(r.errors[0].message).toContain("unknown component");
  });

  it("flags a mismatch when no balance component absorbs the remainder", () => {
    const comps: ComponentDef[] = [
      { code: "BASIC", name: "Basic", computation: "percent_of_wage", percent_value: 50, base_component_code: null, fixed_amount: null, sequence: 10 },
    ];
    const r = resolve(50000, comps);
    expect(r.errors.some((e) => e.message.includes("wage is"))).toBe(true);
  });
});
