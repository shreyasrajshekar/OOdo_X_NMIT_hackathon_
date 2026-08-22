"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function SignInPage() {
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // No backend yet — Phase 1 wires this to Supabase Auth.
    router.push("/employees");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[25px] font-bold tracking-tight text-ink">
          Sign in
        </h1>
        <p className="mt-1 font-body text-[15px] text-ink/70">
          Use your Login ID or work email.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-semibold text-ink">
            Login ID or email
          </span>
          <input
            type="text"
            className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-semibold text-ink">
            Password
          </span>
          <input
            type="password"
            className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
          />
        </label>

        <Button type="submit" className="mt-2 w-full">
          Sign in
        </Button>
      </form>

      <p className="font-body text-[15px] text-ink/70">
        Setting up a company?{" "}
        <Link href="/sign-up" className="font-semibold text-primary">
          Create an account
        </Link>
      </p>
    </div>
  );
}
