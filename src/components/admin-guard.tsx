"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useSession } from "@/components/demo-session-provider";

/**
 * Company-wide screens — the directory, everyone's attendance, the approvals
 * queue — are Admin/HR only. Employees who reach one by URL are sent back to
 * their own workspace rather than shown a page that isn't theirs.
 */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isAdmin) router.replace("/dashboard");
  }, [isAdmin, router]);

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="font-display text-sm font-semibold text-ink/70">
          Taking you back to your workspace…
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
