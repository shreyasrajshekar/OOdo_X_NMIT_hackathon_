"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthBrand } from "@/components/ui/brand";
import { AuthField } from "@/components/ui/auth-field";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";

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

      // A Login ID (e.g. OIJODO20220001) has no "@" — resolve it to the
      // employee's work email before handing it to Supabase Auth.
      if (!emailInput.includes("@")) {
        const { data, error } = await supabase
          .from("employees")
          .select("work_email")
          .eq("login_id", emailInput.toUpperCase())
          .maybeSingle();

        if (error) {
          console.warn("Error looking up login ID:", error.message);
        }

        if (!data?.work_email) {
          setErrorMsg("No account found for that Login ID.");
          setLoading(false);
          return;
        }

        emailInput = data.work_email;
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

      // Employees created by HR/Admin start on a system-generated password
      // and must replace it before they reach the app.
      const userId = authData.user?.id;
      if (userId) {
        const { data: employee } = await supabase
          .from("employees")
          .select("must_change_password")
          .eq("id", userId)
          .maybeSingle();

        if (employee?.must_change_password) {
          router.push("/change-password");
          return;
        }
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
