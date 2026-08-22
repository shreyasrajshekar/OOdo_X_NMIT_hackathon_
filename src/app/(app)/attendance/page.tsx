"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/demo-session-provider";
import { AdminGuard } from "@/components/admin-guard";
import { supabase } from "@/lib/supabase";
import { fetchAttendanceRecords, fetchEmployees } from "@/lib/supabase-db";
import {
  DEPARTMENTS,
  employeeInitials,
  employeeName,
  type Employee,
  getAttendanceRecord,
  toISODate,
  today,
  type AttendanceStatus,
  type AttendanceRecord,
} from "@/lib/mock-data";
import { Button } from "@/components/ui/button";
import {
  EmptyState,
  FilterSelect,
  MiniBar,
  PageHeader,
  PersonCell,
  ResultLine,
  Row,
  SearchInput,
  Segmented,
  StatusPill,
  Stepper,
  SummaryTile,
  TableShell,
  Toolbar,
  type Tone,
} from "@/components/ui/data-ui";

type ViewMode = "day" | "week" | "month";

function formatTime(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shiftDate(dateISO: string, view: ViewMode, direction: 1 | -1): string {
  const date = new Date(`${dateISO}T00:00:00`);
  if (view === "day") date.setDate(date.getDate() + direction);
  else if (view === "week") date.setDate(date.getDate() + direction * 7);
  else date.setMonth(date.getMonth() + direction);
  return toISODate(date);
}

function rangeForView(dateISO: string, view: ViewMode): string[] {
  const anchor = new Date(`${dateISO}T00:00:00`);
  const dates: string[] = [];

  if (view === "day") {
    dates.push(dateISO);
  } else if (view === "week") {
    for (let i = 6; i >= 0; i--) {
      const d = new Date(anchor);
      d.setDate(d.getDate() - i);
      dates.push(toISODate(d));
    }
  } else {
    const daysInMonth = new Date(
      anchor.getFullYear(),
      anchor.getMonth() + 1,
      0,
    ).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
      dates.push(toISODate(new Date(anchor.getFullYear(), anchor.getMonth(), day)));
    }
  }

  return dates.filter((d) => d <= today());
}

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  half_day: "Half day",
  absent: "Absent",
  leave: "Leave",
  holiday: "Holiday",
  weekend: "Weekend",
};

const STATUS_TONE: Record<AttendanceStatus, Tone> = {
  present: "success",
  half_day: "plum",
  absent: "warn",
  leave: "plum",
  holiday: "muted",
  weekend: "muted",
};

interface DbAttendanceRow {
  id: string;
  employee_id: string;
  work_date: string;
  check_in: string | null;
  check_out: string | null;
  work_hours: number | null;
  extra_hours: number | null;
  status: AttendanceStatus;
}

