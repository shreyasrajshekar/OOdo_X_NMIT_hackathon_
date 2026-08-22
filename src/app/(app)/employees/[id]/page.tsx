const TABS = ["Resume", "Private Info", "Salary Info", "Security"] as const;

export default async function EmployeeProfilePage({
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
          Employee profile
        </h1>
      </div>

      <div className="flex gap-6 border-b border-line">
        {TABS.map((tab, i) => (
          <button
            key={tab}
            type="button"
            className={
              i === 0
                ? "border-b-2 border-primary pb-3 font-display text-sm font-semibold text-primary"
                : "pb-3 font-display text-sm font-semibold text-ink/60"
            }
          >
            {tab}
          </button>
        ))}
      </div>

      <p className="font-body text-[15px] text-ink/70">
        Read-only profile content goes here.
      </p>
    </div>
  );
}
