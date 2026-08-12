"use client";

import * as React from "react";
import { DayPicker } from "react-day-picker";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import "react-day-picker/style.css";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-1", className)}
      classNames={{
        months: "flex flex-col gap-3 sm:flex-row",
        month: "space-y-3",
        month_caption: "relative flex h-9 items-center justify-center px-8",
        caption_label: "text-[13.5px] font-semibold text-slate-900",
        nav: "absolute inset-x-0 top-0 flex items-center justify-between px-1",
        button_previous: cn(
          buttonVariants({ variant: "outline", size: "iconSm" }),
          "size-7 bg-white p-0 opacity-80 hover:opacity-100",
        ),
        button_next: cn(
          buttonVariants({ variant: "outline", size: "iconSm" }),
          "size-7 bg-white p-0 opacity-80 hover:opacity-100",
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-[11px] font-medium text-slate-400",
        week: "mt-1 flex w-full",
        day: "relative p-0 text-center text-[13px]",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "size-9 p-0 font-normal aria-selected:opacity-100",
        ),
        selected:
          "[&>button]:bg-emerald-600 [&>button]:text-white [&>button]:hover:bg-emerald-600 [&>button]:hover:text-white",
        today: "[&>button]:bg-emerald-50 [&>button]:text-emerald-800",
        outside: "text-slate-300 opacity-60 aria-selected:bg-emerald-50/60 aria-selected:text-slate-400",
        disabled: "text-slate-300 opacity-40",
        range_middle: "[&>button]:bg-emerald-50 [&>button]:text-emerald-900 [&>button]:rounded-none",
        range_start: "[&>button]:rounded-l-md",
        range_end: "[&>button]:rounded-r-md",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === "left" ? (
            <ChevronLeft className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          ),
      }}
      {...props}
    />
  );
}
Calendar.displayName = "Calendar";

export { Calendar };
