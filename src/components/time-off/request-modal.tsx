"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, inputClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import {
  LEAVE_TYPES,
  businessDaysBetween,
  employeeName,
  today,
  type Employee,
  type LeaveRequest,
  type LeaveTypeCode,
} from "@/lib/mock-data";

export function TimeOffRequestModal({
  open,
  onClose,
  employee,
  initialDate,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  employee: Employee;
  initialDate?: string;
  onSubmit: (request: LeaveRequest) => void;
}) {
  const [leaveType, setLeaveType] = useState<LeaveTypeCode>("PAID");
  const [startDate, setStartDate] = useState(initialDate ?? today());
  const [endDate, setEndDate] = useState(initialDate ?? today());
  const [dayCount, setDayCount] = useState(1);
  const [remarks, setRemarks] = useState("");
  const [attachment, setAttachment] = useState<string | null>(null);
  const [manualDayCount, setManualDayCount] = useState(false);

  const type = LEAVE_TYPES.find((t) => t.code === leaveType)!;

  useEffect(() => {
    if (open) {
      setStartDate(initialDate ?? today());
      setEndDate(initialDate ?? today());
      setLeaveType("PAID");
      setRemarks("");
      setAttachment(null);
      setManualDayCount(false);
    }
  }, [open, initialDate]);

  useEffect(() => {
    if (!manualDayCount) {
      setDayCount(businessDaysBetween(startDate, endDate, employee.workingDaysPerWeek));
    }
  }, [startDate, endDate, manualDayCount, employee.workingDaysPerWeek]);

  const needsAttachment = type.requiresAttachment && dayCount > 2;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (needsAttachment && !attachment) return;

    // Call Supabase DB helper
    import("@/lib/supabase-db").then(({ createLeaveRequestInDb }) => {
      createLeaveRequestInDb({
        employeeId: employee.id,
        leaveType,
        startDate,
        endDate,
        dayCount,
        remarks,
      }).then((savedReq) => {
        if (savedReq) {
          onSubmit(savedReq);
        } else {
          onSubmit({
            id: `lr-${employee.id}-${Date.now()}`,
            employeeId: employee.id,
            leaveType,
            startDate,
            endDate,
            dayCount,
            remarks,
            status: "pending",
          });
        }
      });
    }).catch(err => {
      console.error("Failed to load supabase db client:", err);
      onSubmit({
        id: `lr-${employee.id}-${Date.now()}`,
        employeeId: employee.id,
        leaveType,
        startDate,
        endDate,
        dayCount,
        remarks,
        status: "pending",
      });
    });
    onClose();
  }

  return (
    <Modal open={open} onClose={onClose} title="New time off request">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Employee">
          <input
            disabled
            className={`${inputClass} bg-line/40 text-ink/60`}
            value={employeeName(employee)}
          />
        </Field>

        <Field label="Time off type">
          <select
            className={inputClass}
            value={leaveType}
            onChange={(e) => setLeaveType(e.target.value as LeaveTypeCode)}
          >
            {LEAVE_TYPES.map((t) => (
              <option key={t.code} value={t.code}>
                {t.name}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="From">
            <input
              type="date"
              className={inputClass}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </Field>
          <Field label="To">
            <input
              type="date"
              className={inputClass}
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </Field>
        </div>

        <Field label="Allocation (days)">
          <input
            type="number"
            min={0}
            step={0.5}
            className={inputClass}
            value={dayCount}
            onChange={(e) => {
              setManualDayCount(true);
              setDayCount(Number(e.target.value) || 0);
            }}
          />
        </Field>

        {type.requiresAttachment && (
          <Field
            label={`Attachment${needsAttachment ? " (required, more than 2 days)" : " (optional)"}`}
          >
            <input
              type="file"
              onChange={(e) => setAttachment(e.target.files?.[0]?.name ?? null)}
              className="font-display text-sm text-ink/70 file:mr-3 file:rounded-pill file:border-0 file:bg-plum/20 file:px-4 file:py-2 file:font-display file:text-sm file:font-semibold file:text-primary"
            />
          </Field>
        )}

        <Field label="Remarks">
          <textarea
            rows={2}
            className={inputClass}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </Field>

        <div className="flex gap-3">
          <Button type="submit" className="flex-1">
            Submit
          </Button>
          <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
            Discard
          </Button>
        </div>
      </form>
    </Modal>
  );
}
