import Link from "next/link";

const LINKS = [
  { href: "/employees", label: "Employees" },
  { href: "/attendance", label: "Attendance" },
  { href: "/time-off", label: "Time Off" },
] as const;

export function Nav() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/employees"
          className="font-display text-lg font-extrabold tracking-tight text-primary"
        >
          Dayflow
        </Link>

        <nav className="flex items-center gap-8">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-display text-sm font-semibold text-ink hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          type="button"
          aria-label="Account menu"
          className="flex h-9 w-9 items-center justify-center rounded-pill bg-plum/20 font-mono text-xs uppercase tracking-wide text-primary"
        >
          RS
        </button>
      </div>
    </header>
  );
}
