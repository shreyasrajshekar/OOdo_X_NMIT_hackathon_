"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { inputClass } from "@/components/ui/field";

/**
 * Labelled text input used across the auth screens.
 * Labels carry the ":-" suffix from the auth wireframe.
 */
export function AuthField({
  label,
  type = "text",
  value,
  onChange,
  disabled,
  required = true,
  autoComplete,
  placeholder,
  children,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  required?: boolean;
  autoComplete?: string;
  placeholder?: string;
  /** Optional control rendered to the right of the input (e.g. upload button). */
  children?: React.ReactNode;
}) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={id}
        className="font-display text-sm font-semibold text-ink"
      >
        {label} :-
      </label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type={type}
          required={required}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={cn(inputClass, "min-w-0 flex-1")}
        />
        {children}
      </div>
    </div>
  );
}
