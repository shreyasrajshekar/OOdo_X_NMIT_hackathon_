"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export default function ChangePasswordPage() {
  const router = useRouter();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // No backend yet — Phase 1 wires this to the change-password server action.
    router.push("/employees");
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[25px] font-bold tracking-tight text-ink">
          Set a new password
        </h1>
        <p className="mt-1 font-body text-[15px] text-ink/70">
          This is your first sign-in. Choose a password only you know before
          continuing.
        </p>
      </div>

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-semibold text-ink">
            New password
          </span>
          <input
            type="password"
            className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-semibold text-ink">
            Confirm new password
          </span>
          <input
            type="password"
            className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
          />
        </label>

        <Button type="submit" className="mt-2 w-full">
          Continue
        </Button>
      </form>
    </div>
  );
}
