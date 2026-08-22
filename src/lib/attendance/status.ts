// Status derivation for a single date.
// Pure function; used by the grid dots and the attendance views.
//
// The `attendance` table stores only four statuses (its CHECK constraint):
// present | absent | half_day | leave. Weekends and holidays are never rows —
// they are derived at read time, so they live in DerivedStatus only.

/** Exactly what `attendance.status` may contain in the database. */
export type StoredStatus = "present" | "absent" | "half_day" | "leave";

/** What a calendar cell can show, including the two never-stored states. */
export type DerivedStatus = StoredStatus | "holiday" | "weekend";

export interface DayFacts {
  isWeekend: boolean;
  isHoliday: boolean;
  approvedLeave: boolean;
  row?: {
    check_in: string | null;
    /** `attendance.hours_worked`; null when the employee never checked out. */
    hours_worked: number | null;
  } | null;
}

export const STANDARD_DAY_HOURS = 8;
const HALF_DAY_MIN_HOURS = 4;

export function deriveStatus(facts: DayFacts): DerivedStatus {
  if (facts.isHoliday) return "holiday";
  if (facts.isWeekend) return "weekend";
  if (facts.approvedLeave) return "leave";

  const row = facts.row ?? null;
  if (!row?.check_in) return "absent";

  // Checked in but never checked out: hours_worked stays null. That is a
  // missed check-out, not an absence — the day still counts as present.
  if (row.hours_worked == null) return "present";
  if (row.hours_worked >= STANDARD_DAY_HOURS) return "present";
  if (row.hours_worked >= HALF_DAY_MIN_HOURS) return "half_day";
  return "half_day";
}

export type DotState = "present" | "leave" | "absent" | null;

/** Grid dot vocabulary. Weekend/holiday shows no dot. */
export function dotForStatus(s: DerivedStatus): DotState {
  switch (s) {
    case "present":
      return "present";
    case "half_day":
      return "present"; // in office, partial — still a green dot
    case "leave":
      return "leave";
    case "holiday":
    case "weekend":
      return null;
    default:
      return "absent";
  }
}
