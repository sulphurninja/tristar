"use client";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FilterField({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </Label>
      {children}
    </div>
  );
}
