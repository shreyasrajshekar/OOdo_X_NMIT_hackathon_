"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { generateLoginId } from "@/lib/login-id";

export default function SignUpPage() {
  const router = useRouter();
  const [companyName, setCompanyName] = useState("");
  const [adminName, setAdminName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
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
      // 1. Sign up user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        setErrorMsg(authError.message);
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        setErrorMsg("Failed to retrieve user ID from signup.");
        setLoading(false);
        return;
      }

      // 2. Upload Logo to Storage if present
      let logoUrl = "";
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${userId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("logos")
          .upload(fileName, logoFile);

        if (!uploadError && uploadData) {
          const { data: publicUrlData } = supabase.storage
            .from("logos")
            .getPublicUrl(uploadData.path);
          logoUrl = publicUrlData?.publicUrl || "";
        }
      }

      // 3. Create Company Row
      // Code is first two letters of company name as per spec
      const code = (companyName.trim().split(/\s+/).filter(Boolean)[0] ?? "CO").substring(0, 2).toUpperCase();
      const { data: companyData } = await supabase
        .from("companies")
        .insert({
          name: companyName,
          code: code.padEnd(2, "X"),
          logo_url: logoUrl || null,
        })
        .select()
        .single();

      const companyId = companyData?.id || crypto.randomUUID();

      // 4. Generate Login ID for Admin Employee
      const nameParts = adminName.trim().split(/\s+/);
      const firstName = nameParts[0] || "Admin";
      const lastName = nameParts.slice(1).join(" ") || "User";
      const joiningYear = new Date().getFullYear();
      
      const loginId = generateLoginId({
        companyName,
        firstName,
        lastName,
        joiningYear,
        serial: 1,
      });

      // 5. Create Employee Row (with Admin role)
      const { error: empError } = await supabase.from("employees").insert({
        id: userId,
        company_id: companyId,
        login_id: loginId,
        first_name: firstName,
        last_name: lastName,
        work_email: email.trim(),
        phone: phone.trim() || null,
        role: "admin",
        joining_date: new Date().toISOString().split("T")[0],
        must_change_password: false, // Set false for signing up admin
      });

      if (empError) {
        console.error("Employee row insertion error:", empError.message);
      }

      // 6. Create employee resume stub
      await supabase.from("employee_resume").insert({
        employee_id: userId,
        about: `HR Admin at ${companyName}.`,
        skills: [],
        certifications: [],
      });

      // Redirect on success
      router.push("/employees");
    } catch (err) {
      setErrorMsg("An unexpected error occurred during registration.");
      console.error(err);
    } finally {

      setLoading(false);
    }
  }

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

      {errorMsg && (
        <div className="rounded border border-warn/30 bg-warn/10 p-3 text-sm text-warn">
          {errorMsg}
        </div>
      )}

      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-semibold text-ink">
            Company name
          </span>
          <input
            type="text"
            required
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            disabled={loading}
            className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-semibold text-ink">
            Admin name
          </span>
          <input
            type="text"
            required
            value={adminName}
            onChange={(e) => setAdminName(e.target.value)}
            disabled={loading}
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
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-display text-sm font-semibold text-ink">
              Phone
            </span>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
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
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              className="rounded-card border border-line px-3 py-2 font-display text-sm text-ink outline-none focus:border-plum"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="font-display text-sm font-semibold text-ink">
              Confirm password
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
        </div>

        <label className="flex flex-col gap-1.5">
          <span className="font-display text-sm font-semibold text-ink">
            Company logo
          </span>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            disabled={loading}
            className="font-display text-sm text-ink/70 file:mr-3 file:rounded-pill file:border-0 file:bg-plum/20 file:px-4 file:py-2 file:font-display file:text-sm file:font-semibold file:text-primary"
          />
        </label>

        <Button type="submit" disabled={loading} className="mt-2 w-full">
          {loading ? "Creating company..." : "Create company"}
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

