"use client";

import { use } from "react";
import { useDemoSession } from "@/components/demo-session-provider";
import { SalaryInfoPanel } from "@/components/employees/salary-info-panel";
import { employeeName, getEmployee } from "@/lib/mock-data";

export default function PayrollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { role } = useDemoSession();
  const employee = getEmployee(id);

  if (!employee) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line py-24 text-center">
        <p className="font-display text-sm font-semibold text-ink">
          Employee not found.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
          {employee.loginId}
        </p>
        <h1 className="mt-1 font-display text-[30px] font-extrabold tracking-tight text-ink">
          Salary Info — {employeeName(employee)}
        </h1>
      </div>

      <SalaryInfoPanel employee={employee} editable={role === "admin"} />
    </div>
  );
}
