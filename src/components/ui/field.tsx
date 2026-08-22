export const inputClass =
  "rounded-card border border-line bg-paper px-3 py-2 font-display text-sm text-ink " +
  "transition-colors placeholder:text-ink/35 hover:border-plum/40 focus:border-plum " +
  "disabled:cursor-not-allowed disabled:opacity-60";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display text-sm font-semibold text-ink">
        {label}
      </span>
      {children}
      {hint ? (
        <span className="font-body text-[13px] leading-snug text-ink/55">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
