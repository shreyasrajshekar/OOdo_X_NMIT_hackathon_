"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { EmployeeCard } from "@/components/employee-card";
import { AdminGuard } from "@/components/admin-guard";
import { useAdminActions } from "@/components/admin-actions-provider";
import {
  PRESENCE_LABEL,
  PresenceBadge,
  RoleBadge,
  presenceFor,
  type Presence,
} from "@/components/employees/presence";
import {
  EmptyState,
  FilterSelect,
  PageHeader,
  PersonCell,
  ResultLine,
  Row,
  SearchInput,
  Segmented,
  SummaryTile,
  TableShell,
  Toolbar,
} from "@/components/ui/data-ui";
import {
  DEPARTMENTS,
  employeeInitials,
  employeeName,
  today,
  type AttendanceRecord,
  type Employee,
} from "@/lib/mock-data";
import { fetchAttendanceForDate, fetchEmployees } from "@/lib/supabase-db";

type SortKey = "name" | "newest" | "department" | "role";
type View = "table" | "grid";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "name", label: "Name (A–Z)" },
  { key: "newest", label: "Newest joiners" },
  { key: "department", label: "Department" },
  { key: "role", label: "Role" },
];

const PRESENCES: Presence[] = ["in", "out", "leave", "absent"];

function formatJoined(iso: string) {
  if (!iso) return "—";
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function csvCell(value: string | number) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function EmployeesPageInner() {
  const { openAddUser, onUserCreated } = useAdminActions();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceRecord>
  >({});
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [department, setDepartment] = useState("all");
  const [role, setRole] = useState("all");
  const [presence, setPresence] = useState<"all" | Presence>("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [view, setView] = useState<View>("table");

  const todayISO = today();

  useEffect(() => {
    Promise.all([fetchEmployees(), fetchAttendanceForDate(todayISO)])
      .then(([people, todayAttendance]) => {
        setEmployees(people);
        setAttendance(todayAttendance);
      })
      .finally(() => setLoading(false));
  }, [todayISO]);

  // Keep the directory in step with users added from the nav.
  useEffect(
    () =>
      onUserCreated((employee) =>
        setEmployees((current) =>
          current.some((e) => e.id === employee.id)
            ? current
            : [...current, employee],
        ),
      ),
    [onUserCreated],
  );

  const withPresence = useMemo(
    () =>
      employees.map((employee) => ({
        employee,
        presence: presenceFor(attendance[employee.id]),
      })),
    [employees, attendance],
  );

  const counts = useMemo(() => {
    const byPresence = { in: 0, out: 0, leave: 0, absent: 0 };
    let admins = 0;
    for (const row of withPresence) {
      byPresence[row.presence] += 1;
      if (row.employee.role === "admin") admins += 1;
    }
    return {
      total: withPresence.length,
      admins,
      departments: new Set(employees.map((e) => e.department)).size,
      ...byPresence,
    };
  }, [withPresence, employees]);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();

    const matched = withPresence.filter(({ employee, presence: p }) => {
      if (department !== "all" && employee.department !== department)
        return false;
      if (role !== "all" && employee.role !== role) return false;
      if (presence !== "all" && p !== presence) return false;
      if (!query) return true;

      return [
        employeeName(employee),
        employee.loginId,
        employee.workEmail,
        employee.department,
        employee.jobTitle,
        employee.manager,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });

    const sorted = [...matched];
    sorted.sort((a, b) => {
      switch (sort) {
        case "newest":
          return b.employee.joiningDate.localeCompare(a.employee.joiningDate);
        case "department":
          return (
            a.employee.department.localeCompare(b.employee.department) ||
            employeeName(a.employee).localeCompare(employeeName(b.employee))
          );
        case "role":
          return (
            a.employee.role.localeCompare(b.employee.role) ||
            employeeName(a.employee).localeCompare(employeeName(b.employee))
          );
        default:
          return employeeName(a.employee).localeCompare(
            employeeName(b.employee),
          );
      }
    });

    return sorted;
  }, [withPresence, search, department, role, presence, sort]);

  const filtersOn =
    Boolean(search) ||
    department !== "all" ||
    role !== "all" ||
    presence !== "all";

  function clearFilters() {
    setSearch("");
    setDepartment("all");
    setRole("all");
    setPresence("all");
  }

  /** What HR actually asks for: the current view, as a spreadsheet. */
  function exportCsv() {
    const header = [
      "Login ID",
      "Name",
      "Work email",
      "Role",
      "Department",
      "Job title",
      "Manager",
      "Joined",
      "Status today",
    ];
    const body = rows.map(({ employee, presence: p }) =>
      [
        employee.loginId,
        employeeName(employee),
        employee.workEmail,
        employee.role,
        employee.department,
        employee.jobTitle,
        employee.manager,
        employee.joiningDate,
        PRESENCE_LABEL[p],
      ]
        .map(csvCell)
        .join(","),
    );

    const blob = new Blob([[header.join(","), ...body].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dayflow-employees-${todayISO}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="animate-pulse font-display text-sm font-semibold text-ink/70">
          Loading the directory…
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="People"
        title="Employees"
        description="Add a user and the system generates their Login ID, sets a first password, and emails both."
        actions={
          <>
            <Button variant="secondary" onClick={exportCsv}>
              Export CSV
            </Button>
            <Button onClick={openAddUser}>Add user</Button>
          </>
        }
      />

      {/* Counts double as filters — the fastest route to "who is out today". */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <SummaryTile
          label="Total people"
          value={counts.total}
          active={!filtersOn}
          onClick={clearFilters}
        />
        <SummaryTile
          label="In office"
          value={counts.in}
          tone="success"
          active={presence === "in"}
          onClick={() => setPresence(presence === "in" ? "all" : "in")}
        />
        <SummaryTile
          label="On leave"
          value={counts.leave}
          tone="plum"
          active={presence === "leave"}
          onClick={() => setPresence(presence === "leave" ? "all" : "leave")}
        />
        <SummaryTile
          label="Not in"
          value={counts.absent}
          tone={counts.absent > 0 ? "warn" : "default"}
          active={presence === "absent"}
          onClick={() => setPresence(presence === "absent" ? "all" : "absent")}
        />
        <SummaryTile
          label="Admin / HR"
          value={counts.admins}
          active={role === "admin"}
          onClick={() => setRole(role === "admin" ? "all" : "admin")}
        />
      </div>

      <Toolbar>
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search name, Login ID, email, title…"
        />

        <FilterSelect
          value={department}
          onChange={setDepartment}
          label="Department"
          options={[
            { value: "all", label: "All departments" },
            ...DEPARTMENTS.map((d) => ({ value: d, label: d })),
          ]}
        />
        <FilterSelect
          value={role}
          onChange={setRole}
          label="Role"
          options={[
            { value: "all", label: "All roles" },
            { value: "admin", label: "Admin / HR" },
            { value: "employee", label: "Employee" },
          ]}
        />
        <FilterSelect
          value={presence}
          onChange={(v) => setPresence(v as "all" | Presence)}
          label="Status"
          options={[
            { value: "all", label: "Any status" },
            ...PRESENCES.map((p) => ({ value: p, label: PRESENCE_LABEL[p] })),
          ]}
        />
        <FilterSelect
          value={sort}
          onChange={(v) => setSort(v as SortKey)}
          label="Sort"
          options={SORTS.map((s) => ({ value: s.key, label: s.label }))}
        />

        <Segmented
          label="View"
          value={view}
          onChange={setView}
          options={["table", "grid"] as const}
        />
      </Toolbar>

      <ResultLine
        showing={rows.length}
        total={counts.total}
        noun="people"
        detail={`${counts.departments} departments`}
        onClear={filtersOn ? clearFilters : undefined}
      />

      {rows.length === 0 ? (
        <EmptyState
          title="Nobody matches those filters."
          description="Try a different name, department, or Login ID."
          onClear={clearFilters}
        />
      ) : view === "table" ? (
        <div className="overflow-x-auto rounded-card border border-line">
          <table className="w-full min-w-[62rem] text-left">
            <thead>
              <tr className="border-b border-line bg-line/50">
                {[
                  "Employee",
                  "Login ID",
                  "Role",
                  "Department",
                  "Job title",
                  "Status today",
                  "Joined",
                  "",
                ].map((col) => (
                  <th
                    key={col}
                    scope="col"
                    className="px-4 py-3 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-plum"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(({ employee, presence: p }) => (
                <tr
                  key={employee.id}
                  className="group border-b border-line/60 transition-colors last:border-0 hover:bg-plum/[0.04]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-plum/15 font-mono text-[11px] font-bold uppercase text-primary">
                        {employeeInitials(employee)}
                      </span>
                      <span className="min-w-0">
                        <Link
                          href={`/employees/${employee.id}`}
                          className="block truncate font-display text-sm font-semibold text-ink hover:text-primary"
                        >
                          {employeeName(employee)}
                        </Link>
                        <span className="block truncate font-body text-[13px] text-ink/60">
                          {employee.workEmail}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-wide text-ink/80">
                    {employee.loginId}
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={employee.role} />
                  </td>
                  <td className="px-4 py-3 font-display text-sm text-ink">
                    {employee.department}
                  </td>
                  <td className="px-4 py-3 font-display text-sm text-ink/80">
                    {employee.jobTitle}
                  </td>
                  <td className="px-4 py-3">
                    <PresenceBadge presence={p} />
                  </td>
                  <td className="px-4 py-3 font-display text-sm tabular-nums text-ink/70">
                    {formatJoined(employee.joiningDate)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/employees/${employee.id}`}
                      className="font-display text-sm font-semibold text-primary opacity-0 transition-opacity hover:underline focus-visible:opacity-100 group-hover:opacity-100"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {rows.map(({ employee, presence: p }) => (
            <EmployeeCard
              key={employee.id}
              employee={employee}
              presence={p}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** Admin/HR only — employees are redirected to their own workspace. */
export default function EmployeesPage() {
  return (
    <AdminGuard>
      <EmployeesPageInner />
    </AdminGuard>
  );
}
