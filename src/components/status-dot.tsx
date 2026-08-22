import { Plane } from "lucide-react";

type Status = "present" | "leave" | "absent";

export function StatusDot({ status }: { status: Status }) {
  if (status === "leave") {
    return (
      <span className="inline-flex items-center" title="On leave">
        <Plane className="h-3.5 w-3.5 text-plum" aria-hidden />
        <span className="sr-only">On leave</span>
      </span>
    );
  }

  const isPresent = status === "present";
  return (
    <span className="inline-flex items-center" title={isPresent ? "Present" : "Absent"}>
      <span
        className={`h-2.5 w-2.5 rounded-full ${isPresent ? "bg-success" : "bg-warn"}`}
        aria-hidden
      />
      <span className="sr-only">{isPresent ? "Present" : "Absent"}</span>
    </span>
  );
}
