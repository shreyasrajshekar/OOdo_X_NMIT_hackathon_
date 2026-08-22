import Link from "next/link";
import { StatusDot } from "@/components/status-dot";
import {
  currentStatus,
  employeeInitials,
  employeeName,
  today,
  type Employee,
} from "@/lib/mock-data";

export function EmployeeCard({ employee }: { employee: Employee }) {
  const status = currentStatus(employee, today());

  return (
    <Link
      href={`/employees/${employee.id}`}
      className="group relative flex flex-col items-center gap-3 rounded-card border border-line p-6 text-center hover:border-plum"
    >
      <div className="absolute right-4 top-4">
        <StatusDot status={status} />
      </div>
      <div className="flex h-16 w-16 items-center justify-center rounded-pill bg-plum/20 font-mono text-lg uppercase text-primary">
        {employeeInitials(employee)}
      </div>
      <div>
        <p className="font-display text-sm font-semibold text-ink">
          {employeeName(employee)}
        </p>
        <p className="mt-0.5 font-body text-[13px] text-ink/60">
          {employee.jobTitle}
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-plum">
          {employee.department}
        </p>
      </div>
    </Link>
  );
}
