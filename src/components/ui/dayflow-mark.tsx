import Image from "next/image";
import { cn } from "@/lib/cn";

/**
 * The Dayflow DF monogram. One component so the mark is identical in the nav,
 * the auth card and the auth panel.
 *
 * `plated` matters: the D is plum, so on a plum ground (the auth aside, which
 * is bg-primary) the letter all but disappears. Plating it on paper gives the
 * mark its own ground and keeps both letters legible. On light surfaces the
 * bare mark is the right call.
 */
export function DayflowMark({
  size = 32,
  plated = false,
  className,
  priority = false,
}: {
  size?: number;
  plated?: boolean;
  className?: string;
  priority?: boolean;
}) {
  const inner = plated ? Math.round(size * 0.76) : size;

  const mark = (
    <Image
      src="/dayflow-mark.png"
      alt="Dayflow"
      width={inner}
      height={inner}
      priority={priority}
      className="object-contain"
    />
  );

  if (!plated) {
    return (
      <span className={cn("inline-flex shrink-0 items-center justify-center", className)}>
        {mark}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-card bg-paper",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {mark}
    </span>
  );
}
