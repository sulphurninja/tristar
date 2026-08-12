import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  variant?: "default" | "white" | "black";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  /** Kept for API compatibility — the PNG already includes the wordmark. */
  showWordmark?: boolean;
  /** Stretch to parent width (sidebar). Height follows aspect ratio. */
  fluid?: boolean;
}

const SIZE_H: Record<NonNullable<LogoProps["size"]>, string> = {
  xs: "h-7",
  sm: "h-9",
  md: "h-12",
  lg: "h-16",
  xl: "h-[5.5rem]",
  "2xl": "h-[7.5rem]",
};

/**
 * Tristar Realtors brand logo. Uses the official `tristar-logo.png` asset
 * which contains the building mark + the "TRISTAR REALTORS" wordmark.
 */
export function Logo({
  className,
  variant = "default",
  size = "md",
  fluid = false,
}: LogoProps) {
  const filter =
    variant === "white"
      ? "brightness(0) invert(1)"
      : variant === "black"
        ? "brightness(0)"
        : undefined;

  return (
    <span
      className={cn(
        "inline-flex items-center justify-center",
        fluid && "w-full",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/tristar-logo.png"
        alt="Tristar Realtors"
        style={filter ? { filter } : undefined}
        className={cn(
          "block select-none object-contain object-center",
          fluid ? "h-auto w-full max-w-full" : cn(SIZE_H[size], "w-auto"),
        )}
      />
    </span>
  );
}
