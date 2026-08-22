"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/components/demo-session-provider";
import { supabase } from "@/lib/supabase";
import { fetchAttendanceRecords, fetchEmployees } from "@/lib/supabase-db";
import {
  employeeName,
  type Employee,
  getAttendanceRecord,
  toISODate,
  today,
  type AttendanceStatus,
  type AttendanceRecord,
} from "@/lib/mock-data";

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
  const [selectedDate, setSelectedDate] = useState(today());
  const [view, setView] = useState<ViewMode>("day");
  const [dbRecords, setDbRecords] = useState<DbAttendanceRow[]>([]);
  const [roster, setRoster] = useState<Employee[]>([]);

  useEffect(() => {
    fetchEmployees()
      .then(setRoster)
      .catch((err) => console.warn("Failed to load the roster:", err));
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
            extra_hours: Number(r.hours_worked) > 8 ? (Number(r.hours_worked) - 8) : 0,
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



  const employees = useMemo(
    () =>
      roster.filter((e) =>
        employeeName(e).toLowerCase().includes(search.toLowerCase()),
      ),
    [roster, search],
  );

  const range = useMemo(() => rangeForView(selectedDate, view), [selectedDate, view]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <input
          type="search"
          placeholder="Search employees"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs rounded-pill border border-line px-4 py-2 font-display text-sm text-ink outline-none focus:border-plum"
        />

        <div className="flex items-center gap-2">
          <div className="flex rounded-pill border border-line p-0.5">
            {(["day", "week", "month"] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setView(mode)}
                className={`rounded-pill px-3 py-1 font-display text-xs font-semibold capitalize ${
                  view === mode ? "bg-primary text-paper" : "text-ink/60"
                }`}
              >
                {mode}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSelectedDate((d) => shiftDate(d, view, -1))}
            className="rounded-pill border border-line px-3 py-1.5 font-display text-sm text-ink"
          >
            ←
          </button>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded-pill border border-line px-3 py-1.5 font-display text-sm text-ink outline-none focus:border-plum"
          />
          <button
            type="button"
            onClick={() => setSelectedDate((d) => shiftDate(d, view, 1))}
            className="rounded-pill border border-line px-3 py-1.5 font-display text-sm text-ink"
          >
            →
          </button>
        </div>
      </div>

      {view === "day" ? (
        <div className="overflow-hidden rounded-card border border-line">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line bg-line/60">
                {["Employee", "Check In", "Check Out", "Work Hours", "Extra Hours"].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-4 py-3 font-display text-sm font-semibold text-ink"
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const dbRec = dbRecords.find((r) => r.employee_id === employee.id);
                const record = dbRec
                  ? {
                      date: dbRec.work_date,
                      status: dbRec.status,
                      checkIn: dbRec.check_in,
                      checkOut: dbRec.check_out,
                      workHours: Number(dbRec.work_hours) || 0,
                      extraHours: Number(dbRec.extra_hours) || 0,
                    }
                  : getAttendanceRecord(employee, selectedDate, today());
                return (
                  <tr key={employee.id} className="border-b border-line/60">
                    <td className="px-4 py-3 font-display text-sm text-ink">
                      {employeeName(employee)}
                      <span className="ml-2 font-mono text-[10px] uppercase tracking-[0.1em] text-plum">
                        {employee.loginId}
                      </span>
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
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-hidden rounded-card border border-line">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-line bg-line/60">
                {["Employee", "Present", "Half day", "Absent", "Leave", "Days tracked"].map(
                  (col) => (
                    <th
                      key={col}
                      className="px-4 py-3 font-display text-sm font-semibold text-ink"
                    >
                      {col}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => {
                const records = range.map((d) => getAttendanceRecord(employee, d, today()));
                const count = (status: AttendanceStatus) =>
                  records.filter((r) => r.status === status).length;
                return (
                  <tr key={employee.id} className="border-b border-line/60">
                    <td className="px-4 py-3 font-display text-sm text-ink">
                      {employeeName(employee)}
                    </td>
                    <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                      {count("present")}
                    </td>
                    <td className="px-4 py-3 font-display text-sm tabular-nums text-ink">
                      {count("half_day")}
                    </td>
                    <td className="px-4 py-3 font-display text-sm tabular-nums text-warn">
                      {count("absent")}
                    </td>
                    <td className="px-4 py-3 font-display text-sm tabular-nums text-plum">
                      {count("leave")}
                    </td>
                    <td className="px-4 py-3 font-display text-sm tabular-nums text-ink/60">
                      {range.length}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
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


export default function AttendancePage() {
  const { role } = useSession();

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">
          Attendance
        </h1>
        <p className="mt-1 font-body text-[15px] text-ink/70">
          {role === "admin"
            ? "Every employee's attendance, company-wide."
            : "Check in when you arrive, check out when you leave."}
        </p>
      </div>

      {role === "admin" ? <AdminAttendance /> : <EmployeeAttendance />}
    </div>
  );
}
