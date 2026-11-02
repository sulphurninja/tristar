"use client";

import * as React from "react";
import { Command } from "cmdk";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface ComboOption {
  value: string;
  label: string;
  hint?: string;
}

/**
 * Select replacement: button trigger + popover list. Long lists get a search box.
 * `value === ""` means nothing selected (shows the placeholder).
 */
export function Combobox({
  value,
  onChange,
  options,
  placeholder = "Select",
  clearable = false,
  disabled,
  className,
  searchable,
  searchPlaceholder = "Search…",
  emptyText = "No matches",
  size = "md",
  align = "start",
}: {
  value: string;
  onChange: (v: string) => void;
  options: ComboOption[];
  placeholder?: string;
  clearable?: boolean;
  disabled?: boolean;
  className?: string;
  /** Defaults to on for lists longer than 7 items. */
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  size?: "sm" | "md" | "lg";
  align?: "start" | "end";
}) {
  const [open, setOpen] = React.useState(false);
  const selected = options.find((o) => o.value === value);
  const withSearch = searchable ?? options.length > 7;
  const showClear = clearable && value !== "" && !disabled;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn("relative min-w-0", className)}>
        <PopoverTrigger asChild disabled={disabled}>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "flex w-full min-w-0 items-center gap-2 rounded-[8px] border border-input bg-card px-3 text-left text-[13px] shadow-[var(--shadow-xs)] transition-[border-color,box-shadow]",
              "hover:border-[hsl(218_14%_78%)] focus-visible:border-ring focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15",
              "disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-70",
              open && "border-ring ring-[3px] ring-ring/15",
              size === "sm" && "h-8",
              size === "md" && "h-9",
              size === "lg" && "h-11 text-[14px]",
              showClear ? "pr-14" : "pr-8",
            )}
          >
            <span className={cn("min-w-0 flex-1 truncate", !selected && "text-muted-foreground")}>
              {selected?.label ?? placeholder}
            </span>
          </button>
        </PopoverTrigger>
        {showClear ? (
          <button
            type="button"
            aria-label="Clear"
            onClick={() => onChange("")}
            className="absolute right-7 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <X className="size-3.5" />
          </button>
        ) : null}
        <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
      </div>
      <PopoverContent
        align={align}
        sideOffset={6}
        className="w-[var(--radix-popover-trigger-width)] min-w-[200px] overflow-hidden p-0"
      >
        <Command loop>
          {withSearch ? (
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <Command.Input
                autoFocus
                placeholder={searchPlaceholder}
                className="h-9 w-full bg-transparent text-[13px] outline-none placeholder:text-muted-foreground"
              />
            </div>
          ) : null}
          <Command.List className="max-h-[280px] overflow-y-auto overscroll-contain p-1">
            <Command.Empty className="px-3 py-6 text-center text-[12.5px] text-muted-foreground">{emptyText}</Command.Empty>
            {options.map((o) => {
              const on = o.value === value;
              return (
                <Command.Item
                  key={o.value}
                  value={`${o.label} ${o.hint ?? ""} ${o.value}`}
                  onSelect={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className="flex cursor-pointer items-center gap-2 rounded-[7px] px-2.5 py-2 text-[13px] outline-none data-[selected=true]:bg-muted"
                >
                  <span className="min-w-0 flex-1">
                    <span className={cn("block truncate", on && "font-medium text-primary-700")}>{o.label}</span>
                    {o.hint ? <span className="block truncate text-[11.5px] text-muted-foreground">{o.hint}</span> : null}
                  </span>
                  {on ? <Check className="size-4 shrink-0 text-primary" /> : null}
                </Command.Item>
              );
            })}
          </Command.List>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/** Multi-select with chips summary. */
export function MultiCombobox({
  value,
  onChange,
  options,
  placeholder = "Select",
  className,
  disabled,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: ComboOption[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const set = new Set(value);
  const labels = options.filter((o) => set.has(o.value)).map((o) => o.label);
  const toggle = (v: string) => onChange(set.has(v) ? value.filter((x) => x !== v) : [...value, v]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          className={cn(
            "flex min-h-9 w-full items-center gap-2 rounded-[8px] border border-input bg-card px-3 py-1 pr-8 text-left text-[13px] shadow-[var(--shadow-xs)] transition-[border-color,box-shadow] hover:border-[hsl(218_14%_78%)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/15",
            "relative disabled:cursor-not-allowed disabled:bg-muted",
            className,
          )}
        >
          {labels.length ? (
            <span className="flex min-w-0 flex-1 flex-wrap gap-1">
              {labels.slice(0, 3).map((l) => (
                <span key={l} className="rounded-md bg-primary-50 px-1.5 py-0.5 text-[12px] text-primary-700 ring-1 ring-primary/15">
                  {l}
                </span>
              ))}
              {labels.length > 3 ? (
                <span className="rounded-md bg-muted px-1.5 py-0.5 text-[12px] text-muted-foreground">+{labels.length - 3}</span>
              ) : null}
            </span>
          ) : (
            <span className="flex-1 truncate text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" sideOffset={6} className="w-[var(--radix-popover-trigger-width)] min-w-[220px] overflow-hidden p-0">
        <Command loop>
          {options.length > 7 ? (
            <div className="flex items-center gap-2 border-b border-border px-3">
              <Search className="size-3.5 shrink-0 text-muted-foreground" />
              <Command.Input autoFocus placeholder="Search…" className="h-9 w-full bg-transparent text-[13px] outline-none" />
            </div>
          ) : null}
          <Command.List className="max-h-[280px] overflow-y-auto p-1">
            <Command.Empty className="px-3 py-6 text-center text-[12.5px] text-muted-foreground">No matches</Command.Empty>
            {options.map((o) => {
              const on = set.has(o.value);
              return (
                <Command.Item
                  key={o.value}
                  value={`${o.label} ${o.value}`}
                  onSelect={() => toggle(o.value)}
                  className="flex cursor-pointer items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-[13px] outline-none data-[selected=true]:bg-muted"
                >
                  <span
                    className={cn(
                      "flex size-4 shrink-0 items-center justify-center rounded-[4px] border",
                      on ? "border-primary bg-primary text-white" : "border-input bg-white",
                    )}
                  >
                    {on ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  <span className="truncate">{o.label}</span>
                </Command.Item>
              );
            })}
          </Command.List>
          {value.length ? (
            <div className="flex justify-between border-t border-border px-2 py-1.5">
              <button type="button" onClick={() => onChange([])} className="rounded px-2 py-1 text-[12px] text-muted-foreground hover:bg-muted">
                Clear
              </button>
              <button type="button" onClick={() => setOpen(false)} className="rounded px-2 py-1 text-[12px] font-medium text-primary hover:bg-primary-50">
                Done
              </button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
