import { Button } from "@/components/ui/button";

const COLUMNS = ["Date", "Check In", "Check Out", "Work Hours", "Extra Hours"];

export default function AttendancePage() {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">
          Attendance
        </h1>
        <p className="mt-1 font-body text-[15px] text-ink/70">
          Check in when you arrive, check out when you leave.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-card border border-line py-10">
        <p className="font-mono text-sm uppercase tracking-[0.12em] text-ink/60">
          Not checked in
        </p>
        <div className="flex gap-3">
          <Button>Check in</Button>
          <Button variant="secondary" disabled>
            Check out
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-card border border-line">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line bg-line/60">
              {COLUMNS.map((col) => (
                <th
                  key={col}
                  className="px-4 py-3 font-display text-sm font-semibold text-ink"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td
                colSpan={COLUMNS.length}
                className="px-4 py-10 text-center font-body text-[15px] text-ink/70"
              >
                No attendance recorded yet.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
