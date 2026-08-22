"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/demo-session-provider";
import { AdminGuard } from "@/components/admin-guard";
import { Button } from "@/components/ui/button";
import { Tabs } from "@/components/ui/tabs";
import { AllocationPanel } from "@/components/time-off/allocation-panel";
import { TimeOffRequestModal } from "@/components/time-off/request-modal";
import { CalendarLegend, YearCalendar } from "@/components/time-off/year-calendar";
import {
  HOLIDAYS,
  LEAVE_TYPES,
  employeeInitials,
  employeeName,
  type Employee,
  leaveBalance,
  type LeaveAllocation,
  type LeaveRequest,
  type RequestStatus,
} from "@/lib/mock-data";
import {
  EmptyState,
  FilterSelect,
  PageHeader,
  PersonCell,
  ResultLine,
  Row,
  SearchInput,
  StatusPill,
  SummaryTile,
  TableShell,
  Toolbar,
  type Tone,
} from "@/components/ui/data-ui";
import { fetchEmployees, fetchLeaveRequests, fetchLeaveAllocations, updateLeaveRequestStatus } from "@/lib/supabase-db";

/** Employee-side table still styles status as text. */
const STATUS_STYLE: Record<RequestStatus, string> = {
  approved: "text-success",
  pending: "text-plum",
  rejected: "text-warn",
};

const STATUS_TONE: Record<RequestStatus, Tone> = {
  approved: "success",
  pending: "plum",
  rejected: "warn",
};

function formatRange(start: string, end: string) {
  const fmt = (iso: string) =>
    new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
    });
  return start === end ? fmt(start) : `${fmt(start)} – ${fmt(end)}`;
}

