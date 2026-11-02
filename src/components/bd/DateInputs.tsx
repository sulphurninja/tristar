"use client";

import { useState } from "react";
import { format, isValid, parse } from "date-fns";
import { ArrowRight, Calendar } from "lucide-react";
import { Calendar as DayCalendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

/** yyyy-MM-dd in local time. */
export function ymd(d: Date = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** One date cell: shows a friendly date, opens a calendar popover to pick. */
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
  const [open, setOpen] = useState(false);
  const d = value ? parse(value, "yyyy-MM-dd", new Date()) : undefined;
  const ok = d && isValid(d) ? d : undefined;
  const lo = min ? parse(min, "yyyy-MM-dd", new Date()) : undefined;
  const hi = max ? parse(max, "yyyy-MM-dd", new Date()) : undefined;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label="Select date"
          className={cn(
            "flex h-full flex-1 items-center gap-2 rounded-[7px] px-3 text-left text-[13px] text-foreground transition-colors hover:bg-muted/60",
            className,
          )}
        >
          <Calendar className="size-3.5 shrink-0 text-muted-foreground" />
          <span className={cn("flex-1 whitespace-nowrap", !ok && "text-muted-foreground")}>
            {ok ? format(ok, "dd MMM yyyy") : "Pick date"}
          </span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <DayCalendar
          mode="single"
          selected={ok}
          defaultMonth={ok}
          disabled={[...(lo && isValid(lo) ? [{ before: lo }] : []), ...(hi && isValid(hi) ? [{ after: hi }] : [])]}
          onSelect={(x) => {
            if (x) onChange(format(x, "yyyy-MM-dd"));
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
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
    <div className={cn("flex h-[38px] min-w-[150px] rounded-lg border border-input bg-white", className)}>
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
    <div className={cn("flex h-[38px] items-center rounded-lg border border-input bg-white", className)}>
      <DateCell
        value={from}
        max={to || undefined}
        className="w-[140px] flex-none"
        onChange={(v) => onChange({ from: v, to: to && v > to ? v : to })}
      />
      <ArrowRight className="size-3 shrink-0 text-muted-foreground/80" />
      <DateCell
        value={to}
        min={from || undefined}
        className="w-[140px] flex-none"
        onChange={(v) => onChange({ from: from && v < from ? v : from, to: v })}
      />
    </div>
  );
}
