"use client";

import { useEffect, useMemo, useState } from "react";
import { useDemoSession } from "@/components/demo-session-provider";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { AllocationPanel } from "@/components/time-off/allocation-panel";
import { TimeOffRequestModal } from "@/components/time-off/request-modal";
import { CalendarLegend, YearCalendar } from "@/components/time-off/year-calendar";
import {
  EMPLOYEES,
  HOLIDAYS,
  LEAVE_TYPES,
  employeeName,
  leaveBalance,
  type LeaveAllocation,
  type LeaveRequest,
  type RequestStatus,
} from "@/lib/mock-data";
import { fetchLeaveRequests, fetchLeaveAllocations, updateLeaveRequestStatus } from "@/lib/supabase-db";

const STATUS_STYLE: Record<RequestStatus, string> = {
  approved: "text-success",
  pending: "text-plum",
  rejected: "text-warn",
};

function AdminTimeOff() {
  const { currentEmployee } = useDemoSession();
  const [tab, setTab] = useState<"requests" | "allocation">("requests");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [reqs, allocs] = await Promise.all([
          fetchLeaveRequests(),
          fetchLeaveAllocations(currentEmployee.id)
        ]);
        setRequests(reqs);
        setAllocations(allocs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentEmployee]);

  async function review(id: string, status: "approved" | "rejected") {
    setRequests((current) => current.map((r) => (r.id === id ? { ...r, status } : r)));
    await updateLeaveRequestStatus(id, status, currentEmployee.id);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="font-display text-sm font-semibold text-ink/70 animate-pulse">
          Loading requests...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        active={tab}
        onChange={(key) => setTab(key as "requests" | "allocation")}
        tabs={[
          { key: "requests", label: "Time Off" },
          { key: "allocation", label: "Allocation" },
        ]}
      />

      {tab === "requests" ? (
        <div className="overflow-hidden rounded-card border border-line">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line bg-line/60">
                {["Name", "Start Date", "End Date", "Type", "Status", "Actions"].map((col) => (
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
              {requests.map((request) => {
                const employee = EMPLOYEES.find((e) => e.id === request.employeeId);
                const type = LEAVE_TYPES.find((t) => t.code === request.leaveType);
                return (
                  <tr key={request.id} className="border-b border-line/60">
                    <td className="px-4 py-3 font-display text-sm text-ink">
                      {employee ? employeeName(employee) : request.employeeId}
                    </td>
                    <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                      {request.startDate}
                    </td>
                    <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                      {request.endDate}
                    </td>
                    <td className="px-4 py-3 font-display text-sm text-ink">
                      {type?.name ?? request.leaveType}
                    </td>
                    <td
                      className={`px-4 py-3 font-display text-sm font-semibold capitalize ${STATUS_STYLE[request.status]}`}
                    >
                      {request.status}
                    </td>
                    <td className="px-4 py-3">
                      {request.status === "pending" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => review(request.id, "approved")}
                            className="rounded-pill bg-success/15 px-3 py-1 font-display text-xs font-semibold text-success"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => review(request.id, "rejected")}
                            className="rounded-pill bg-warn/15 px-3 py-1 font-display text-xs font-semibold text-warn"
                          >
                            Reject
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-ink/40">
                          Reviewed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <AllocationPanel
          allocations={allocations}
          onGrant={(a) => setAllocations((current) => [...current, a])}
        />
      )}
    </div>
  );
}

function EmployeeTimeOff() {
  const { currentEmployee } = useDemoSession();
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    if (!currentEmployee) return;
    async function loadData() {
      try {
        const [reqs, allocs] = await Promise.all([
          fetchLeaveRequests(currentEmployee.id),
          fetchLeaveAllocations(currentEmployee.id)
        ]);
        setRequests(reqs);
        setAllocations(allocs);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentEmployee]);

  const ownRequests = useMemo(
    () => requests.filter((r) => r.employeeId === currentEmployee.id),
    [currentEmployee, requests],
  );

  const paidBalance = useMemo(
    () => leaveBalance(currentEmployee.id, "PAID", allocations, requests),
    [currentEmployee, allocations, requests]
  );
  const sickBalance = useMemo(
    () => leaveBalance(currentEmployee.id, "SICK", allocations, requests),
    [currentEmployee, allocations, requests]
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="font-display text-sm font-semibold text-ink/70 animate-pulse">
          Loading dashboard...
        </p>
      </div>
    );
  }


  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="grid grid-cols-2 gap-4">
          <div className="rounded-card border border-line p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
              Paid available
            </p>
            <p className="mt-2 font-display text-[30px] font-extrabold tabular-nums text-ink">
              {paidBalance.available}
            </p>
          </div>
          <div className="rounded-card border border-line p-6">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
              Sick available
            </p>
            <p className="mt-2 font-display text-[30px] font-extrabold tabular-nums text-ink">
              {sickBalance.available}
            </p>
          </div>
        </div>
        <Button onClick={() => setModalOpen(true)}>New request</Button>
      </div>

      {ownRequests.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line py-16 text-center">
          <p className="font-display text-sm font-semibold text-ink">
            No time off yet.
          </p>
          <p className="font-body text-[15px] text-ink/70">
            Apply for your first leave.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-line">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line bg-line/60">
                {["Type", "Start", "End", "Days", "Status"].map((col) => (
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
              {ownRequests.map((request) => {
                const type = LEAVE_TYPES.find((t) => t.code === request.leaveType);
                return (
                  <tr key={request.id} className="border-b border-line/60">
                    <td className="px-4 py-3 font-display text-sm text-ink">
                      {type?.name ?? request.leaveType}
                    </td>
                    <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                      {request.startDate}
                    </td>
                    <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                      {request.endDate}
                    </td>
                    <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                      {request.dayCount}
                    </td>
                    <td
                      className={`px-4 py-3 font-display text-sm font-semibold capitalize ${STATUS_STYLE[request.status]}`}
                    >
                      {request.status}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_220px]">
        <YearCalendar year={2026} requests={ownRequests} />
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-2 font-display text-sm font-semibold text-ink">
              Legend
            </p>
            <CalendarLegend />
          </div>
          <div>
            <p className="mb-2 font-display text-sm font-semibold text-ink">
              Holidays
            </p>
            <ul className="flex flex-col gap-1">
              {HOLIDAYS.map((holiday) => (
                <li
                  key={holiday.date}
                  className="flex items-center justify-between gap-2 font-body text-[13px] text-ink/70"
                >
                  <span>{holiday.name}</span>
                  <span className="font-mono text-[10px] tabular-nums text-ink/50">
                    {holiday.date}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <TimeOffRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        employee={currentEmployee}
        onSubmit={(request) => setRequests((current) => [...current, request])}
      />
    </div>
  );
}

export default function TimeOffPage() {
  const { role } = useDemoSession();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">
          Time Off
        </h1>
        <p className="mt-1 font-body text-[15px] text-ink/70">
          {role === "admin"
            ? "Review requests and manage leave allocations."
            : "Apply for leave and track your balance."}
        </p>
      </div>

      {role === "admin" ? <AdminTimeOff /> : <EmployeeTimeOff />}
    </div>
  );
}
