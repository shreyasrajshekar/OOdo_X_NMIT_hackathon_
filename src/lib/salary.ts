// Public salary API used by the UI.
//
// The arithmetic lives in ./salary/engine — that module is the tested one and
// it reports *why* a structure is invalid (forward references, unknown base
// components, percentages over-allocating the wage, negative balances).
// This file keeps the camelCase shape the components already import and
// adapts it onto the engine.

import { resolve, type ComponentDef, type ComponentError } from "@/lib/salary/engine";
import { round2 } from "@/lib/utils";

export type { ComponentError };

export type SalaryComponent = {
  code: string;
  name: string;
  computation: "fixed" | "percent_of_wage" | "percent_of_component" | "balance";
  percentValue?: number;
  baseComponentCode?: string;
  fixedAmount?: number;
  sequence: number;
};

// Default set from DAYFLOW_BUILD_GUIDE.md Section 5.3 / 6.3.
export const DEFAULT_COMPONENTS: SalaryComponent[] = [
  { code: "BASIC", name: "Basic Salary", computation: "percent_of_wage", percentValue: 50, sequence: 10 },
  { code: "HRA", name: "House Rent Allowance", computation: "percent_of_component", baseComponentCode: "BASIC", percentValue: 50, sequence: 20 },
  { code: "STD", name: "Standard Allowance", computation: "percent_of_wage", percentValue: 4, sequence: 30 },
  { code: "PERF", name: "Performance Bonus", computation: "percent_of_wage", percentValue: 8.33, sequence: 40 },
  { code: "LTA", name: "Leave Travel Allowance", computation: "percent_of_wage", percentValue: 8.33, sequence: 50 },
  { code: "FIXED", name: "Fixed Allowance", computation: "balance", sequence: 99 },
];

function toDef(c: SalaryComponent): ComponentDef {
  return {
    code: c.code,
    name: c.name,
    computation: c.computation,
    percent_value: c.percentValue ?? null,
    base_component_code: c.baseComponentCode ?? null,
    fixed_amount: c.fixedAmount ?? null,
    sequence: c.sequence,
  };
}

/** Amounts only — kept for the existing call sites. */
export function resolveComponents(
  wage: number,
  components: SalaryComponent[] = DEFAULT_COMPONENTS,
): Record<string, number> {
  return resolve(wage, components.map(toDef)).amounts;
}

/** Amounts plus the validation errors the engine found. */
export function resolveComponentsDetailed(
  wage: number,
  components: SalaryComponent[] = DEFAULT_COMPONENTS,
) {
  return resolve(wage, components.map(toDef));
}

export type PayrollConfig = {
  pfEmployeeRate: number;
  pfEmployerRate: number;
  professionalTax: number;
};

export const DEFAULT_PAYROLL_CONFIG: PayrollConfig = {
  pfEmployeeRate: 12,
  pfEmployerRate: 12,
  professionalTax: 200,
};

export function computeDeductions(
  resolved: Record<string, number>,
  config: PayrollConfig = DEFAULT_PAYROLL_CONFIG,
) {
  const basic = resolved.BASIC ?? 0;
  const pfEmployee = round2((basic * config.pfEmployeeRate) / 100);
  const pfEmployer = round2((basic * config.pfEmployerRate) / 100);
  const gross = round2(Object.values(resolved).reduce((sum, v) => sum + v, 0));
  const netPay = round2(gross - pfEmployee - config.professionalTax);

  return { pfEmployee, pfEmployer, professionalTax: config.professionalTax, gross, netPay };
}
