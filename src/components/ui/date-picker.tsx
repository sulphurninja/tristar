"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DatePickerProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  className,
  disabled,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-10 w-full justify-start gap-2 px-3 text-left font-normal",
            !value && "text-slate-400",
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-slate-400" strokeWidth={1.75} />
          <span className="truncate">{value ? format(value, "dd MMM yyyy") : placeholder}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-auto p-2">
        <Calendar
          mode="single"
          selected={value}
          onSelect={(d) => {
            onChange(d);
            setOpen(false);
          }}
          defaultMonth={value}
        />
      </PopoverContent>
    </Popover>
  );
}

interface DateRangePickerProps {
  value?: DateRange;
  onChange: (range: DateRange | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  numberOfMonths?: number;
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = "Select date range",
  className,
  disabled,
  numberOfMonths = 2,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const label =
    value?.from && value?.to
      ? `${format(value.from, "dd MMM yyyy")} – ${format(value.to, "dd MMM yyyy")}`
      : value?.from
        ? `${format(value.from, "dd MMM yyyy")} – …`
        : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn(
            "h-9 min-w-[240px] justify-start gap-2 px-3 text-left font-normal",
            !value?.from && "text-slate-400",
            className,
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-slate-400" strokeWidth={1.75} />
          <span className="truncate text-[13px]">{label}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-2">
        <Calendar
          mode="range"
          numberOfMonths={numberOfMonths}
          selected={value}
          onSelect={onChange}
          defaultMonth={value?.from}
        />
        <div className="mt-2 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => onChange(undefined)}
          >
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8"
            disabled={!value?.from || !value?.to}
            onClick={() => setOpen(false)}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
