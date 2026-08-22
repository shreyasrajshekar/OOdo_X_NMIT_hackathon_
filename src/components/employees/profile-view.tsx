"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/components/demo-session-provider";
import { SalaryInfoPanel } from "@/components/employees/salary-info-panel";
import { Button } from "@/components/ui/button";
import { Field, inputClass } from "@/components/ui/field";
import { Tabs } from "@/components/ui/tabs";
import {
  employeeInitials,
  employeeName,
  type Employee,
} from "@/lib/mock-data";
import { fetchEmployeeById, updateEmployeeInDb } from "@/lib/supabase-db";
import { supabase } from "@/lib/supabase";

type TabKey = "resume" | "private" | "salary" | "security";

export function ProfileView({ id }: { id: string }) {
  const { isAdmin, currentEmployee } = useSession();
  const [employee, setEmployee] = useState<Employee | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<TabKey>("resume");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<{
    tone: "ok" | "error";
    text: string;
  } | null>(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    fetchEmployeeById(id).then((emp) => {
      setEmployee(emp);
      if (emp) {
        setSkills(emp.skills || []);
      }
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="font-display text-sm font-semibold text-ink/70 animate-pulse">
          Loading profile...
        </p>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line py-24 text-center">
        <p className="font-display text-sm font-semibold text-ink">
          Employee not found.
        </p>
        <p className="font-body text-[15px] text-ink/70">
          They may have been added this session only — refresh the directory.
        </p>
      </div>
    );
  }

  const isSelf = currentEmployee?.id === employee.id;
  // Private info: the owner and Admin/HR. Salary: Admin/HR, plus your own.
  // Security: only the owner can change their own password.
  const canViewPrivate = isAdmin || isSelf;
  const canViewSalary = isAdmin || isSelf;
  const canViewSecurity = isSelf;

  function addSkill() {
    const value = skillInput.trim();
    if (!value) return;
    const newSkills = [...skills, value];
    setSkills(newSkills);
    setSkillInput("");

    // Persist to Supabase
    updateEmployeeInDb(employee!.id, { skills: newSkills }).catch(err => {
      console.error("Failed to save skills updates to database:", err);
    });
  }


  async function handlePasswordChange(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordMsg(null);

    if (newPassword.length < 8) {
      setPasswordMsg({
        tone: "error",
        text: "Password must be at least 8 characters.",
      });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ tone: "error", text: "Passwords do not match." });
      return;
    }

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSavingPassword(false);

    if (error) {
      setPasswordMsg({ tone: "error", text: error.message });
      return;
    }

    setNewPassword("");
    setConfirmPassword("");
    setPasswordMsg({ tone: "ok", text: "Password updated." });
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-start gap-5">
        <div className="flex h-20 w-20 items-center justify-center rounded-pill bg-plum/20 font-mono text-2xl uppercase text-primary">
          {employeeInitials(employee)}
        </div>
        <div>
          <h1 className="font-display text-[30px] font-extrabold tracking-tight text-ink">
            {employeeName(employee)}
          </h1>
          <p className="mt-1 font-body text-[15px] text-ink/70">
            {employee.jobTitle} · {employee.department}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-6 gap-y-1 font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
            <span>{employee.loginId}</span>
            <span>{employee.workEmail}</span>
            <span>{employee.mobile}</span>
            <span>Manager: {employee.manager}</span>
            <span>{employee.location}</span>
          </div>
        </div>
      </div>

      <Tabs
        active={active}
        onChange={(key) => setActive(key as TabKey)}
        tabs={[
          { key: "resume", label: "Resume" },
          { key: "private", label: "Private Info", disabled: !canViewPrivate },
          { key: "salary", label: "Salary Info", disabled: !canViewSalary },
          { key: "security", label: "Security", disabled: !canViewSecurity },
        ]}
      />

      {active === "resume" && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-display text-sm font-semibold text-ink">
                About
              </h2>
              <p className="mt-1 font-body text-[15px] text-ink/70">
                {employee.about || "Nothing added yet."}
              </p>
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold text-ink">
                What I love about my job
              </h2>
              <p className="mt-1 font-body text-[15px] text-ink/70">
                {employee.loveAboutJob || "Nothing added yet."}
              </p>
            </div>
            <div>
              <h2 className="font-display text-sm font-semibold text-ink">
                Interests &amp; hobbies
              </h2>
              <p className="mt-1 font-body text-[15px] text-ink/70">
                {employee.interests || "Nothing added yet."}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <h2 className="font-display text-sm font-semibold text-ink">
                Skills
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-pill bg-plum/15 px-3 py-1 font-display text-xs font-semibold text-primary"
                  >
                    {skill}
                  </span>
                ))}
              </div>
              {isSelf && (
                <div className="mt-3 flex gap-2">
                  <input
                    value={skillInput}
                    onChange={(e) => setSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addSkill();
                      }
                    }}
                    placeholder="Add a skill"
                    className={`flex-1 ${inputClass}`}
                  />
                  <Button type="button" variant="secondary" onClick={addSkill}>
                    Add
                  </Button>
                </div>
              )}
            </div>

            <div>
              <h2 className="font-display text-sm font-semibold text-ink">
                Certifications
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {employee.certifications.length === 0 && (
                  <p className="font-body text-[15px] text-ink/70">
                    No certifications yet.
                  </p>
                )}
                {employee.certifications.map((cert) => (
                  <span
                    key={cert}
                    className="rounded-pill bg-line px-3 py-1 font-display text-xs font-semibold text-ink"
                  >
                    {cert}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {active === "private" && canViewPrivate && (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-sm font-semibold text-ink">
              Personal details
            </h2>
            <DetailRow label="Date of birth" value={employee.dob || "—"} />
            <DetailRow label="Address" value={employee.address || "—"} />
            <DetailRow label="Nationality" value={employee.nationality} />
            <DetailRow label="Personal email" value={employee.personalEmail || "—"} />
            <DetailRow label="Gender" value={employee.gender || "—"} />
            <DetailRow label="Marital status" value={employee.maritalStatus || "—"} />
            <DetailRow label="Date of joining" value={employee.joiningDate} />
          </div>
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-sm font-semibold text-ink">
              Bank details
            </h2>
            <DetailRow label="Account number" value={employee.bankAccountNo || "—"} />
            <DetailRow label="Bank name" value={employee.bankName || "—"} />
            <DetailRow label="IFSC code" value={employee.ifsc || "—"} />
            <DetailRow label="PAN no." value={employee.pan || "—"} />
            <DetailRow label="UAN no." value={employee.uan || "—"} />
            <DetailRow label="Employee code" value={employee.loginId} />
          </div>
        </div>
      )}

      {active === "salary" && canViewSalary && (
        <SalaryInfoPanel employee={employee} editable={isAdmin} />
      )}

      {active === "security" && canViewSecurity && (
        <form
          className="flex max-w-md flex-col gap-4"
          onSubmit={handlePasswordChange}
        >
          {passwordMsg && (
            <div
              role="alert"
              className={`rounded-card border p-3 font-display text-sm ${
                passwordMsg.tone === "ok"
                  ? "border-success/30 bg-success/10 text-ink"
                  : "border-warn/30 bg-warn/10 text-warn"
              }`}
            >
              {passwordMsg.text}
            </div>
          )}
          <Field label="New password">
            <input
              type="password"
              required
              autoComplete="new-password"
              className={inputClass}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </Field>
          <Field label="Confirm new password">
            <input
              type="password"
              required
              autoComplete="new-password"
              className={inputClass}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </Field>
          <Button type="submit" disabled={savingPassword} className="mt-2 w-full">
            {savingPassword ? "Updating…" : "Update password"}
          </Button>
        </form>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line pb-2">
      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
        {label}
      </span>
      <span className="font-display text-sm text-ink">{value}</span>
    </div>
  );
}
