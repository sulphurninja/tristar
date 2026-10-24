"use client";

import { ArrowRight, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

/** yyyy-MM-dd in local time. */
export function ymd(d: Date = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * One date cell that always *displays* yyyy-MM-dd (Buildesk style, independent of
 * browser locale) while a transparent native date input on top handles picking.
 */
function DateCell({
  value,
  onChange,
  min,
  max,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  min?: string;
  max?: string;
  className?: string;
}) {
  return (
    <span className={cn("relative flex h-full flex-1 items-center gap-2 px-3 text-[13px] text-[#2b2f3a]", className)}>
      <span className="flex-1 whitespace-nowrap">{value || "yyyy-mm-dd"}</span>
      <Calendar className="size-3.5 shrink-0 text-[#7c8296]" />
      <input
        type="date"
        value={value}
        min={min}
        max={max}
        aria-label="Select date"
        onChange={(e) => e.target.value && onChange(e.target.value)}
        onClick={(e) => {
          try {
            e.currentTarget.showPicker();
          } catch {
            /* older browsers: native segment editing still works */
          }
        }}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </span>
  );
}

/** Buildesk-style single date field. */
export function BdDateInput({
  value,
  onChange,
  className,
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  min?: string;
  max?: string;
}) {
  return (
    <div className={cn("flex h-[38px] min-w-[150px] rounded-[3px] border border-[#dfe3ee] bg-white", className)}>
      <DateCell value={value} onChange={onChange} min={min} max={max} />
    </div>
  );
}

/** Two dates with an arrow between them, as in "Date Range 2026-10-24 -> 2026-10-24". */
export function BdDateRange({
  from,
  to,
  onChange,
  className,
}: {
  from: string;
  to: string;
  onChange: (v: { from: string; to: string }) => void;
  className?: string;
}) {
  return (
    <div className={cn("flex h-[38px] items-center rounded-[3px] border border-[#dfe3ee] bg-white", className)}>
      <DateCell
        value={from}
        max={to || undefined}
        className="w-[150px] flex-none"
        onChange={(v) => onChange({ from: v, to: to && v > to ? v : to })}
      />
      <ArrowRight className="size-3 shrink-0 text-[#9aa1b5]" />
      <DateCell
        value={to}
        min={from || undefined}
        className="w-[150px] flex-none"
        onChange={(v) => onChange({ from: from && v < from ? v : from, to: v })}
      />
    </div>
  );
}
