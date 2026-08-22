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
        "inline-flex h-10 items-center justify-center rounded-pill px-5 font-display text-sm font-semibold",
        "transition-[background-color,border-color,color,box-shadow,transform] duration-200",
        "active:translate-y-px",
        "disabled:pointer-events-none disabled:opacity-55",
        variant === "primary" &&
          "bg-primary text-paper shadow-sm hover:bg-primary/90 hover:shadow-md",
        variant === "secondary" &&
          "border border-plum/35 text-primary hover:border-plum/60 hover:bg-plum/10",
        className,
      )}
      {...props}
    />
  );
}
