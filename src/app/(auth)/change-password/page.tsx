"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthBrand } from "@/components/ui/brand";
import { PasswordInput } from "@/components/ui/password-input";
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

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      // 1. Replace the system-generated password.
      const { data: authData, error: authError } =
        await supabase.auth.updateUser({ password });

      if (authError) {
        setErrorMsg(authError.message);
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;
      if (userId) {
        // 2. Clear the forced-reset flag.
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
      <AuthBrand />

      <div>
        <h1 className="font-display text-[25px] font-bold tracking-tight text-ink">
          Set a new password
        </h1>
        <p className="mt-1 font-body text-[15px] text-ink/70">
          You signed in with the password the system generated for you. Choose
          one only you know before continuing.
        </p>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="rounded-card border border-warn/30 bg-warn/10 p-3 font-display text-sm text-warn"
        >
          {errorMsg}
        </div>
      )}

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <PasswordInput
          label="New Password"
          value={password}
          onChange={setPassword}
          disabled={loading}
          autoComplete="new-password"
        />
        <PasswordInput
          label="Confirm Password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          disabled={loading}
          autoComplete="new-password"
        />

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? "Updating password…" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
