"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AuthBrand } from "@/components/ui/brand";
import { AuthField } from "@/components/ui/auth-field";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { companyInitials, generateLoginId } from "@/lib/login-id";

export default function SignUpPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [companyName, setCompanyName] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!logoFile) {
      setLogoPreview("");
      return;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

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
      // 1. Create the admin in Supabase Auth.
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
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

      // 2. Upload the company logo if one was chosen.
      let logoUrl = "";
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `${userId}-${Math.random()
          .toString(36)
          .substring(2)}.${fileExt}`;
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

      // 3. Create the company. The stored code is the same 2-letter company
      //    prefix every Login ID is built from (Odoo India -> OI).
      const code = companyInitials(companyName);
      const { data: companyData } = await supabase
        .from("companies")
        .insert({
          name: companyName.trim(),
          code,
          logo_url: logoUrl || null,
        })
        .select()
        .single();

      const companyId = companyData?.id || crypto.randomUUID();

      // 4. Build the admin's Login ID: [CO][FIRST2][LAST2][YEAR][SERIAL]
      const nameParts = name.trim().split(/\s+/).filter(Boolean);
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

      // 5. Create the admin employee row.
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
        // The admin chose this password themselves, so no forced reset.
        must_change_password: false,
      });

      if (empError) {
        console.error("Employee row insertion error:", empError.message);
      }

      // 6. Seed an empty resume record.
      await supabase.from("employee_resume").insert({
        employee_id: userId,
        about: `HR Admin at ${companyName.trim()}.`,
        skills: [],
        certifications: [],
      });

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
          label="Company Name"
          value={companyName}
          onChange={setCompanyName}
          disabled={loading}
          autoComplete="organization"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            disabled={loading}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            title="Upload Logo"
            aria-label="Upload Logo"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-card bg-plum text-paper transition-colors hover:bg-primary disabled:opacity-50"
          >
            <UploadIcon />
          </button>
        </AuthField>

        {logoFile && (
          <div className="-mt-3 flex items-center gap-2">
            {logoPreview && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoPreview}
                alt="Logo preview"
                className="h-8 w-8 rounded-card border border-line object-contain"
              />
            )}
            <span className="truncate font-display text-xs text-ink/70">
              {logoFile.name}
            </span>
            <button
              type="button"
              onClick={() => setLogoFile(null)}
              className="font-display text-xs font-semibold text-warn"
            >
              Remove
            </button>
          </div>
        )}

        <AuthField
          label="Name"
          value={name}
          onChange={setName}
          disabled={loading}
          autoComplete="name"
        />

        <AuthField
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          disabled={loading}
          autoComplete="email"
        />

        <AuthField
          label="Phone"
          type="tel"
          value={phone}
          onChange={setPhone}
          disabled={loading}
          autoComplete="tel"
        />

        <PasswordInput
          label="Password"
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
          {loading ? "Creating company…" : "Sign Up"}
        </Button>
      </form>

      <p className="text-center font-body text-[15px] text-ink/70">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="font-semibold text-primary underline-offset-2 hover:underline"
        >
          Sign In
        </Link>
      </p>
    </div>
  );
}

function UploadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
