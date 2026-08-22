/**
 * The "App/Web Logo" block that sits at the top of every auth card.
 * Renders the company logo when one has been uploaded, otherwise the
 * Dayflow wordmark.
 */
export function AuthBrand({
  logoUrl,
  companyName,
}: {
  logoUrl?: string | null;
  companyName?: string | null;
}) {
  return (
    <div className="flex h-14 w-full items-center justify-center gap-2.5 rounded-card bg-line/70 px-4">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl}
          alt={companyName ? `${companyName} logo` : "Company logo"}
          className="max-h-8 max-w-[70%] object-contain"
        />
      ) : (
        <>
          <span className="flex h-8 w-8 items-center justify-center rounded-card bg-primary font-display text-base font-extrabold text-paper">
            D
          </span>
          <span className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-primary">
            Dayflow
          </span>
        </>
      )}
    </div>
  );
}
