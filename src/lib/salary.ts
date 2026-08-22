export type SalaryComponent = {
  code: string;
  name: string;
  computation: "percent_of_wage" | "percent_of_component" | "balance";
  percentValue?: number;
  baseComponentCode?: string;
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

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function resolveComponents(
  wage: number,
  components: SalaryComponent[] = DEFAULT_COMPONENTS,
): Record<string, number> {
  const resolved: Record<string, number> = {};
  const ordered = [...components].sort((a, b) => a.sequence - b.sequence);

  for (const component of ordered) {
    let amount = 0;
    switch (component.computation) {
      case "percent_of_wage":
        amount = (wage * (component.percentValue ?? 0)) / 100;
        break;
      case "percent_of_component":
        amount =
          ((resolved[component.baseComponentCode ?? ""] ?? 0) *
            (component.percentValue ?? 0)) /
          100;
        break;
      case "balance":
        amount = wage - Object.values(resolved).reduce((sum, v) => sum + v, 0);
        break;
    }
    resolved[component.code] = round2(amount);
  }

  return resolved;
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
