"use client";

import { useEffect, useState } from "react";
import { AllocationPanel } from "@/components/time-off/allocation-panel";
import { type LeaveAllocation } from "@/lib/mock-data";
import { fetchLeaveAllocations, grantLeaveAllocation } from "@/lib/supabase-db";
import { useDemoSession } from "@/components/demo-session-provider";

export default function AllocationPage() {
  const { currentEmployee } = useDemoSession();
  const [allocations, setAllocations] = useState<LeaveAllocation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentEmployee) return;
    fetchLeaveAllocations(currentEmployee.id).then((data) => {
      setAllocations(data);
      setLoading(false);
    });
  }, [currentEmployee]);

  async function handleGrant(a: Omit<LeaveAllocation, "id">) {
    const savedAlloc = await grantLeaveAllocation(a);
    if (savedAlloc) {
      setAllocations((current) => [...current, savedAlloc]);
    } else {
      // Fallback
      setAllocations((current) => [
        ...current,
        { ...a, id: `alloc-${a.employeeId}-${a.leaveType}-${Date.now()}` }
      ]);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="font-display text-sm font-semibold text-ink/70 animate-pulse">
          Loading allocations...
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">
          Allocation
        </h1>
        <p className="mt-1 font-body text-[15px] text-ink/70">
          Grant leave days to an employee for a validity period.
        </p>
      </div>

      <AllocationPanel
        allocations={allocations}
        onGrant={handleGrant}
      />
    </div>
  );
}

