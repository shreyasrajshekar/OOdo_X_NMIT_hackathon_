"use client";

import Link from "next/link";
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
    if (checkedIn) {
      const checkInTime = since ? since.getTime() : Date.now();
      const elapsedHours = (Date.now() - checkInTime) / 3600000;
      const breakHours = 1;
      const workHours = Math.max(0, elapsedHours - breakHours);
      const extraHours = Math.max(0, workHours - 8);

      const success = await checkOutEmployee(
        currentEmployee.id,
        workDate,
        workHours,
        extraHours,
      );
      if (success) {
        setCheckedIn(false);
        setSince(null);
      }
    } else {
      const success = await checkInEmployee(currentEmployee.id, workDate);
      if (success) {
        setCheckedIn(true);
        setSince(new Date());
      }
    }
  }

  async function handleLogOut() {
    setMenuOpen(false);
    await supabase.auth.signOut();
    router.push("/sign-in");
  }

  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/employees"
          className="font-display text-lg font-extrabold tracking-tight text-primary"
        >
          Dayflow
        </Link>

        <nav className="flex items-center gap-8">
          {LINKS.map((link) => {
            const active = pathname?.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`font-display text-sm font-semibold hover:text-primary ${
                  active ? "text-primary" : "text-ink"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {canAddUsers && (
            <button
              type="button"
              onClick={openAddUser}
              className="flex h-9 items-center gap-1.5 rounded-pill bg-primary px-4 font-display text-sm font-semibold text-paper transition-colors hover:bg-primary/90"
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
            className="flex items-center gap-2 rounded-pill border border-line px-3 py-1.5"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                checkedIn ? "bg-success" : "bg-warn"
              }`}
              aria-hidden
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink">
              {checkedIn && since ? `Since ${formatTime(since)}` : "Check in"}
            </span>
          </button>

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