function AdminAttendance() {
  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | AttendanceStatus>(
    "all",
  );
  const [selectedDate, setSelectedDate] = useState(today());
  const [view, setView] = useState<ViewMode>("day");
  const [dbRecords, setDbRecords] = useState<DbAttendanceRow[]>([]);
  const [roster, setRoster] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEmployees()
      .then(setRoster)
      .catch((err) => console.warn("Failed to load the roster:", err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const fetchAdminLogs = async () => {
      try {
        const { data, error } = await supabase
          .from("attendance")
          .select("*")
          .eq("date", selectedDate);

        if (error) throw error;

        if (data) {
          const mapped = (data as Array<{
            id: number;
            employee_id: string;
            date: string;
            check_in: string | null;
            check_out: string | null;
            hours_worked: number | string | null;
            status: AttendanceStatus;
          }>).map((r) => ({
            id: String(r.id),
            employee_id: r.employee_id,
            work_date: r.date,
            check_in: r.check_in,
            check_out: r.check_out,
            work_hours: Number(r.hours_worked) || 0,
            extra_hours:
              Number(r.hours_worked) > 8 ? Number(r.hours_worked) - 8 : 0,
            status: r.status,
          }));
          setDbRecords(mapped);
        }
      } catch (err) {
        console.warn("Failed to fetch admin attendance logs:", err);
      }
    };
    fetchAdminLogs();
  }, [selectedDate]);

  const range = useMemo(
    () => rangeForView(selectedDate, view),
    [selectedDate, view],
  );

  /** One row per person for the selected day, DB first, generator as fallback. */
  const dayRows = useMemo(
    () =>
      roster.map((employee) => {
        const dbRec = dbRecords.find((r) => r.employee_id === employee.id);
        const record: AttendanceRecord = dbRec
          ? {
              date: dbRec.work_date,
              status: dbRec.status,
              checkIn: dbRec.check_in,
              checkOut: dbRec.check_out,
              workHours: Number(dbRec.work_hours) || 0,
              extraHours: Number(dbRec.extra_hours) || 0,
            }
          : getAttendanceRecord(employee, selectedDate, today());
        return { employee, record };
      }),
    [roster, dbRecords, selectedDate],
  );

  const counts = useMemo(() => {
    // Literal keys, not Record<string, number> — spreading a widened record
    // below would lose them from the result type.
    const tally = { present: 0, half_day: 0, absent: 0, leave: 0 };
    let hours = 0;

    for (const { record } of dayRows) {
      if (record.status in tally) {
        tally[record.status as keyof typeof tally] += 1;
      }
      hours += record.workHours || 0;
    }

    const logged = dayRows.filter((r) => r.record.workHours > 0).length;
    return {
      ...tally,
      avgHours: logged > 0 ? (hours / logged).toFixed(1) : "0.0",
      totalHours: hours.toFixed(1),
    };
  }, [dayRows]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return dayRows.filter(({ employee, record }) => {
      if (department !== "all" && employee.department !== department)
        return false;
      if (statusFilter !== "all" && record.status !== statusFilter) return false;
      if (!query) return true;
      return [employeeName(employee), employee.loginId, employee.department]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [dayRows, search, department, statusFilter]);

  const filtersOn =
    Boolean(search) || department !== "all" || statusFilter !== "all";

  function clearFilters() {
    setSearch("");
    setDepartment("all");
    setStatusFilter("all");
  }

  function exportCsv() {
    const header = [
      "Login ID",
      "Name",
      "Department",
      "Date",
      "Check in",
      "Check out",
      "Work hours",
      "Extra hours",
      "Status",
    ];
    const body = filtered.map(({ employee, record }) =>
      [
        employee.loginId,
        employeeName(employee),
        employee.department,
        selectedDate,
        formatTime(record.checkIn),
        formatTime(record.checkOut),
        record.workHours || 0,
        record.extraHours || 0,
        STATUS_LABEL[record.status],
      ]
        .map((cell) => {
          const text = String(cell ?? "");
          return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(","),
    );

    const blob = new Blob([[header.join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dayflow-attendance-${selectedDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="animate-pulse font-display text-sm font-semibold text-ink/70">
          Loading attendance…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-display text-sm font-semibold text-ink">
          {view === "day"
            ? formatDate(selectedDate)
            : `${range.length} days to ${formatDate(selectedDate)}`}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            label="Range"
            value={view}
            onChange={setView}
            options={["day", "week", "month"] as const}
          />
          <Stepper
            onPrev={() => setSelectedDate((d) => shiftDate(d, view, -1))}
            onNext={() => setSelectedDate((d) => shiftDate(d, view, 1))}
            onReset={() => setSelectedDate(today())}
          >
            <input
              type="date"
              aria-label="Date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 rounded-pill border border-line bg-paper px-3 font-display text-sm text-ink focus:border-plum"
            />
          </Stepper>
          <Button variant="secondary" onClick={exportCsv}>
            Export CSV
          </Button>
        </div>
      </div>

      {view === "day" && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <SummaryTile
            label="Present"
            value={counts.present}
            tone="success"
            active={statusFilter === "present"}
            onClick={() =>
              setStatusFilter(statusFilter === "present" ? "all" : "present")
            }
          />
          <SummaryTile
            label="Half day"
            value={counts.half_day}
            tone="plum"
            active={statusFilter === "half_day"}
            onClick={() =>
              setStatusFilter(statusFilter === "half_day" ? "all" : "half_day")
            }
          />
          <SummaryTile
            label="On leave"
            value={counts.leave}
            tone="plum"
            active={statusFilter === "leave"}
            onClick={() =>
              setStatusFilter(statusFilter === "leave" ? "all" : "leave")
            }
          />
          <SummaryTile
            label="Absent"
            value={counts.absent}
            tone={counts.absent > 0 ? "warn" : "default"}
            active={statusFilter === "absent"}
            onClick={() =>
              setStatusFilter(statusFilter === "absent" ? "all" : "absent")
            }
          />
          <SummaryTile
            label="Avg hours"
            value={counts.avgHours}
            hint={`${counts.totalHours} h logged`}
          />
        </div>
      )}

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, Login ID, department…"
        />
        <FilterSelect
          label="Department"
          value={department}
          onChange={setDepartment}
          options={[
            { value: "all", label: "All departments" },
            ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
          ]}
        />
        {view === "day" && (
          <FilterSelect
            label="Status"
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as "all" | AttendanceStatus)}
            options={[
              { value: "all", label: "Any status" },
              ...(
                ["present", "half_day", "leave", "absent"] as AttendanceStatus[]
              ).map((s) => ({ value: s, label: STATUS_LABEL[s] })),
            ]}
          />
        )}
      </Toolbar>

      <ResultLine
        showing={filtered.length}
        total={roster.length}
        noun="people"
        onClear={filtersOn ? clearFilters : undefined}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title="Nobody matches those filters."
          description="Try another department, a different status, or clear the filters to see the whole company."
          onClear={filtersOn ? clearFilters : undefined}
        />
      ) : view === "day" ? (
        <TableShell
          minWidth="58rem"
          columns={[
            "Employee",
            "Login ID",
            "Check in",
            "Check out",
            "Work hours",
            "Extra",
            "Status",
          ]}
        >
          {filtered.map(({ employee, record }) => (
            <Row key={employee.id}>
              <td className="px-4 py-3">
                <PersonCell
                  initials={employeeInitials(employee)}
                  name={employeeName(employee)}
                  meta={employee.department}
                  href={`/employees/${employee.id}`}
                />
              </td>
              <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-ink/80">
                {employee.loginId}
              </td>
              <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                {formatTime(record.checkIn)}
              </td>
              <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                {formatTime(record.checkOut)}
              </td>
              <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                {record.workHours ? record.workHours.toFixed(1) : "—"}
              </td>
              <td
                className={`px-4 py-3 font-display text-sm tabular-nums ${
                  record.extraHours > 0 ? "text-success" : "text-ink/40"
                }`}
              >
                {record.extraHours ? record.extraHours.toFixed(1) : "—"}
              </td>
              <td className="px-4 py-3">
                <StatusPill
                  label={STATUS_LABEL[record.status]}
                  tone={STATUS_TONE[record.status]}
                />
              </td>
            </Row>
          ))}
        </TableShell>
      ) : (
        <TableShell
          minWidth="52rem"
          columns={[
            "Employee",
            "Present",
            "Half day",
            "Absent",
            "Leave",
            "Days",
            "Attendance",
          ]}
        >
          {filtered.map(({ employee }) => {
            const records = range.map((d) =>
              getAttendanceRecord(employee, d, today()),
            );
            const count = (status: AttendanceStatus) =>
              records.filter((r) => r.status === status).length;
            const worked = count("present") + count("half_day") * 0.5;
            const trackable = records.filter(
              (r) => r.status !== "weekend" && r.status !== "holiday",
            ).length;

            return (
              <Row key={employee.id}>
                <td className="px-4 py-3">
                  <PersonCell
                    initials={employeeInitials(employee)}
                    name={employeeName(employee)}
                    meta={employee.department}
                    href={`/employees/${employee.id}`}
                  />
                </td>
                <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                  {count("present")}
                </td>
                <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                  {count("half_day")}
                </td>
                <td
                  className={`px-4 py-3 font-display text-sm tabular-nums ${
                    count("absent") > 0 ? "text-warn" : "text-ink/40"
                  }`}
                >
                  {count("absent")}
                </td>
                <td className="px-4 py-3 font-display text-sm tabular-nums text-primary">
                  {count("leave")}
                </td>
                <td className="px-4 py-3 font-display text-sm tabular-nums text-ink/60">
                  {range.length}
                </td>
                <td className="px-4 py-3">
                  <MiniBar
                    value={worked}
                    max={trackable}
                    tone={
                      trackable > 0 && worked / trackable < 0.8
                        ? "warn"
                        : "success"
                    }
                  />
                </td>
              </Row>
            );
          })}
        </TableShell>
      )}
    </div>
  );
}

function EmployeeAttendance() {
  const { currentEmployee } = useSession();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [dbRecords, setDbRecords] = useState<AttendanceRecord[]>([]);

  useEffect(() => {
    if (!currentEmployee) return;
    const monthISO = `${year}-${String(month + 1).padStart(2, "0")}`;
    fetchAttendanceRecords(currentEmployee.id, monthISO).then((data) => {
      setDbRecords(data);
    }).catch(err => {
      console.warn("Error fetching logs from Supabase, relying on mock-data generator:", err);
    });
  }, [currentEmployee, year, month]);

  const records = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const result: AttendanceRecord[] = [];
    const todayStr = today();

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateISO = toISODate(date);
      if (dateISO > todayStr) break;

      const dbRec = dbRecords.find((r) => r.date === dateISO);
      if (dbRec) {
        result.push(dbRec);
      } else {
        result.push(getAttendanceRecord(currentEmployee, dateISO, todayStr));
      }
    }
    return result;
  }, [currentEmployee, year, month, dbRecords]);


  const presentDays = records.filter(
    (r) => r.status === "present" || r.status === "half_day",
  ).length;
  const leaveDays = records.filter((r) => r.status === "leave").length;
  const workingDays = records.filter(
    (r) => r.status !== "weekend" && r.status !== "holiday",
  ).length;

  function shiftMonth(direction: 1 | -1) {
    const date = new Date(year, month + direction, 1);
    setYear(date.getFullYear());
    setMonth(date.getMonth());
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-pill border border-line px-3 py-1.5 font-display text-sm text-ink"
          >
            ←
          </button>
          <p className="w-40 text-center font-display text-sm font-semibold text-ink">
            {new Date(year, month, 1).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
            })}
          </p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-pill border border-line px-3 py-1.5 font-display text-sm text-ink"
          >
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <SummaryCard label="Present days" value={presentDays} />
        <SummaryCard label="Approved leaves" value={leaveDays} />
        <SummaryCard label="Working days" value={workingDays} />
      </div>

      <div className="overflow-hidden rounded-card border border-line">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line bg-line/60">
              {["Date", "Check In", "Check Out", "Work Hours", "Extra Hours"].map((col) => (
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
            {records.map((record) => (
              <tr key={record.date} className="border-b border-line/60">
                <td className="px-4 py-3 font-display text-sm text-ink">
                  {formatDate(record.date)}
                  {record.status !== "present" && record.status !== "half_day" && (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-ink/50">
                      {STATUS_LABEL[record.status]}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                  {formatTime(record.checkIn)}
                </td>
                <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                  {formatTime(record.checkOut)}
                </td>
                <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                  {record.workHours || "—"}
                </td>
                <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                  {record.extraHours || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-card p-6 premium-card shadow-sm">
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-plum/90">
        {label}
      </p>
      <p className="mt-3 font-display text-[32px] font-extrabold tabular-nums text-ink">
        {value}
      </p>
    </div>
  );
}


function AttendancePageInner() {
  const { role } = useSession();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Workforce"
        title="Attendance"
        description={
          role === "admin"
            ? "Every employee's day, company-wide. Hours logged here are what payroll pays against."
            : "Check in when you arrive, check out when you leave."
        }
      />

      {role === "admin" ? <AdminAttendance /> : <EmployeeAttendance />}
    </div>
  );
}

/** Admin/HR only — employees are redirected to their own workspace. */
export default function AttendancePage() {
  return (
    <AdminGuard>
      <AttendancePageInner />
    </AdminGuard>
  );
}
