import Image from "next/image";

export const APP_NAME = "Dayflow";

/**
 * The product mark. `tone="light"` swaps to the paper-coloured silhouette for
 * use on the plum panel; everything else gets the full-colour logo.
 */
export function Logo({
  size = 32,
  tone = "dark",
  className = "",
  priority = false,
}: {
  size?: number;
  tone?: "dark" | "light";
  className?: string;
  priority?: boolean;
}) {
  return (
    <Image
      src={tone === "light" ? "/logo-white.png" : "/logo.png"}
      alt={`${APP_NAME} logo`}
      width={size}
      height={size}
      priority={priority}
      className={`object-contain ${className}`}
    />
  );
}

/** Mark plus wordmark, for the nav and the auth panel. */
export function Wordmark({
  tone = "dark",
  size = 32,
  className = "",
}: {
  tone?: "dark" | "light";
  size?: number;
  className?: string;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <Logo size={size} tone={tone} priority />
      <span
        className={`font-display text-[19px] font-extrabold tracking-[-0.02em] ${
          tone === "light" ? "text-paper" : "text-primary"
        }`}
      >
        {APP_NAME}
      </span>
    </span>
  );
}

/**
 * The "App/Web Logo" block at the top of every auth card. Shows the tenant's
 * uploaded company logo when there is one, otherwise the Dayflow mark.
 */
export function AuthBrand({
  logoUrl,
  companyName,
}: {
  logoUrl?: string | null;
  companyName?: string | null;
}) {
  return (
    <div className="flex h-16 w-full items-center justify-center gap-2.5 rounded-card bg-line/60 px-4">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={companyName ? `${companyName} logo` : "Company logo"}
          className="max-h-10 max-w-[70%] object-contain"
        />
      ) : (
        <Wordmark size={38} />
      )}
    </div>
  );
}
