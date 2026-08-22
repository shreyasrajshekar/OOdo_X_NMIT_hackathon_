"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

export default function ChangePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg("");

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // 1. Update password in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.updateUser({
        password: password,
      });

      if (authError) {
        setErrorMsg(authError.message);
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;
      if (userId) {
        // 2. Set must_change_password = false in the employees table
        await supabase
          .from("employees")
          .update({ must_change_password: false })
          .eq("id", userId);
      }

      router.push("/employees");
    } catch (err) {
      setErrorMsg("An unexpected error occurred.");
      console.error(err);
    } finally {
      setLoading(false);
    }
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

      {errorMsg && (
        <div className="rounded border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
          {errorMsg}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-semibold text-ink">
            New password
          </span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={loading}
            className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-semibold text-ink">
            Confirm new password
          </span>
          <input
            type="password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            disabled={loading}
            className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
          />
        </label>

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? "Updating password..." : "Continue"}
        </Button>
      </form>
    </div>
  );
}

