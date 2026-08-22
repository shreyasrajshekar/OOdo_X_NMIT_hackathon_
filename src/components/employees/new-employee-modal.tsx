"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, inputClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { generateLoginId, nextSerial } from "@/lib/login-id";
import { generateTempPassword } from "@/lib/password";
import {
  COMPANY_NAME,
  DEPARTMENTS,
  type Department,
  type Employee,
} from "@/lib/mock-data";

type FormState = {
  firstName: string;
  lastName: string;
  workEmail: string;
  department: Department;
  jobTitle: string;
  manager: string;
  joiningDate: string;
  monthlyWage: string;
};

const EMPTY_FORM: FormState = {
  firstName: "",
  lastName: "",
  workEmail: "",
  department: "Engineering",
  jobTitle: "",
  manager: "",
  joiningDate: new Date().toISOString().slice(0, 10),
  monthlyWage: "",
};

export function NewEmployeeModal({
  open,
  onClose,
  existingLoginIds,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  existingLoginIds: string[];
  onCreated: (employee: Employee) => void;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [created, setCreated] = useState<{
    loginId: string;
    tempPassword: string;
  } | null>(null);

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setCreated(null);
    }
  }, [open]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.firstName || !form.lastName || !form.workEmail) return;

    const joiningYear = new Date(form.joiningDate).getFullYear();
    const serial = nextSerial(existingLoginIds, joiningYear);
    const loginId = generateLoginId({
      companyName: COMPANY_NAME,
      firstName: form.firstName,
      lastName: form.lastName,
      joiningYear,
      serial,
    });
    const tempPassword = generateTempPassword();

    const employee: Employee = {
      id: loginId.toLowerCase(),
      loginId,
      firstName: form.firstName,
      lastName: form.lastName,
      workEmail: form.workEmail,
      personalEmail: "",
      mobile: "",
      role: "employee",
      department: form.department,
      jobTitle: form.jobTitle || "—",
      manager: form.manager || "—",
      location: "—",
      joiningDate: form.joiningDate,
      dob: "",
      gender: "",
      maritalStatus: "",
      nationality: "Indian",
      address: "",
      bankAccountNo: "",
      bankName: "",
      ifsc: "",
      pan: "",
      uan: "",
      monthlyWage: Number(form.monthlyWage) || 0,
      workingDaysPerWeek: 5,
      breakHours: 1,
      about: "",
      loveAboutJob: "",
      interests: "",
      skills: [],
      certifications: [],
    };

    // Call Supabase DB helper
    import("@/lib/supabase-db").then(({ createEmployeeInDb }) => {
      createEmployeeInDb(employee).then((savedEmp) => {
        onCreated(savedEmp);
        setCreated({ loginId, tempPassword });
      });
    }).catch(err => {
      console.error("Failed to load supabase db client:", err);
      // Fallback
      onCreated(employee);
      setCreated({ loginId, tempPassword });
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="New employee">
      {created ? (
        <div className="flex flex-col gap-4">
          <p className="font-body text-[15px] text-ink/70">
            Credentials generated. This password will not be shown again —
            copy it now.
          </p>
          <div className="rounded-card border border-line p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
              Login ID
            </p>
            <p className="mt-1 font-mono text-sm font-semibold uppercase tracking-wide text-ink">
              {created.loginId}
            </p>
          </div>
          <div className="rounded-card border border-line p-4">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
              Temporary password
            </p>
            <p className="mt-1 font-mono text-sm font-semibold text-ink">
              {created.tempPassword}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              navigator.clipboard?.writeText(
                `Login ID: ${created.loginId}\nPassword: ${created.tempPassword}`,
              );
            }}
            variant="secondary"
          >
            Copy credentials
          </Button>
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <Field label="First name">
              <input
                required
                className={inputClass}
                value={form.firstName}
                onChange={(e) => update("firstName", e.target.value)}
              />
            </Field>
            <Field label="Last name">
              <input
                required
                className={inputClass}
                value={form.lastName}
                onChange={(e) => update("lastName", e.target.value)}
              />
            </Field>
          </div>

          <Field label="Work email">
            <input
              required
              type="email"
              className={inputClass}
              value={form.workEmail}
              onChange={(e) => update("workEmail", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Department">
              <select
                className={inputClass}
                value={form.department}
                onChange={(e) =>
                  update("department", e.target.value as Department)
                }
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Job title">
              <input
                className={inputClass}
                value={form.jobTitle}
                onChange={(e) => update("jobTitle", e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Joining date">
              <input
                type="date"
                className={inputClass}
                value={form.joiningDate}
                onChange={(e) => update("joiningDate", e.target.value)}
              />
            </Field>
            <Field label="Monthly wage">
              <input
                type="number"
                min={0}
                className={inputClass}
                value={form.monthlyWage}
                onChange={(e) => update("monthlyWage", e.target.value)}
              />
            </Field>
          </div>

          <Button type="submit" className="mt-2 w-full">
            Create employee
          </Button>
        </form>
      )}
    </Modal>
  );
}
