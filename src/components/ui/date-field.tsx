"use client";

import * as React from "react";
import { format, isValid, parse } from "date-fns";
import { CalendarDays, Clock, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

const fromYmd = (s?: string) => {
  if (!s) return undefined;
  const d = parse(s.slice(0, 10), "yyyy-MM-dd", new Date());
  return isValid(d) ? d : undefined;
};
const toYmd = (d: Date) => format(d, "yyyy-MM-dd");

const trigger =
  "flex h-9 w-full min-w-0 items-center gap-2 rounded-[8px] border border-input bg-card px-3 text-left text-[13px] shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] hover:border-[hsl(218_14%_78%)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15 disabled:cursor-not-allowed disabled:bg-muted";

/** Date picker bound to a `yyyy-MM-dd` string (drop-in for `<input type="date">`). */
export function DateField({
  value,
  onChange,
  placeholder = "Pick a date",
  min,
  max,
  clearable,
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  min?: string;
  max?: string;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const d = fromYmd(value);
  const lo = fromYmd(min);
  const hi = fromYmd(max);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative min-w-0", className)}>
        <PopoverTrigger asChild disabled={disabled}>
          <button type="button" className={cn(trigger, open && "border-ring ring-[3px] ring-ring/15", clearable && d && "pr-8")}>
            <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
            <span className={cn("truncate", !d && "text-muted-foreground")}>{d ? format(d, "dd MMM yyyy") : placeholder}</span>
          </button>
        </PopoverTrigger>
        {clearable && d && !disabled ? (
          <button
            type="button"
            aria-label="Clear date"
            onClick={() => onChange("")}
            className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          selected={d}
          defaultMonth={d ?? lo}
          disabled={[...(lo ? [{ before: lo }] : []), ...(hi ? [{ after: hi }] : [])]}
          onSelect={(x) => {
            if (x) onChange(toYmd(x));
            setOpen(false);
          }}
        />
        <div className="mt-1 flex justify-between border-t border-border pt-2">
          <button type="button" onClick={() => { onChange(toYmd(new Date())); setOpen(false); }} className="rounded px-2 py-1 text-[12px] font-medium text-primary hover:bg-primary-50">
            Today
          </button>
          {value ? (
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="rounded px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted">
              Clear
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

const TIMES = Array.from({ length: 96 }, (_, i) => {
  const h = Math.floor(i / 4);
  const m = (i % 4) * 15;
  const v = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  const label = format(new Date(2000, 0, 1, h, m), "h:mm a");
  return { value: v, label };
});

/** Time picker bound to an `HH:mm` string, in 15-minute steps (keeps any other existing value). */
export function TimeField({
  value,
  onChange,
  placeholder = "Time",
  disabled,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}) {
  const options = React.useMemo(() => {
    if (!value || TIMES.some((t) => t.value === value)) return TIMES;
    const [h, m] = value.split(":").map(Number);
    return [{ value, label: format(new Date(2000, 0, 1, h || 0, m || 0), "h:mm a") }, ...TIMES];
  }, [value]);
  return (
    <div className={cn("relative min-w-0", className)}>
      <Clock className="pointer-events-none absolute left-3 top-1/2 z-[1] size-4 -translate-y-1/2 text-muted-foreground" />
      <Combobox
        value={value}
        onChange={onChange}
        options={options}
        placeholder={placeholder}
        disabled={disabled}
        searchable
        searchPlaceholder="Type a time, e.g. 4:30"
        className="[&_button[role=combobox]]:pl-9"
      />
    </div>
  );
}

/** Date + time bound to a `yyyy-MM-ddTHH:mm` string (drop-in for `datetime-local`). */
export function DateTimeField({
  value,
  onChange,
  disabled,
  className,
  min,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  className?: string;
  min?: string;
}) {
  const [date, time] = value ? value.split("T") : ["", ""];
  const t = (time ?? "").slice(0, 5);
  return (
    <div className={cn("grid min-w-0 grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] gap-2", className)}>
      <DateField
        value={date ?? ""}
        min={min?.slice(0, 10)}
        disabled={disabled}
        onChange={(d) => onChange(d ? `${d}T${t || "10:00"}` : "")}
      />
      <TimeField
        value={t}
        disabled={disabled}
        onChange={(v) => onChange(`${date || toYmd(new Date())}T${v}`)}
      />
    </div>
  );
}
