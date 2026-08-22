export const inputClass =
  "rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum";

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-display text-sm font-semibold text-ink">
        {label}
      </span>
      {children}
    </label>
  );
}
