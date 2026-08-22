export default async function PayrollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-plum">
          {id}
        </p>
        <h1 className="mt-1 font-display text-[30px] font-extrabold tracking-tight text-ink">
          Salary Info
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="rounded-card border border-line p-6">
          <h2 className="font-display text-lg font-bold text-ink">Wage</h2>
          <p className="mt-2 font-body text-[15px] text-ink/70">
            Wage type, monthly wage, yearly wage, working days, break hours.
          </p>
        </div>
        <div className="rounded-card border border-line p-6">
          <h2 className="font-display text-lg font-bold text-ink">
            Components
          </h2>
          <p className="mt-2 font-body text-[15px] text-ink/70">
            Component table with live-recalculating amounts.
          </p>
        </div>
        <div className="rounded-card border border-line p-6">
          <h2 className="font-display text-lg font-bold text-ink">
            Deductions
          </h2>
          <p className="mt-2 font-body text-[15px] text-ink/70">
            PF contribution and professional tax.
          </p>
        </div>
      </div>
    </div>
  );
}
