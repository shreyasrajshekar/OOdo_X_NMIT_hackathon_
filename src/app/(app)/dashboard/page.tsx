"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/demo-session-provider";
import { Button } from "@/components/ui/button";
import { TimeOffRequestModal } from "@/components/time-off/request-modal";
import {
  LEAVE_TYPES,
  employeeName,
  leaveBalance,
  today,
  type AttendanceRecord,
  type LeaveAllocation,
  type LeaveRequest,
} from "@/lib/mock-data";
import {
  checkInEmployee,
  checkOutEmployee,
  fetchAttendanceRecords,
  fetchLeaveAllocations,
  fetchLeaveRequests,
} from "@/lib/supabase-db";

const BREAK_HOURS = 1;
const FULL_DAY_HOURS = 8;

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatTime(value: string | Date | null) {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  });
}

const STATUS_STYLE: Record<string, string> = {
  approved: "text-success",
  pending: "text-plum",
  rejected: "text-warn",
};

/**
 * The signed-in person's own workspace: their attendance for the month, their
 * leave balances, the check-in control, and their own requests. Admins land on
 * the directory instead — this page is about you, not about the company.
 */
export default function DashboardPage() {
  const { currentEmployee, isAdmin } = useSession();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [actionError, setActionError] = useState("");

  const todayISO = today();
  const monthISO = todayISO.slice(0, 7);

  const load = useCallback(async () => {
    if (!currentEmployee) return;
    try {
      const [att, reqs, allocs] = await Promise.all([
        fetchAttendanceRecords(currentEmployee.id, monthISO),
        fetchLeaveRequests(currentEmployee.id),
        fetchLeaveAllocations(currentEmployee.id),
      ]);
      setRecords(att);
      setRequests(reqs);
      setAllocations(allocs);
    } catch (err) {
      console.error("Could not load your dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [currentEmployee, monthISO]);

  useEffect(() => {
    void load();
  }, [load]);

  const todayRecord = useMemo(
    () => records.find((r) => r.date === todayISO),
    [records, todayISO],
  );
  const checkedIn = Boolean(todayRecord?.checkIn && !todayRecord?.checkOut);

  const stats = useMemo(() => {
    const present = records.filter((r) => r.status === "present").length;
    const half = records.filter((r) => r.status === "half_day").length;
    const absent = records.filter((r) => r.status === "absent").length;
    const onLeave = records.filter((r) => r.status === "leave").length;
    const hours = records.reduce((sum, r) => sum + (r.workHours || 0), 0);
    const extra = records.reduce((sum, r) => sum + (r.extraHours || 0), 0);
    return { present, half, absent, onLeave, hours, extra };
  }, [records]);

  const balances = useMemo(
    () =>
      LEAVE_TYPES.map((type) => ({
        type,
        ...leaveBalance(currentEmployee.id, type.code, allocations, requests),
      })),
    [currentEmployee.id, allocations, requests],
  );

  const ownRequests = useMemo(
    () =>
      [...requests]
        .filter((r) => r.employeeId === currentEmployee.id)
        .sort((a, b) => b.startDate.localeCompare(a.startDate))
        .slice(0, 8),
    [requests, currentEmployee.id],
  );

  const pendingCount = requests.filter(
    (r) => r.employeeId === currentEmployee.id && r.status === "pending",
  ).length;

  async function toggleCheckIn() {
    setBusy(true);
    setActionError("");
    try {
      const result =
        checkedIn && todayRecord?.checkIn
          ? await checkOutEmployee(
              currentEmployee.id,
              todayISO,
              Math.max(
                0,
                (Date.now() - new Date(todayRecord.checkIn).getTime()) / 3600000 -
                  BREAK_HOURS,
              ),
              Math.max(
                0,
                (Date.now() - new Date(todayRecord.checkIn).getTime()) / 3600000 -
                  BREAK_HOURS -
                  FULL_DAY_HOURS,
              ),
            )
          : await checkInEmployee(currentEmployee.id, todayISO);

      if (!result.ok) {
        setActionError(result.error ?? "That didn't save. Please try again.");
        return;
      }

      await load();
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="animate-pulse font-display text-sm font-semibold text-ink/70">
          Loading your workspace…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-plum">
            {currentEmployee.loginId} · {currentEmployee.department}
          </p>
          <h1 className="mt-2 font-display text-[30px] font-extrabold tracking-tight text-ink">
            {greeting()}, {currentEmployee.firstName}.
          </h1>
          <p className="mt-1 font-body text-[15px] text-ink/70">
            {currentEmployee.jobTitle} · reporting to {currentEmployee.manager}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setModalOpen(true)}>
            Apply for leave
          </Button>
          <Link href="/me">
            <Button variant="secondary">My profile</Button>
          </Link>
        </div>
      </header>

      {actionError && (
        <div
          role="alert"
          className="rounded-card border border-warn/30 bg-warn/10 p-3 font-display text-sm text-warn"
        >
          {actionError}
        </div>
      )}

      {/* Check in / out */}
      <section className="flex flex-wrap items-center justify-between gap-6 rounded-card border border-line bg-paper/70 p-6">
        <div className="flex items-center gap-4">
          <span
            className={`h-3 w-3 shrink-0 rounded-pill ${
              checkedIn ? "bg-success" : "bg-warn"
            }`}
            aria-hidden
          />
          <div>
            <p className="font-display text-sm font-semibold text-ink">
              {checkedIn
                ? `Checked in since ${formatTime(todayRecord?.checkIn ?? null)}`
                : todayRecord?.checkOut
                  ? `Checked out at ${formatTime(todayRecord.checkOut)}`
                  : "Not checked in today"}
            </p>
            <p className="mt-0.5 font-body text-[15px] text-ink/70">
              {todayRecord?.workHours
                ? `${todayRecord.workHours.toFixed(1)} h logged today`
                : "Your hours today feed straight into payroll."}
            </p>
          </div>
        </div>
        <Button onClick={toggleCheckIn} disabled={busy}>
          {busy ? "Saving…" : checkedIn ? "Check out" : "Check in"}
        </Button>
      </section>

      {/* This month */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-plum">
          This month
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
          <Stat label="Days present" value={stats.present} />
          <Stat
            label="Hours logged"
            value={stats.hours.toFixed(1)}
            hint={stats.extra > 0 ? `${stats.extra.toFixed(1)} h extra` : undefined}
          />
          <Stat label="Days on leave" value={stats.onLeave} />
          <Stat
            label="Absent"
            value={stats.absent}
            tone={stats.absent > 0 ? "warn" : "default"}
          />
        </div>
      </section>

      {/* Leave balances */}
      <section>
        <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-plum">
          Leave balance
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {balances.map(({ type, allocated, taken, available }) => (
            <div
              key={type.code}
              className="rounded-card border border-line p-5"
            >
              <p className="font-display text-sm font-semibold text-ink">
                {type.name}
              </p>
              <p className="mt-2 font-display text-[30px] font-extrabold tabular-nums text-primary">
                {available}
                <span className="ml-1 font-display text-sm font-semibold text-ink/50">
                  / {allocated} days
                </span>
              </p>
              <div className="mt-3 h-1.5 w-full overflow-hidden rounded-pill bg-line">
                <div
                  className="h-full rounded-pill bg-plum"
                  style={{
                    width: `${allocated > 0 ? Math.min(100, (taken / allocated) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="mt-2 font-body text-[15px] text-ink/70">
                {taken} taken
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Own requests */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-[10px] uppercase tracking-[0.18em] text-plum">
            My time off requests
            {pendingCount > 0 && ` · ${pendingCount} pending`}
          </h2>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="font-display text-sm font-semibold text-primary hover:underline"
          >
            New request
          </button>
        </div>

        {ownRequests.length === 0 ? (
          <div className="mt-3 flex flex-col items-center gap-2 rounded-card border border-dashed border-line py-12 text-center">
            <p className="font-display text-sm font-semibold text-ink">
              No requests yet.
            </p>
            <p className="font-body text-[15px] text-ink/70">
              Apply for leave and it lands with your manager for approval.
            </p>
          </div>
        ) : (
          <div className="mt-3 overflow-hidden rounded-card border border-line">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line bg-line/50">
                  {["Type", "Dates", "Days", "Status"].map((col) => (
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
                  const type = LEAVE_TYPES.find(
                    (t) => t.code === request.leaveType,
                  );
                  return (
                    <tr key={request.id} className="border-b border-line/60">
                      <td className="px-4 py-3 font-display text-sm text-ink">
                        {type?.name ?? request.leaveType}
                      </td>
                      <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                        {formatDate(request.startDate)} –{" "}
                        {formatDate(request.endDate)}
                      </td>
                      <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                        {request.dayCount}
                      </td>
                      <td
                        className={`px-4 py-3 font-mono text-[11px] uppercase tracking-[0.12em] ${
                          STATUS_STYLE[request.status] ?? "text-ink"
                        }`}
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
      </section>

      {isAdmin && (
        <p className="font-body text-[15px] text-ink/60">
          You&apos;re an admin — the company-wide views live under{" "}
          <Link href="/employees" className="font-semibold text-primary">
            Employees
          </Link>
          .
        </p>
      )}

      <TimeOffRequestModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        employee={currentEmployee}
        onSubmit={(request) => setRequests((current) => [...current, request])}
      />
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className="rounded-card border border-line p-5">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-plum">
        {label}
      </p>
      <p
        className={`mt-2 font-display text-[30px] font-extrabold tabular-nums ${
          tone === "warn" ? "text-warn" : "text-ink"
        }`}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-1 font-body text-[15px] text-ink/70">{hint}</p>
      )}
    </div>
  );
}
