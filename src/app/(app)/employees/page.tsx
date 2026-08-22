import { Button } from "@/components/ui/button";

export default function EmployeesPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">
            Employees
          </h1>
          <p className="mt-1 font-body text-[15px] text-ink/70">
            Everyone at the company, in one place.
          </p>
        </div>
        <Button>New employee</Button>
      </div>

      <input
        type="search"
        placeholder="Search employees"
        className="w-full max-w-sm rounded-pill border border-line px-4 py-2 font-display text-sm text-ink outline-none focus:border-plum"
      />

      <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line py-24 text-center">
        <p className="font-display text-sm font-semibold text-ink">
          No employees yet.
        </p>
        <p className="font-body text-[15px] text-ink/70">
          Add your first employee to get started.
        </p>
      </div>
    </div>
  );
}
