import { toISODate, type LeaveRequest, type RequestStatus } from "@/lib/mock-data";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_CLASS: Record<RequestStatus, string> = {
  approved: "bg-success",
  pending: "bg-plum",
  rejected: "bg-warn",
};

function statusForDate(requests: LeaveRequest[], dateISO: string): RequestStatus | null {
  const match = requests.find((r) => dateISO >= r.startDate && dateISO <= r.endDate);
  return match?.status ?? null;
}

function MonthGrid({
  year,
  month,
  requests,
}: {
  year: number;
  month: number;
  requests: LeaveRequest[];
}) {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-card border border-line p-3">
      <p className="mb-2 font-display text-xs font-semibold text-ink">
        {MONTH_NAMES[month]}
      </p>
      <div className="grid grid-cols-7 gap-1">
        {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
          <span
            key={i}
            className="text-center font-mono text-[9px] uppercase text-ink/40"
          >
            {d}
          </span>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <span key={i} />;
          const dateISO = toISODate(new Date(year, month, day));
          const status = statusForDate(requests, dateISO);
          return (
            <span
              key={i}
              className={`flex h-5 w-5 items-center justify-center rounded-full font-mono text-[9px] tabular-nums ${
                status
                  ? `${STATUS_CLASS[status]} text-paper`
                  : "text-ink/50"
              }`}
            >
              {day}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export function YearCalendar({
  year,
  requests,
}: {
  year: number;
  requests: LeaveRequest[];
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: 12 }, (_, month) => (
        <MonthGrid key={month} year={year} month={month} requests={requests} />
      ))}
    </div>
  );
}

export function CalendarLegend() {
  const items: { label: string; className: string }[] = [
    { label: "Approved", className: "bg-success" },
    { label: "Pending", className: "bg-plum" },
    { label: "Refused", className: "bg-warn" },
  ];

  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className={`h-2.5 w-2.5 rounded-full ${item.className}`} />
          <span className="font-display text-sm text-ink">{item.label}</span>
        </div>
      ))}
    </div>
  );
}
