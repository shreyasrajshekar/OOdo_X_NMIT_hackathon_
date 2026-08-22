import { type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
};

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center rounded-pill px-5 font-display text-sm font-semibold transition-colors",
        variant === "primary" && "bg-primary text-paper hover:bg-primary/90",
        variant === "secondary" &&
          "border border-plum/35 text-primary hover:bg-plum/10",
        className,
      )}
      {...props}
    />
  );
}
