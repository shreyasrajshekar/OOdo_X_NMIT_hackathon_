"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useDemoSession } from "@/components/demo-session-provider";
import { employeeInitials, employeeName } from "@/lib/mock-data";
import { supabase } from "@/lib/supabase";
import { checkInEmployee, checkOutEmployee, fetchAttendanceRecords } from "@/lib/supabase-db";

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
  const { role, currentEmployee, setRole } = useDemoSession();
  const [checkedIn, setCheckedIn] = useState(false);
  const [since, setSince] = useState<Date | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!currentEmployee) return;
    const workDate = new Date().toISOString().split("T")[0];
    
    // Check if user is checked in today
    fetchAttendanceRecords(currentEmployee.id, workDate.slice(0, 7)).then((records) => {
      const todayRecord = records.find((r) => r.date === workDate);
      if (todayRecord && todayRecord.checkIn) {
        if (todayRecord.checkOut) {
          setCheckedIn(false);
          setSince(null);
        } else {
          setCheckedIn(true);
          setSince(new Date(todayRecord.checkIn));
        }
      } else {
        setCheckedIn(false);
        setSince(null);
      }
    }).catch(err => {
      console.warn("Failed to fetch today's checkin status from Supabase:", err);
    });
  }, [currentEmployee]);

  async function toggleCheckIn() {
    const workDate = new Date().toISOString().split("T")[0];
    if (checkedIn) {
      const checkInTime = since ? since.getTime() : new Date().getTime();
      const checkOutTime = new Date().getTime();
      const elapsedHours = (checkOutTime - checkInTime) / 3600000;
      const breakHours = 1;
      const workHours = Math.max(0, elapsedHours - breakHours);
      const extraHours = Math.max(0, workHours - 8);

      const success = await checkOutEmployee(currentEmployee.id, workDate, workHours, extraHours);
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
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-display text-sm font-semibold text-ink hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={toggleCheckIn}
            className="flex items-center gap-2 rounded-pill border border-line px-3 py-1.5"
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${checkedIn ? "bg-success" : "bg-warn"}`}
              aria-hidden
            />
            <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink">
              {checkedIn && since
                ? `Since ${formatTime(since)}`
                : "Check in"}
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
                className="absolute right-0 top-11 z-20 w-56 rounded-card border border-line bg-paper p-2"
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
                    {role === "admin" ? "Admin" : "Employee"}
                  </p>
                </div>

                <Link
                  href="/me"
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-card px-2 py-1.5 font-display text-sm text-ink hover:bg-line/60"
                >
                  My Profile
                </Link>

                <div className="my-2 border-t border-line" />

                <p className="px-2 pb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/50">
                  Demo: view as
                </p>
                <button
                  type="button"
                  onClick={() => setRole("admin")}
                  className={`block w-full rounded-card px-2 py-1.5 text-left font-display text-sm ${
                    role === "admin" ? "text-primary" : "text-ink hover:bg-line/60"
                  }`}
                >
                  Admin (Aditi Rao)
                </button>
                <button
                  type="button"
                  onClick={() => setRole("employee")}
                  className={`block w-full rounded-card px-2 py-1.5 text-left font-display text-sm ${
                    role === "employee" ? "text-primary" : "text-ink hover:bg-line/60"
                  }`}
                >
                  Employee (Priya Sharma)
                </button>

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
    </header>
  );
}
