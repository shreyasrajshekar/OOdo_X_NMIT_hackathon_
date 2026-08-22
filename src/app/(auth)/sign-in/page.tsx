"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthBrand } from "@/components/ui/brand";
import { AuthField } from "@/components/ui/auth-field";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { EMPLOYEES } from "@/lib/mock-data";


export default function SignInPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      let emailInput = identifier.trim();

      // Resolve Login ID (e.g. OIJODO20220001) to email locally via EMPLOYEES mapping
      if (!emailInput.includes("@")) {
        const matched = EMPLOYEES.find((e) => e.loginId.toUpperCase() === emailInput.toUpperCase());
        if (!matched) {
          setErrorMsg("No account found for that Login ID.");
          setLoading(false);
          return;
        }
        emailInput = matched.workEmail;
      }

      const { data: authData, error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password,
      });

      if (error) {
        setErrorMsg(error.message);
        setLoading(false);
        return;
      }

      // Check must_change_password flag directly in the user metadata
      const mustChange = authData.user?.user_metadata?.must_change_password;
      if (mustChange) {
        router.push("/change-password");
        return;
      }

      router.push("/employees");
    } catch (err) {
      setErrorMsg("An unexpected error occurred during sign in.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }


  return (
    <div className="flex flex-col gap-6">
      <AuthBrand />

      {errorMsg && (
        <div
          role="alert"
          className="rounded-card border border-warn/30 bg-warn/10 p-3 font-display text-sm text-warn"
        >
          {errorMsg}
        </div>
      )}

      <form className="flex flex-col gap-5" onSubmit={handleSubmit}>
        <AuthField
          label="Login Id/Email"
          value={identifier}
          onChange={setIdentifier}
          disabled={loading}
          autoComplete="username"
        />

        <PasswordInput
          label="Password"
          value={password}
          onChange={setPassword}
          disabled={loading}
          autoComplete="current-password"
        />

        <Button
          type="submit"
          disabled={loading}
          className="mt-2 w-full uppercase tracking-[0.08em]"
        >
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <p className="text-center font-body text-[15px] text-ink/70">
        Don&apos;t have an Account?{" "}
        <Link href="/sign-up" className="font-semibold text-primary underline-offset-2 hover:underline">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
