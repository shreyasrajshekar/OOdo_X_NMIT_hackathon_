"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/field";

/**
 * Password field with the show/hide eye toggle from the auth wireframe.
 */
export function PasswordInput({
  label,
  value,
  onChange,
  disabled,
  required = true,
  autoComplete = "current-password",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
}) {
  const id = useId();
  const [visible, setVisible] = useState(false);

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-display text-sm font-semibold text-ink"
      >
        {label} :-
      </label>
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={cn(inputClass, "w-full pr-11")}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-plum transition-colors hover:text-primary"
        >
          <EyeIcon off={visible} />
        </button>
      </div>
    </div>
  );
}

function EyeIcon({ off }: { off: boolean }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="2.8" />
      {off && <line x1="3.5" y1="20.5" x2="20.5" y2="3.5" />}
    </svg>
  );
}
