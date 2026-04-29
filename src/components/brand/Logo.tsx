import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "white" | "black";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Kept for API compatibility — the PNG already includes the wordmark. */
  showWordmark?: boolean;
}

/**
 * Tristar Realtors brand logo. Uses the official `tristar-logo.png` asset
 * which contains the building mark + the "TRISTAR REALTORS" wordmark.
 *
 * Pass `variant="white"` on dark surfaces (e.g. the sidebar) to flatten the
 * blue/grey tones to pure white via a CSS filter.
 *
 * Uses a plain <img> (rather than next/image) because the asset is small
 * and we don't need on-the-fly optimisation — keeps the build simple.
 */
export function Logo({ className, variant = "default", size = "md" }: LogoProps) {
  const dim =
    size === "xs"
      ? 28
      : size === "sm"
        ? 36
        : size === "md"
          ? 44
          : size === "lg"
            ? 56
            : 72;

  const filter =
    variant === "white"
      ? "brightness(0) invert(1)"
      : variant === "black"
        ? "brightness(0)"
        : undefined;

  return (
    <span className={cn("inline-flex justify-center flex w-full items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/tristar-logo.png"
        alt="Tristar Realtors"
        width={dim}
        height={dim}
        style={filter ? { filter } : undefined}
        className="h-32 w-auto select-none object-contain"
      />
    </span>
  );
}
