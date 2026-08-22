import Link from "next/link";
import { DayflowMark } from "@/components/ui/dayflow-mark";

/**
 * Auth screens get a real front door: the product argument on the left, the
 * form on the right. The card itself is unchanged — only what surrounds it.
 * Below lg the panel collapses to a compact band so the form stays first.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-[1.05fr_minmax(0,0.95fr)]">
      <aside className="relative hidden overflow-hidden bg-primary px-14 py-12 text-paper lg:flex lg:flex-col lg:justify-between">
        {/* Plum wash, kept inside the hue the way the palette asks. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            backgroundImage:
              "radial-gradient(120% 90% at 12% -10%, rgba(135,90,123,0.85) 0%, transparent 62%), radial-gradient(90% 70% at 100% 100%, rgba(32,26,30,0.5) 0%, transparent 60%)",
          }}
        />

        <div className="relative">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 font-display text-[19px] font-extrabold tracking-[-0.02em] text-paper"
          >
            <DayflowMark size={32} plated priority />
            Dayflow
          </Link>
        </div>

        <div className="relative max-w-[42ch]">
          <p className="enter mb-5 font-mono text-[10px] uppercase tracking-[0.18em] text-paper/55">
            Odoo × NMIT
          </p>
          <h1
            className="enter max-w-[25ch] font-display text-[46px] font-extrabold leading-[1.04] tracking-[-0.03em]"
            style={{ "--enter-delay": "70ms" } as React.CSSProperties}
          >
            Every workday, perfectly aligned.
          </h1>
          <p
            className="enter mt-5 max-w-[40ch] font-body text-[16px] leading-relaxed text-paper/75"
            style={{ "--enter-delay": "140ms" } as React.CSSProperties}
          >
            A role-based HRMS where attendance is the input to payroll, not just
            a log of it.
          </p>
        </div>

        <ul
          className="enter relative space-y-3 border-t border-paper/15 pt-6"
          style={{ "--enter-delay": "210ms" } as React.CSSProperties}
        >
          {[
            "Change a wage — every component recomputes.",
            "Check in — the status dot flips, no refresh.",
            "Ask for a colleague's salary — the database returns nothing.",
          ].map((line, i) => (
            <li key={line} className="flex gap-3">
              <span className="mt-px font-mono text-[10px] tracking-[0.12em] text-paper/45">
                0{i + 1}
              </span>
              <span className="font-body text-[15px] leading-snug text-paper/80">
                {line}
              </span>
            </li>
          ))}
        </ul>
      </aside>

      <main className="flex items-center justify-center px-6 py-12">
        <div className="enter w-full max-w-md rounded-card border border-line/70 bg-paper/85 p-8 shadow-[0_1px_2px_rgba(92,61,84,0.04),0_24px_50px_-24px_rgba(92,61,84,0.18)] backdrop-blur-md">
          {children}
        </div>
      </main>
    </div>
  );
}
