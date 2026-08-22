"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import {
  EMPLOYEES,
  LEAVE_TYPES,
  employeeName,
  type LeaveAllocation,
  type LeaveTypeCode,
} from "@/lib/mock-data";

const ALLOCATABLE_TYPES = LEAVE_TYPES.filter((t) => t.isPaid);

export function AllocationPanel({
  allocations,
  onGrant,
}: {
  allocations: LeaveAllocation[];
  onGrant: (allocation: LeaveAllocation) => void;
}) {
  const [employeeId, setEmployeeId] = useState(EMPLOYEES[0].id);
  const [leaveType, setLeaveType] = useState<LeaveTypeCode>("PAID");
  const [days, setDays] = useState("24");
  const [validFrom, setValidFrom] = useState("2026-01-01");
  const [validTo, setValidTo] = useState("2026-12-31");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onGrant({
      id: `alloc-${employeeId}-${leaveType}-${Date.now()}`,
      employeeId,
      leaveType,
      days: Number(days) || 0,
      validFrom,
      validTo,
    });
  }

  return (
    <div className="flex flex-col gap-8">
      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 gap-4 rounded-card border border-line p-6 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
      >
        <Field label="Employee">
          <select
            className={inputClass}
            value={employeeId}
            onChange={(e) => setEmployeeId(e.target.value)}
          >
            {EMPLOYEES.map((e) => (
              <option key={e.id} value={e.id}>
                {employeeName(e)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Leave type">
          <select
            className={inputClass}
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as LeaveTypeCode)}
          >
            {ALLOCATABLE_TYPES.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Days">
          <input
            type="number"
            min={0}
            step={0.5}
            className={inputClass}
            value={days}
            onChange={(e) => setDays(e.target.value)}
          />
        </Field>
        <Field label="Valid from">
          <input
            type="date"
            className={inputClass}
            value={validFrom}
            onChange={(e) => setValidFrom(e.target.value)}
          />
        </Field>
        <Field label="Valid to">
          <input
            type="date"
            className={inputClass}
            value={validTo}
            onChange={(e) => setValidTo(e.target.value)}
          />
        </Field>
        <div className="lg:col-span-5">
          <Button type="submit">Allocate days</Button>
        </div>
      </form>

      <div className="overflow-hidden rounded-card border border-line">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line bg-line/60">
              {["Employee", "Type", "Days", "Valid from", "Valid to"].map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 font-display text-sm font-semibold text-ink"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allocations.map((allocation) => {
              const employee = EMPLOYEES.find((e) => e.id === allocation.employeeId);
              return (
                <tr key={allocation.id} className="border-b border-line/60">
                  <td className="px-4 py-3 font-display text-sm text-ink">
                    {employee ? employeeName(employee) : allocation.employeeId}
                  </td>
                  <td className="px-4 py-3 font-display text-sm text-ink">
                    {allocation.leaveType}
                  </td>
                  <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                    {allocation.days}
                  </td>
                  <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                    {allocation.validFrom}
                  </td>
                  <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                    {allocation.validTo}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
