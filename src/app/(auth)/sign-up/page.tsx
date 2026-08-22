import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function SignUpPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[25px] font-bold tracking-tight text-ink">
          Create your company
        </h1>
        <p className="mt-1 font-body text-[15px] text-ink/70">
          You&apos;ll be the first admin. Employees are added from inside
          Dayflow, not by signing up themselves.
        </p>
      </div>

      <form className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-semibold text-ink">
            Company name
          </span>
          <input
            type="text"
            className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-semibold text-ink">
            Admin name
          </span>
          <input
            type="text"
            className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-display text-sm font-semibold text-ink">
              Email
            </span>
            <input
              type="email"
              className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-display text-sm font-semibold text-ink">
              Phone
            </span>
            <input
              type="tel"
              className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="font-display text-sm font-semibold text-ink">
              Password
            </span>
            <input
              type="password"
              className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-display text-sm font-semibold text-ink">
              Confirm password
            </span>
            <input
              type="password"
              className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-semibold text-ink">
            Company logo
          </span>
          <input
            type="file"
            accept="image/*"
            className="font-display text-sm text-ink/70 file:mr-3 file:rounded-pill file:border-0 file:bg-plum/20 file:px-4 file:py-2 file:font-display file:text-sm file:font-semibold file:text-primary"
          />
        </label>

        <Button type="submit" className="mt-2 w-full">
          Create company
        </Button>
      </form>

      <p className="font-body text-[15px] text-ink/70">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-primary">
          Sign in
        </Link>
      </p>
    </div>
  );
}
