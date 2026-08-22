"use client";

import { useMemo, useState } from "react";
import {
  DEFAULT_COMPONENTS,
  computeDeductions,
  resolveComponents,
} from "@/lib/salary";
import type { Employee } from "@/lib/mock-data";
import { updateSalaryWageInDb } from "@/lib/supabase-db";

const currency = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
});

export function SalaryInfoPanel({
  employee,
  editable,
}: {
  employee: Employee;
  editable: boolean;
}) {
  const [wage, setWage] = useState(employee.monthlyWage);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const resolved = useMemo(() => resolveComponents(wage), [wage]);
  const deductions = useMemo(() => computeDeductions(resolved), [resolved]);

  const hasChanged = wage !== employee.monthlyWage;

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const success = await updateSalaryWageInDb(employee.id, wage);
      if (!success) throw new Error("Database update returned failure");

      employee.monthlyWage = wage; // Update in-memory reference
      setSaved(true);
    } catch (e) {
      console.error("Failed to save wage to Supabase:", e);
    } finally {
      setSaving(false);
    }
  }


  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div className="rounded-card border border-line p-6">
        <h2 className="font-display text-lg font-bold text-ink">Wage</h2>
        <div className="mt-4 flex flex-col gap-4">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
              Wage type
            </p>
            <p className="font-display text-sm text-ink">Fixed</p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
              Monthly wage
            </p>
            {editable ? (
              <div className="flex flex-col gap-2">
                <input
                  type="number"
                  min={0}
                  value={wage}
                  disabled={saving}
                  onChange={(e) => {
                    setWage(Number(e.target.value) || 0);
                    setSaved(false);
                  }}
                  className="mt-1 w-full rounded-card border border-line px-3 py-2 font-display text-sm tabular-nums text-ink outline-none focus:border-plum"
                />
                {hasChanged && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="mt-1 rounded bg-primary py-1 px-3 font-display text-xs font-semibold text-paper hover:bg-primary/90"
                  >
                    {saving ? "Saving..." : "Save changes"}
                  </button>
                )}
                {saved && (
                  <p className="font-display text-xs text-success font-semibold">
                    Saved successfully
                  </p>
                )}
              </div>
            ) : (

              <p className="font-display text-sm tabular-nums text-ink">
                {currency.format(wage)}
              </p>
            )}
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
              Yearly wage
            </p>
            <p className="font-display text-sm tabular-nums text-ink">
              {currency.format(wage * 12)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
              Working days / week
            </p>
            <p className="font-display text-sm tabular-nums text-ink">
              {employee.workingDaysPerWeek}
            </p>
          </div>
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
              Break hours
            </p>
            <p className="font-display text-sm tabular-nums text-ink">
              {employee.breakHours}
            </p>
          </div>
        </div>
      </div>

      <div className="rounded-card border border-line p-6">
        <h2 className="font-display text-lg font-bold text-ink">
          Components
        </h2>
        <table className="mt-4 w-full text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="py-2 font-display text-xs font-semibold text-ink/60">
                Component
              </th>
              <th className="py-2 text-right font-display text-xs font-semibold text-ink/60">
                Amount
              </th>
            </tr>
          </thead>
          <tbody>
            {DEFAULT_COMPONENTS.map((component) => (
              <tr key={component.code} className="border-b border-line/60">
                <td className="py-2 font-display text-sm text-ink">
                  {component.name}
                </td>
                <td className="py-2 text-right font-display text-sm tabular-nums text-ink">
                  {currency.format(resolved[component.code] ?? 0)}
                </td>
              </tr>
            ))}
            <tr>
              <td className="pt-3 font-display text-sm font-semibold text-ink">
                Gross
              </td>
              <td className="pt-3 text-right font-display text-sm font-semibold tabular-nums text-ink">
                {currency.format(deductions.gross)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="rounded-card border border-line p-6">
        <h2 className="font-display text-lg font-bold text-ink">
          Deductions
        </h2>
        <div className="mt-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="font-display text-sm text-ink/70">
              PF (employee, 12% of Basic)
            </span>
            <span className="font-display text-sm tabular-nums text-ink">
              {currency.format(deductions.pfEmployee)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-display text-sm text-ink/70">
              PF (employer, not deducted)
            </span>
            <span className="font-display text-sm tabular-nums text-ink/50">
              {currency.format(deductions.pfEmployer)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-display text-sm text-ink/70">
              Professional tax
            </span>
            <span className="font-display text-sm tabular-nums text-ink">
              {currency.format(deductions.professionalTax)}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
            <span className="font-display text-sm font-semibold text-ink">
              Net pay
            </span>
            <span className="font-display text-sm font-semibold tabular-nums text-success">
              {currency.format(deductions.netPay)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
