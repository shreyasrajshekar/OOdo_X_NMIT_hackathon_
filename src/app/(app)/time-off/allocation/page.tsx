import { Button } from "@/components/ui/button";

export default function AllocationPage() {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">
            Allocation
          </h1>
          <p className="mt-1 font-body text-[15px] text-ink/70">
            Grant leave days to an employee for a validity period.
          </p>
        </div>
        <Button>Allocate days</Button>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-line py-24 text-center">
        <p className="font-display text-sm font-semibold text-ink">
          No allocations yet.
        </p>
        <p className="font-body text-[15px] text-ink/70">
          Grant an employee their first allocation.
        </p>
      </div>
    </div>
  );
}
