"use client";

export function Tabs({
  tabs,
  active,
  onChange,
}: {
  tabs: { key: string; label: string; disabled?: boolean }[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex gap-6 border-b border-line">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          disabled={tab.disabled}
          onClick={() => onChange(tab.key)}
          className={
            tab.key === active
              ? "border-b-2 border-primary pb-3 font-display text-sm font-semibold text-primary"
              : tab.disabled
                ? "pb-3 font-display text-sm font-semibold text-ink/30"
                : "pb-3 font-display text-sm font-semibold text-ink/60 hover:text-ink"
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
