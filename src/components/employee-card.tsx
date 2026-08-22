import Link from "next/link";
import {
  PresenceBadge,
  RoleBadge,
  type Presence,
} from "@/components/employees/presence";
import {
  currentStatus,
  employeeInitials,
  employeeName,
  today,
  type Employee,
} from "@/lib/mock-data";

export function EmployeeCard({
  employee,
  presence,
}: {
  employee: Employee;
  /** Today's presence, when the caller has already loaded attendance. */
  presence?: Presence;
}) {
  // Callers that already loaded today's attendance pass it in; the rest fall
  // back to what the mock layer derives.
  const resolved: Presence = presence ?? fallbackPresence(employee);

  return (
    <Link
      href={`/employees/${employee.id}`}
      className="premium-card group flex flex-col gap-4 rounded-card p-5"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-12 w-12 items-center justify-center rounded-pill bg-plum/15 font-mono text-sm font-bold uppercase text-primary transition-colors duration-300 group-hover:bg-primary/20">
          {employeeInitials(employee)}
        </span>
        <RoleBadge role={employee.role} />
      </div>

      <div className="min-w-0">
        <p className="truncate font-display text-sm font-bold text-ink transition-colors duration-200 group-hover:text-primary">
          {employeeName(employee)}
        </p>
        <p className="mt-0.5 truncate font-body text-[13px] text-ink/70">
          {employee.jobTitle}
        </p>
        <p className="mt-1.5 truncate font-mono text-[10px] uppercase tracking-[0.12em] text-plum">
          {employee.loginId}
        </p>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-line pt-3">
        <span className="truncate font-display text-xs font-semibold text-ink/60">
          {employee.department}
        </span>
        <PresenceBadge presence={resolved} />
      </div>
    </Link>
  );
}

function fallbackPresence(employee: Employee): Presence {
  const status = currentStatus(employee, today());
  if (status === "leave") return "leave";
  return status === "present" ? "in" : "absent";
}
