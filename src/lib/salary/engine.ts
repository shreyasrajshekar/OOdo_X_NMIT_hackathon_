// Section 6.3 — salary component resolution.
// Pure, unit-testable. Mirrored by the DB balance trigger in migrations;
// this module drives the live editor and payslip generation.

import { round2 } from "@/lib/utils";

export type ComputationType =
  | "fixed"
  | "percent_of_wage"
  | "percent_of_component"
  | "balance";

export interface ComponentDef {
  id?: string;
  structure_id?: string;
  code: string;
  name: string;
  computation: ComputationType;
  percent_value: number | null; // when percent_*
  base_component_code: string | null; // when percent_of_component
  fixed_amount: number | null; // when fixed
  sequence: number;
}

export interface Resolution {
  amounts: Record<string, number>; // code -> computed amount, rounded to 2dp
  gross: number;
  errors: ComponentError[];
}

export interface ComponentError {
  code: string;
  message: string;
}

const EPS = 0.01;

/**
 * resolve(wage, components) — Section 6.3.
 * Dependency graph resolved in `sequence` order:
 *   fixed                -> fixed_amount
 *   percent_of_wage      -> wage * percent / 100
 *   percent_of_component -> resolved[base] * percent / 100 (no forward refs)
 *   balance              -> wage - sum(resolved)
 */
export function resolve(wage: number, components: ComponentDef[]): Resolution {
  const errors: ComponentError[] = [];
  const amounts: Record<string, number> = {};
  const sorted = [...components].sort((a, b) => a.sequence - b.sequence);

  // Percent-of-wage budget: the sum must never exceed the wage.
  let pctOfWageSum = 0;
  for (const c of sorted) {
    if (c.computation === "percent_of_wage" && c.percent_value != null) {
      pctOfWageSum += c.percent_value;
    } else if (
      c.computation === "percent_of_component" &&
      c.base_component_code != null &&
      c.percent_value != null
    ) {
      const base = components.find((x) => x.code === c.base_component_code);
      if (!base) {
        errors.push({
          code: c.code,
          message: `${c.code} references unknown component ${c.base_component_code}.`,
        });
        continue;
      }
      if (base.computation === "percent_of_wage") {
        pctOfWageSum +=
          (base.percent_value ?? 0) * (c.percent_value / 100);
      }
    }
  }
  if (pctOfWageSum > 100 + EPS) {
    const offender = [...sorted]
      .reverse()
      .find(
        (c) =>
          (c.computation === "percent_of_wage" ||
            c.computation === "percent_of_component") &&
          c.percent_value != null,
      );
    errors.push({
      code: offender?.code ?? "%",
      message: `Percentages total ${round2(pctOfWageSum)}% of wage — above 100%. Reduce ${offender?.code ?? "a component"}.`,
    });
  }

  let sum = 0;
  for (const c of sorted) {
    let amount = 0;
    switch (c.computation) {
      case "fixed":
        amount = c.fixed_amount ?? 0;
        break;
      case "percent_of_wage": {
        amount = wage * (c.percent_value ?? 0) / 100;
        break;
      }
      case "percent_of_component": {
        const baseDef = components.find((x) => x.code === c.base_component_code);
        if (!baseDef) {
          errors.push({
            code: c.code,
            message: `${c.name} references unknown component ${c.base_component_code}.`,
          });
          continue;
        }
        // No forward references: base must appear strictly before this component.
        if (baseDef.sequence >= c.sequence) {
          errors.push({
            code: c.code,
            message: `${c.code} references ${c.base_component_code}, which resolves later. Components cannot forward-reference.`,
          });
          continue;
        }
        const base = amounts[c.base_component_code ?? ""];
        if (base === undefined) {
          errors.push({
            code: c.code,
            message: `${c.name} depends on ${c.base_component_code}, which is not resolvable.`,
          });
          continue;
        }
        amount = base * (c.percent_value ?? 0) / 100;
        break;
      }
      case "balance": {
        amount = wage - sum;
        break;
      }
    }

    amount = round2(amount);
    if (amount < -EPS) {
      errors.push({
        code: c.code,
        message: `${c.name} computes to a negative amount (${amount}). The percentages above it over-allocate the wage.`,
      });
      continue;
    }

    amounts[c.code] = amount;
    sum += amount;
  }

  const gross = round2(sum);
  if (Math.abs(gross - wage) > EPS && !errors.some((e) => e.message.includes("negative"))) {
    errors.push({
      code: "*",
      message: `Components total ₹${gross.toLocaleString("en-IN")} but the wage is ₹${wage.toLocaleString("en-IN")}. The difference is ₹${(wage - gross).toLocaleString("en-IN")}.`,
    });
  }

  return { amounts, gross, errors };
}
