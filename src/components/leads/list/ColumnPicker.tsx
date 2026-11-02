"use client";

import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { COLUMNS } from "./LeadsTable";

const LOCKED = ["name"];

export function ColumnPicker({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (k: string) => {
    if (LOCKED.includes(k)) return;
    onChange(value.includes(k) ? value.filter((x) => x !== k) : [...value, k]);
  };
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <button type="button" className="bd-input relative flex !w-[200px] items-center pr-8 text-left" aria-label="Select Columns">
          <span className="text-muted-foreground/80">Select Columns</span>
          <ChevronDown className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={3}
          className="z-[96] max-h-[340px] w-[230px] overflow-y-auto rounded-lg border border-border bg-white py-1 text-[13.5px] shadow-[0_8px_28px_rgba(30,50,110,0.2)] outline-none"
        >
          {COLUMNS.map((c) => {
            const on = value.includes(c.key);
            return (
              <button
                key={c.key}
                type="button"
                onClick={() => toggle(c.key)}
                disabled={LOCKED.includes(c.key)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-primary-50 disabled:opacity-60"
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-lg border",
                    on ? "border-primary bg-primary text-white" : "border-input",
                  )}
                >
                  {on ? <Check className="size-3" /> : null}
                </span>
                {c.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => onChange(COLUMNS.filter((c) => c.defaultOn).map((c) => c.key))}
            className="mt-1 w-full border-t border-border/70 px-3 py-2 text-left text-primary hover:bg-primary-50"
          >
            Reset to default
          </button>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
