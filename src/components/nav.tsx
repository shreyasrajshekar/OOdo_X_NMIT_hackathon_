"use client";

import Link from "next/link";
import { DayflowMark } from "@/components/ui/dayflow-mark";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useSession } from "@/components/demo-session-provider";
import { useAdminActions } from "@/components/admin-actions-provider";
import { employeeInitials, employeeName } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import {
  checkInEmployee,
  checkOutEmployee,
  fetchAttendanceRecords,
} from "@/lib/supabase-db";
import NotificationBell from "@/components/automation/NotificationBell";

const LINKS = [
  { href: "/employees", label: "Employees" },
  { href: "/attendance", label: "Attendance" },
  { href: "/time-off", label: "Time Off" },
] as const;

function formatTime(date: Date) {
  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

export function Nav() {
  const router = useRouter();
  const pathname = usePathname();
  const { role, isAdmin, currentEmployee } = useSession();
  const { canAddUsers, openAddUser } = useAdminActions();
  const [checkedIn, setCheckedIn] = useState(false);
  const [since, setSince] = useState<Date | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!currentEmployee) return;
    const workDate = new Date().toISOString().split("T")[0];

    fetchAttendanceRecords(currentEmployee.id, workDate.slice(0, 7))
      .then((records) => {
        const todayRecord = records.find((r) => r.date === workDate);
        if (todayRecord?.checkIn && !todayRecord.checkOut) {
          setCheckedIn(true);
          setSince(new Date(todayRecord.checkIn));
        } else {
          setCheckedIn(false);
          setSince(null);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch today's check-in status:", err);
      });
  }, [currentEmployee]);

  async function toggleCheckIn() {
    const workDate = new Date().toISOString().split("T")[0];
    const now = new Date();

    if (checkedIn) {
      const records = await fetchAttendanceRecords(currentEmployee.id, workDate.slice(0, 7));
      const todayRecord = records.find((r) => r.date === workDate);
      
      let workHours = 8;
      if (todayRecord && todayRecord.checkIn) {
        const diffMs = now.getTime() - new Date(todayRecord.checkIn).getTime();
        workHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      }
      
      const ok = await checkOutEmployee(currentEmployee.id, workDate, workHours, 0);
      if (ok) {
        setCheckedIn(false);
        setSince(null);
        router.refresh();
      }
    } else {
      const ok = await checkInEmployee(currentEmployee.id, workDate);
      if (ok) {
        setCheckedIn(true);
        setSince(now);
        router.refresh();
      }
    }
  }

  async function handleLogOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line/60 backdrop-blur-md bg-paper/85 shadow-sm">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/employees"
          className="inline-flex items-center gap-2 font-display text-lg font-extrabold tracking-tight text-primary transition-opacity hover:opacity-90"
        >
          <DayflowMark size={28} priority />
          Dayflow
        </Link>

        <nav className="flex items-center gap-8">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-display text-sm font-semibold hover:text-primary transition-colors ${
                  active ? "text-primary font-bold" : "text-ink/80"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-4">
          {canAddUsers && (
            <button
              type="button"
              onClick={openAddUser}
              className="flex h-9 items-center gap-1.5 rounded-pill bg-primary px-4 font-display text-sm font-semibold text-paper hover:bg-primary/95 transition-all shadow-sm hover:shadow-md glow-button"
            >
              <span aria-hidden className="text-base leading-none">
                +
              </span>
              Add User
            </button>
          )}

          <button
            type="button"
            onClick={toggleCheckIn}
            className={`flex items-center gap-2 rounded-pill border px-3 py-1.5 transition-all shadow-sm hover:shadow-md ${
              checkedIn 
                ? "border-success/30 bg-success/5 hover:bg-success/10" 
                : "border-line bg-paper hover:bg-line/20"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                checkedIn ? "bg-success animate-pulse" : "bg-warn"
              }`}
              aria-hidden
            />
            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-ink/90">
              {checkedIn && since ? `Since ${formatTime(since)}` : "Check in"}
            </span>
          </button>

          <NotificationBell />

          <div className="relative">
            <button
              type="button"
              aria-label="Account menu"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex h-9 w-9 items-center justify-center rounded-pill bg-plum/20 font-mono text-xs uppercase tracking-wide text-primary"
            >
              {employeeInitials(currentEmployee)}
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 top-11 z-20 w-60 rounded-card border border-line bg-paper p-2"
                onMouseLeave={() => {
                  closeTimer.current = setTimeout(() => setMenuOpen(false), 150);
                }}
                onMouseEnter={() => {
                  if (closeTimer.current) clearTimeout(closeTimer.current);
                }}
              >
                <div className="px-2 py-1.5">
                  <p className="font-display text-sm font-semibold text-ink">
                    {employeeName(currentEmployee)}
                  </p>
                  <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/50">
                    {isAdmin ? "Admin / HR" : "Employee"} ·{" "}
                    {currentEmployee.loginId}
                  </p>
                </div>

                <Link
                  href="/me"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-card px-2 py-1.5 font-display text-sm text-ink hover:bg-line/60"
                >
                  My Profile
                </Link>

                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      openAddUser();
                    }}
                    className="block w-full rounded-card px-2 py-1.5 text-left font-display text-sm text-ink hover:bg-line/60"
                  >
                    Add user
                  </button>
                )}

                <div className="my-2 border-t border-line" />

                <button
                  type="button"
                  onClick={handleLogOut}
                  className="block w-full rounded-card px-2 py-1.5 text-left font-display text-sm text-warn hover:bg-line/60"
                >
                  Log Out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      <span className="sr-only">Signed in as {role}</span>
    </header>
  );
}
