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
      className="group relative flex flex-col items-center gap-4 rounded-card p-6 text-center premium-card"
    >
      <div className="absolute right-4 top-4">
        <StatusDot status={status} />
      </div>
      <div className="flex h-16 w-16 items-center justify-center rounded-pill bg-plum/15 font-mono text-lg uppercase text-primary font-bold group-hover:scale-105 group-hover:bg-primary/25 transition-all duration-300">
        {employeeInitials(employee)}
      </div>
      <div>
        <p className="font-display text-sm font-bold text-ink group-hover:text-primary transition-colors duration-200">
          {employeeName(employee)}
        </p>
        <p className="mt-1 font-body text-[13px] text-ink/70">
          {employee.jobTitle}
        </p>
        <p className="mt-1 font-mono text-[9px] font-bold uppercase tracking-[0.15em] text-plum/90 bg-plum/5 px-2 py-0.5 rounded-full inline-block">
          {employee.department}
        </p>
      </div>
    </Link>

  );
}
