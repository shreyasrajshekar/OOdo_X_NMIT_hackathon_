type Status = "present" | "leave" | "absent";

const STATUS: Record<Status, { label: string; className: string }> = {
  present: { label: "Present", className: "bg-success" },
  leave: { label: "On leave", className: "bg-plum" },
  absent: { label: "Absent", className: "bg-warn" },
};

export function StatusDot({ status }: { status: Status }) {
  const { label, className } = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`h-2.5 w-2.5 rounded-full ${className}`} aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}