function AdminTimeOff() {
  const { currentEmployee } = useSession();
  const [tab, setTab] = useState<"requests" | "allocation">("requests");
  const [requests, setRequests] = useState<LeaveRequest[]>([]);
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [roster, setRoster] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RequestStatus>(
    "pending",
  );
  const [typeFilter, setTypeFilter] = useState("all");

  useEffect(() => {
    async function loadData() {
      try {
        const [reqs, allocs, people] = await Promise.all([
          fetchLeaveRequests(),
          fetchLeaveAllocations(currentEmployee.id),
          fetchEmployees(),
        ]);
        setRequests(reqs);
        setAllocations(allocs);
        setRoster(people);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentEmployee]);

  async function review(id: string, status: "approved" | "rejected") {
    setBusyId(id);
    const previous = requests;
    setRequests((current) =>
      current.map((r) => (r.id === id ? { ...r, status } : r)),
    );

    const ok = await updateLeaveRequestStatus(id, status, currentEmployee.id);
    if (!ok) setRequests(previous); // put it back rather than lie about it
    setBusyId(null);
  }

  const counts = useMemo(() => {
    const tally = { pending: 0, approved: 0, rejected: 0, days: 0 };
    for (const request of requests) {
      tally[request.status] += 1;
      if (request.status === "pending") tally.days += request.dayCount;
    }
    return tally;
  }, [requests]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return requests
      .map((request) => ({
        request,
        employee: roster.find((e) => e.id === request.employeeId),
      }))
      .filter(({ request, employee }) => {
        if (statusFilter !== "all" && request.status !== statusFilter)
          return false;
        if (typeFilter !== "all" && request.leaveType !== typeFilter)
          return false;
        if (!query) return true;
        return [
          employee ? employeeName(employee) : request.employeeId,
          employee?.loginId ?? "",
          request.remarks ?? "",
        ]
          .join(" ")
          .toLowerCase()
          .includes(query);
      })
      .sort((a, b) => {
        // Pending first — this page exists to clear a queue.
        if (a.request.status !== b.request.status) {
          if (a.request.status === "pending") return -1;
          if (b.request.status === "pending") return 1;
        }
        return a.request.startDate.localeCompare(b.request.startDate);
      });
  }, [requests, roster, search, statusFilter, typeFilter]);

  const filtersOn =
    Boolean(search) || statusFilter !== "all" || typeFilter !== "all";

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setTypeFilter("all");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="animate-pulse font-display text-sm font-semibold text-ink/70">
          Loading requests…
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
          { key: "requests", label: "Requests" },
          { key: "allocation", label: "Allocation" },
        ]}
      />

      {tab === "requests" ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <SummaryTile
              label="Awaiting you"
              value={counts.pending}
              hint={counts.days > 0 ? `${counts.days} days requested` : undefined}
              tone={counts.pending > 0 ? "warn" : "default"}
              active={statusFilter === "pending"}
              onClick={() =>
                setStatusFilter(statusFilter === "pending" ? "all" : "pending")
              }
            />
            <SummaryTile
              label="Approved"
              value={counts.approved}
              tone="success"
              active={statusFilter === "approved"}
              onClick={() =>
                setStatusFilter(statusFilter === "approved" ? "all" : "approved")
              }
            />
            <SummaryTile
              label="Rejected"
              value={counts.rejected}
              tone="muted"
              active={statusFilter === "rejected"}
              onClick={() =>
                setStatusFilter(statusFilter === "rejected" ? "all" : "rejected")
              }
            />
            <SummaryTile
              label="All requests"
              value={requests.length}
              active={statusFilter === "all"}
              onClick={() => setStatusFilter("all")}
            />
          </div>

          <Toolbar>
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search person, Login ID, reason…"
            />
            <FilterSelect
              label="Status"
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as "all" | RequestStatus)}
              options={[
                { value: "all", label: "Any status" },
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
            <FilterSelect
              label="Leave type"
              value={typeFilter}
              onChange={setTypeFilter}
              options={[
                { value: "all", label: "All types" },
                ...LEAVE_TYPES.map((t) => ({ value: t.code, label: t.name })),
              ]}
            />
          </Toolbar>

          <ResultLine
            showing={rows.length}
            total={requests.length}
            noun="requests"
            onClear={filtersOn ? clearFilters : undefined}
          />

          {rows.length === 0 ? (
            <EmptyState
              title={
                counts.pending === 0 && statusFilter === "pending"
                  ? "Nothing waiting on you."
                  : "No requests match those filters."
              }
              description={
                counts.pending === 0 && statusFilter === "pending"
                  ? "Every request has been reviewed. New ones land here the moment they are submitted."
                  : "Try another status or leave type, or clear the filters."
              }
              onClear={filtersOn ? clearFilters : undefined}
            />
          ) : (
            <TableShell
              minWidth="58rem"
              columns={[
                "Employee",
                "Type",
                "Dates",
                "Days",
                "Reason",
                "Status",
                "",
              ]}
            >
              {rows.map(({ request, employee }) => {
                const type = LEAVE_TYPES.find(
                  (t) => t.code === request.leaveType,
                );
                return (
                  <Row key={request.id}>
                    <td className="px-4 py-3">
                      <PersonCell
                        initials={
                          employee ? employeeInitials(employee) : "??"
                        }
                        name={
                          employee ? employeeName(employee) : request.employeeId
                        }
                        meta={employee?.loginId}
                        href={
                          employee ? `/employees/${employee.id}` : undefined
                        }
                      />
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        label={type?.name ?? request.leaveType}
                        tone={type?.isPaid ? "plum" : "muted"}
                        dot={false}
                      />
                    </td>
                    <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                      {formatRange(request.startDate, request.endDate)}
                    </td>
                    <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                      {request.dayCount}
                    </td>
                    <td className="max-w-[18rem] px-4 py-3">
                      <span className="block truncate font-body text-[14px] text-ink/70">
                        {request.remarks || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill
                        label={
                          request.status.charAt(0).toUpperCase() +
                          request.status.slice(1)
                        }
                        tone={STATUS_TONE[request.status]}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      {request.status === "pending" ? (
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={busyId === request.id}
                            onClick={() => review(request.id, "approved")}
                            className="rounded-pill bg-success/15 px-3 py-1.5 font-display text-xs font-semibold text-success transition-colors hover:bg-success/25 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            disabled={busyId === request.id}
                            onClick={() => review(request.id, "rejected")}
                            className="rounded-pill bg-warn/15 px-3 py-1.5 font-display text-xs font-semibold text-warn transition-colors hover:bg-warn/25 disabled:opacity-50"
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
                  </Row>
                );
              })}
            </TableShell>
          )}
        </>
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
  const { currentEmployee } = useSession();
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
          <div className="rounded-card p-6 premium-card shadow-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-plum/90">
              Paid available
            </p>
            <p className="mt-3 font-display text-[32px] font-extrabold tabular-nums text-ink">
              {paidBalance.available}
            </p>
          </div>
          <div className="rounded-card p-6 premium-card shadow-sm">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-plum/90">
              Sick available
            </p>
            <p className="mt-3 font-display text-[32px] font-extrabold tabular-nums text-ink">
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

function TimeOffPageInner() {
  const { role } = useSession();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Leave"
        title="Time Off"
        description={
          role === "admin"
            ? "Clear the approval queue and manage allocations. Approved leave feeds straight into attendance and payroll."
            : "Apply for leave and track your balance."
        }
      />

      {role === "admin" ? <AdminTimeOff /> : <EmployeeTimeOff />}
    </div>
  );
}

/** Admin/HR only — employees are redirected to their own workspace. */
export default function TimeOffPage() {
  return (
    <AdminGuard>
      <TimeOffPageInner />
    </AdminGuard>
  );
}
