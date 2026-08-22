import { Button } from "@/components/ui/button";

export default function TimeOffPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">
            Time Off
          </h1>
          <p className="mt-1 font-body text-[15px] text-ink/70">
            Apply for leave and track your balance.
          </p>
        </div>
        <Button>New request</Button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-card border border-line p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
            Paid available
          </p>
          <p className="mt-2 font-display text-[30px] font-extrabold tabular-nums text-ink">
            0
          </p>
        </div>
        <div className="rounded-card border border-line p-6">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
            Sick available
          </p>
          <p className="mt-2 font-display text-[30px] font-extrabold tabular-nums text-ink">
            0
          </p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line py-24 text-center">
        <p className="font-display text-sm font-semibold text-ink">
          No time off yet.
        </p>
        <p className="font-body text-[15px] text-ink/70">
          Apply for your first leave.
        </p>
      </div>
    </div>
  );
}
