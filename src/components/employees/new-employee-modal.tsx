"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/modal";
import { Field, inputClass } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { generateLoginId, nextSerial } from "@/lib/login-id";
import { generateTempPassword } from "@/lib/password";
import {
  createEmployeeAccount,
  resendEmployeeCredentials,
} from "@/app/actions/employees";
import { fetchCompanyName } from "@/lib/supabase-db";
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
  mobile: string;
  role: "employee" | "admin";
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
  mobile: "",
  role: "employee",
  department: "Engineering",
  jobTitle: "",
  manager: "",
  joiningDate: new Date().toISOString().slice(0, 10),
  monthlyWage: "",
};

type Created = {
  /** Needed to reset the password when HR resends. */
  userId?: string;
  firstName: string;
  loginId: string;
  tempPassword: string;
  email: string;
  emailSent: boolean;
  emailError?: string;
};

export function NewEmployeeModal({
  open,
  onClose,
  existingLoginIds,
  onCreated,
  companyPrefix,
}: {
  open: boolean;
  onClose: () => void;
  existingLoginIds: string[];
  onCreated: (employee: Employee) => void;
  /** Two-letter company prefix, taken from the signed-in admin's Login ID. */
  companyPrefix?: string;
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [created, setCreated] = useState<Created | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [companyName, setCompanyName] = useState(COMPANY_NAME);
  const [copied, setCopied] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNote, setResendNote] = useState("");

  useEffect(() => {
    if (!open) {
      setForm(EMPTY_FORM);
      setCreated(null);
      setSubmitting(false);
      setErrorMsg("");
      setCopied(false);
      return;
    }
    fetchCompanyName().then(setCompanyName).catch(() => {});
  }, [open]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.firstName || !form.lastName || !form.workEmail) return;

    setSubmitting(true);
    setErrorMsg("");

    const joiningYear = new Date(form.joiningDate).getFullYear();
    const serial = nextSerial(existingLoginIds, joiningYear);
    const loginId = generateLoginId({
      companyName,
      companyPrefix,
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
      mobile: form.mobile,
      role: form.role,
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

    try {
      // 1. Create the login with the system-generated password and email the
      //    credentials to the new user.
      const account = await createEmployeeAccount({
        email: form.workEmail.trim(),
        password: tempPassword,
        firstName: form.firstName,
        lastName: form.lastName,
        loginId,
        companyName,
      });

      if (account.error) {
        setErrorMsg(`Could not create the login: ${account.error}`);
        setSubmitting(false);
        return;
      }

      // 2. Insert the employee record, keyed to that Auth user.
      const { createEmployeeInDb } = await import("@/lib/supabase-db");
      const savedEmp = await createEmployeeInDb(
        employee,
        undefined,
        account.userId,
      );

      onCreated(savedEmp);
      setCreated({
        userId: account.userId,
        firstName: form.firstName.trim(),
        loginId,
        tempPassword,
        email: form.workEmail.trim(),
        emailSent: account.emailSent,
        emailError: account.emailError,
      });
    } catch (err) {
      console.error("Failed to create employee:", err);
      setErrorMsg("Could not save the employee. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="Add user">
      {created ? (
        <div className="flex flex-col gap-4">
          {created.emailSent ? (
            <div className="rounded-card border border-success/30 bg-success/10 p-3">
              <p className="font-display text-sm font-semibold text-ink">
                Credentials emailed to {created.email}
              </p>
              <p className="mt-1 font-body text-[15px] text-ink/70">
                They&apos;ll be asked to set their own password on first
                sign-in.
              </p>
            </div>
          ) : (
            <div className="rounded-card border border-warn/30 bg-warn/10 p-3">
              <p className="font-display text-sm font-semibold text-warn">
                The account was created, but the email didn&apos;t send.
              </p>
              <p className="mt-1 font-body text-[15px] text-ink/70">
                {created.emailError || "Unknown mail error."} Copy the
                credentials below and pass them on yourself.
              </p>
            </div>
          )}

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

          {/* Always offered, even on a successful send: "sent" only means
              Resend accepted it. Spam filters, typo'd addresses and unverified
              sender domains all end with the employee having no credentials
              and HR believing they were delivered. */}
          <div className="rounded-card border border-line bg-line/20 p-4">
            <p className="font-display text-sm font-semibold text-ink">
              {created.emailSent ? "Didn't arrive?" : "Pass these on yourself"}
            </p>
            <p className="mt-1 font-body text-[15px] text-ink/70">
              {created.emailSent
                ? "Check their spam folder first. You can resend with a fresh password, or hand the details over directly."
                : "Copy the credentials above and give them to the employee through a channel you trust."}
            </p>

            {resendNote && (
              <p className="mt-3 font-body text-[15px] text-plum">{resendNote}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  navigator.clipboard?.writeText(
                    `Login ID: ${created.loginId}\nPassword: ${created.tempPassword}\nSign in: ${
                      process.env.NEXT_PUBLIC_APP_URL || window.location.origin
                    }/sign-in`,
                  );
                  setCopied(true);
                }}
              >
                {copied ? "Copied" : "Copy credentials"}
              </Button>

              {created.userId && (
                <Button
                  type="button"
                  variant="secondary"
                  disabled={resending}
                  onClick={async () => {
                    setResending(true);
                    setResendNote("");
                    // A resend issues a *new* password: the old one is
                    // overwritten in Auth, so the panel above has to show the
                    // new value or HR would read out a dead password.
                    const nextPassword = generateTempPassword();
                    const r = await resendEmployeeCredentials({
                      userId: created.userId!,
                      email: created.email,
                      firstName: created.firstName,
                      loginId: created.loginId,
                      companyName,
                      password: nextPassword,
                    });
                    setCreated({
                      ...created,
                      tempPassword: nextPassword,
                      emailSent: r.emailSent,
                      emailError: r.emailError,
                    });
                    setCopied(false);
                    setResendNote(
                      r.emailSent
                        ? `Resent to ${created.email} with a new password — the one above is current.`
                        : `Still not sending: ${r.emailError || "unknown mail error"}. The password above has been reset, so use that one.`,
                    );
                    setResending(false);
                  }}
                >
                  {resending ? "Resending…" : "Resend email"}
                </Button>
              )}
            </div>
          </div>

          <Button type="button" onClick={onClose}>
            Done
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <p className="font-body text-[15px] text-ink/70">
            The system generates the Login ID and first password, then emails
            both to the new user.
          </p>

          {errorMsg && (
            <div
              role="alert"
              className="rounded-card border border-warn/30 bg-warn/10 p-3 font-display text-sm text-warn"
            >
              {errorMsg}
            </div>
          )}

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
            <Field label="Mobile">
              <input
                type="tel"
                className={inputClass}
                value={form.mobile}
                onChange={(e) => update("mobile", e.target.value)}
              />
            </Field>
            <Field label="Access level">
              <select
                className={inputClass}
                value={form.role}
                onChange={(e) =>
                  update("role", e.target.value as FormState["role"])
                }
              >
                <option value="employee">Employee</option>
                <option value="admin">Admin / HR</option>
              </select>
            </Field>
          </div>

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

          <Button type="submit" disabled={submitting} className="mt-2 w-full">
            {submitting ? "Creating account…" : "Create user & send email"}
          </Button>
        </form>
      )}
    </Modal>
  );
}
