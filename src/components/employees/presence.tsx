import { Plane } from "lucide-react";
import { type AttendanceRecord } from "@/lib/mock-data";

export type Presence = "in" | "out" | "leave" | "absent";

export const PRESENCE_LABEL: Record<Presence, string> = {
  in: "In office",
  out: "Checked out",
  leave: "On leave",
  absent: "Not in",
};

/**
 * Where someone stands right now, read off today's attendance row.
 *
 * "absent" covers both a missing row and one with no check-in — from HR's side
 * they are the same thing: nobody has clocked in.
 */
export function presenceFor(record?: AttendanceRecord): Presence {
  if (!record) return "absent";
  if (record.status === "leave") return "leave";
  if (record.checkIn && !record.checkOut) return "in";
  if (record.checkOut) return "out";
  return "absent";
}

export function PresenceBadge({
  presence,
  className = "",
}: {
  presence: Presence;
  className?: string;
}) {
  const base =
    "inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-display text-xs font-semibold whitespace-nowrap";

  if (presence === "leave") {
    return (
      <span className={`${base} bg-plum/12 text-primary ${className}`}>
        <Plane className="h-3 w-3" aria-hidden />
        {PRESENCE_LABEL.leave}
      </span>
    );
  }

  const tone =
    presence === "in"
      ? { wrap: "bg-success/12 text-success", dot: "bg-success" }
      : presence === "out"
        ? { wrap: "bg-line text-ink/70", dot: "bg-plum" }
        : { wrap: "bg-line/60 text-ink/50", dot: "bg-ink/25" };

  return (
    <span className={`${base} ${tone.wrap} ${className}`}>
      <span className={`h-1.5 w-1.5 rounded-pill ${tone.dot}`} aria-hidden />
      {PRESENCE_LABEL[presence]}
    </span>
  );
}

/** Admin/HR against everyone else. */
export function RoleBadge({ role }: { role: "admin" | "employee" }) {
  return (
    <span
      className={`inline-flex items-center rounded-pill px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap ${
        role === "admin"
          ? "bg-primary/12 text-primary"
          : "bg-line text-ink/60"
      }`}
    >
      {role === "admin" ? "Admin / HR" : "Employee"}
    </span>
  );
}
