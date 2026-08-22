"use client";

import { use, useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/demo-session-provider";
import { generatePayslip, type PayslipResult } from "@/app/actions/payroll";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function PayrollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { isAdmin, currentEmployee } = useSession();

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [result, setResult] = useState<PayslipResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // An employee may only ever see their own payslip; admins see anyone's.
  const allowed = isAdmin || currentEmployee?.id === id;

  const load = useCallback(async () => {
    setLoading(true);
    setSaved(false);
    setResult(await generatePayslip({ employeeId: id, month, year }));
    setLoading(false);
  }, [id, month, year]);

  useEffect(() => {
    if (allowed) void load();
  }, [allowed, load]);

  async function save() {
    setSaving(true);
    const r = await generatePayslip({ employeeId: id, month, year, persist: true });
    setResult(r);
    setSaved(r.ok);
    setSaving(false);
  }

  if (!allowed) {
    return (
      <div className="rounded-card border border-dashed border-line py-24 text-center">
        <p className="font-display text-sm font-semibold text-ink">
          You can only view your own payslip.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
            Payslip
          </p>
          <h1 className="mt-1 font-display text-[30px] font-extrabold tracking-tight text-ink">
            {result?.ok ? result.employeeName : "Payslip"}
          </h1>
          {result?.ok && (
            <p className="mt-1 font-body text-sm text-ink/60">
              {result.jobTitle} · {result.department} · {result.loginId}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="rounded-pill border border-line bg-paper px-3 py-1.5 font-display text-sm text-ink"
          >
            {MONTHS.map((m, i) => (
              <option key={m} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-pill border border-line bg-paper px-3 py-1.5 font-display text-sm text-ink"
          >
            {[year - 2, year - 1, year, year + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {isAdmin && (
            <Button type="button" onClick={save} disabled={saving || !result?.ok}>
              {saving ? "Saving…" : saved ? "Saved" : "Generate"}
            </Button>
          )}
        </div>
      </div>

      {loading && (
        <p className="font-body text-sm text-ink/60">Computing from attendance…</p>
      )}

      {!loading && result && !result.ok && (
        <div className="rounded-card border border-warn/30 bg-warn/10 p-4 font-display text-sm text-warn">
          {result.error}
        </div>
      )}

      {!loading && result?.ok && (
        <>
          {/* The whole point of the spec: these three numbers come from
              attendance, and they are what the money is scaled by. */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Working days" value={result.workingDays} />
            <Stat label="Payable days" value={result.payableDays} />
            <Stat
              label="Loss of pay"
              value={result.lopDays}
              tone={result.lopDays > 0 ? "warn" : undefined}
            />
          </div>

          {result.holidays.length > 0 && (
            <p className="font-body text-sm text-ink/70">
              <span className="font-semibold text-ink">
                {result.holidays.length} holiday
                {result.holidays.length > 1 ? "s" : ""}
              </span>{" "}
              already excluded from working days:{" "}
              {result.holidays
                .map((h) => `${h.name} (${h.date.slice(8)}/${h.date.slice(5, 7)})`)
                .join(", ")}
              .
            </p>
          )}

          {result.lopDays > 0 && (
            <p className="font-body text-sm text-ink/70">
              Loss of pay comes from{" "}
              {[
                result.breakdown.absentDays && `${result.breakdown.absentDays} absent day(s)`,
                result.breakdown.halfDays && `${result.breakdown.halfDays} half day(s) at 0.5`,
                result.breakdown.unpaidLeaveDays &&
                  `${result.breakdown.unpaidLeaveDays} unpaid leave day(s)`,
              ]
                .filter(Boolean)
                .join(", ")}
              .
            </p>
          )}

          <section className="overflow-hidden rounded-card border border-line">
            <table className="w-full text-left">
              <thead className="bg-line/40">
                <tr>
                  {["Earnings", "Full month", "This month"].map((c) => (
                    <th
                      key={c}
                      className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/60"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.earnings.map((e) => (
                  <tr key={e.code} className="border-t border-line/70">
                    <td className="px-4 py-2.5 font-body text-sm text-ink">{e.name}</td>
                    <td className="px-4 py-2.5 font-body text-sm text-ink/50">
                      {formatINR(e.full)}
                    </td>
                    <td className="px-4 py-2.5 font-body text-sm text-ink">
                      {formatINR(e.prorated)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-line bg-line/20">
                  <td className="px-4 py-2.5 font-display text-sm font-bold text-ink">Gross</td>
                  <td />
                  <td className="px-4 py-2.5 font-display text-sm font-bold text-ink">
                    {formatINR(result.gross)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="overflow-hidden rounded-card border border-line">
            <table className="w-full text-left">
              <thead className="bg-line/40">
                <tr>
                  {["Deductions", "Amount"].map((c) => (
                    <th
                      key={c}
                      className="px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink/60"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.deductions.map((d) => (
                  <tr key={d.code} className="border-t border-line/70">
                    <td className="px-4 py-2.5 font-body text-sm text-ink">{d.name}</td>
                    <td className="px-4 py-2.5 font-body text-sm text-ink">
                      {formatINR(d.amount)}
                    </td>
                  </tr>
                ))}
                <tr className="border-t border-line bg-line/20">
                  <td className="px-4 py-2.5 font-display text-sm font-bold text-ink">
                    Total deductions
                  </td>
                  <td className="px-4 py-2.5 font-display text-sm font-bold text-ink">
                    {formatINR(result.totalDeduct)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <div className="flex items-center justify-between rounded-card bg-primary px-5 py-4 text-paper">
            <span className="font-display text-sm font-bold uppercase tracking-[0.08em]">
              Net pay
            </span>
            <span className="font-display text-[26px] font-extrabold tracking-tight">
              {formatINR(result.netPay)}
            </span>
          </div>

          <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/40">
            {result.reference} · {result.periodStart} to {result.periodEnd}
          </p>
        </>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "warn";
}) {
  return (
    <div className="rounded-card border border-line px-4 py-3">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink/55">{label}</p>
      <p
        className={`mt-1 font-display text-[26px] font-extrabold tracking-tight ${
          tone === "warn" ? "text-warn" : "text-ink"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
