import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "white" | "black";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** Kept for API compatibility — the PNG already includes the wordmark. */
  showWordmark?: boolean;
}

/**
 * Tristar Realtors brand logo. Uses the official `tristar-logo.png` asset
 * which contains the building mark + the "TRISTAR REALTORS" wordmark.
 *
 * The image is rendered at a fixed *height* (via inline style) and
 * `width: auto` so the wordmark stays legible at every size. Pass
 * `variant="white"` on dark surfaces to flatten the blue/grey tones to
 * pure white via a CSS filter.
 */
export function Logo({ className, variant = "default", size = "md" }: LogoProps) {
  const heightPx =
    size === "xs"
      ? 28
      : size === "sm"
        ? 36
        : size === "md"
          ? 48
          : size === "lg"
            ? 64
            : size === "xl"
              ? 88
              : 120; // 2xl

  const filter =
    variant === "white"
      ? "brightness(0) invert(1)"
      : variant === "black"
        ? "brightness(0)"
        : undefined;

  return (
    <span className={cn("inline-flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/tristar-logo.png"
        alt="Tristar Realtors"
        style={{
          height: heightPx,
          width: "auto",
          ...(filter ? { filter } : {}),
        }}
        className="block select-none object-contain"
      />
    </span>
  );
}
