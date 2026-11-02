"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-input bg-white shadow-[var(--shadow-xs)] transition-colors",
      "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20 disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white",
      "data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-white",
      className,
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center">
      {props.checked === "indeterminate" ? <Minus className="size-3" strokeWidth={3} /> : <Check className="size-3" strokeWidth={3} />}
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

/** Checkbox with a clickable label. */
function CheckboxField({
  checked,
  onCheckedChange,
  label,
  hint,
  disabled,
  className,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  label: React.ReactNode;
  hint?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  const id = React.useId();
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <Checkbox id={id} checked={checked} disabled={disabled} onCheckedChange={(v) => onCheckedChange(v === true)} className="mt-[2px]" />
      <label htmlFor={id} className={cn("cursor-pointer select-none text-[13px] leading-snug", disabled && "cursor-not-allowed opacity-60")}>
        {label}
        {hint ? <span className="mt-0.5 block text-[12px] text-muted-foreground">{hint}</span> : null}
      </label>
    </div>
  );
}

export { Checkbox, CheckboxField };
