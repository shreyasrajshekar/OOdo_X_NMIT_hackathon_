"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

      // If it's a login ID (doesn't contain @), resolve it to work email
      if (!emailInput.includes("@")) {
        const { data, error } = await supabase
          .from("employees")
          .select("work_email")
          .eq("login_id", emailInput.toUpperCase())
          .maybeSingle();

        if (error) {
          console.warn("Error looking up login ID:", error.message);
        }

        if (data?.work_email) {
          emailInput = data.work_email;
        }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: emailInput,
        password: password,
      });

      if (error) {
        setErrorMsg(error.message);
      } else {
        router.push("/employees");
      }
    } catch (err) {
      setErrorMsg("An unexpected error occurred during sign in.");
      console.error(err);
    } finally {
      setLoading(false);
    }
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

      {errorMsg && (
        <div className="rounded border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
          {errorMsg}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-semibold text-ink">
            Login ID or email
          </span>
          <input
            type="text"
            required
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            disabled={loading}
            className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-semibold text-ink">
            Password
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

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? "Signing in..." : "Sign in"}
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

