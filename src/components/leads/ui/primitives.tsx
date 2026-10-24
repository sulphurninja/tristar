"use client";

import * as React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { Check, ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BdButton } from "@/components/bd";

/* ───────────── Modal (Buildesk look) ───────────── */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = 520,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[90] bg-[#1b2440]/45" />
        <DialogPrimitive.Content
          style={{ maxWidth: width }}
          className="fixed left-1/2 top-1/2 z-[91] flex max-h-[90vh] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-[4px] bg-white shadow-[0_20px_60px_rgba(20,30,70,0.35)] outline-none"
          aria-describedby={undefined}
        >
          <div className="flex items-start justify-between border-b border-[#eef0f6] px-5 py-4">
            <div>
              <DialogPrimitive.Title className="text-[17px] font-medium text-[#2b2f3a]">{title}</DialogPrimitive.Title>
              {subtitle ? <p className="mt-0.5 text-[12px] uppercase tracking-wide text-[#8b90a0]">{subtitle}</p> : null}
            </div>
            <DialogPrimitive.Close className="rounded p-1 text-[#7c8296] hover:bg-[#f0f2f8]" aria-label="Close">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer ? <div className="flex items-center justify-end gap-2 border-t border-[#eef0f6] px-5 py-3">{footer}</div> : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export function ModalActions({
  onCancel,
  onSubmit,
  submitLabel = "Save",
  busy,
  danger,
  disabled,
}: {
  onCancel: () => void;
  onSubmit: () => void;
  submitLabel?: string;
  busy?: boolean;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <>
      <BdButton variant="light" onClick={onCancel} disabled={busy}>
        Cancel
      </BdButton>
      <BdButton variant={danger ? "danger" : "primary"} onClick={onSubmit} disabled={busy || disabled}>
        {busy ? "Please wait…" : submitLabel}
      </BdButton>
    </>
  );
}

/* ───────────── Dropdown menu ───────────── */

export interface MenuItem {
  key: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

export function DropMenu({
  trigger,
  items,
  align = "end",
  className,
}: {
  trigger: React.ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  className?: string;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={4}
          className={cn(
            "z-[95] min-w-[190px] rounded-[4px] border border-[#e3e6ef] bg-white py-1.5 text-[14px] shadow-[0_8px_28px_rgba(30,50,110,0.2)] outline-none",
            className,
          )}
        >
          {items
            .filter((i) => !i.hidden)
            .map((i) => (
              <DropdownMenu.Item
                key={i.key}
                onSelect={() => i.onSelect()}
                className={cn(
                  "flex cursor-pointer items-center gap-3 px-4 py-2 outline-none data-[highlighted]:bg-[#eef1fa]",
                  i.danger ? "text-[#c93c41]" : "text-[#2b2f3a]",
                )}
              >
                {i.icon ? <i.icon className="size-4 shrink-0" /> : null}
                {i.label}
              </DropdownMenu.Item>
            ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* ───────────── Multi select with chips ───────────── */

export function MultiSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  className,
  searchable,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  className?: string;
  searchable?: boolean;
}) {
  const [q, setQ] = React.useState("");
  const labelOf = (v: string) => options.find((o) => o.value === v)?.label ?? v;
  const toggle = (v: string) => onChange(value.includes(v) ? value.filter((x) => x !== v) : [...value, v]);
  const shown = q ? options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger asChild>
        <div
          role="button"
          tabIndex={0}
          className={cn(
            "bd-input relative flex !h-auto min-h-[38px] cursor-pointer flex-wrap items-center gap-1 py-1 pr-14",
            className,
          )}
        >
          {value.length === 0 ? <span className="text-[#9aa1b5]">{placeholder}</span> : null}
          {value.map((v) => (
            <span key={v} className="inline-flex items-center gap-1 rounded-[2px] bg-[#eceff8] px-1.5 py-[2px] text-[12.5px]">
              {labelOf(v)}
              <button
                type="button"
                aria-label={`Remove ${labelOf(v)}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggle(v);
                }}
                className="text-[#5a6072] hover:text-black"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          {value.length > 0 ? (
            <button
              type="button"
              aria-label="Clear"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
              className="absolute right-7 top-1/2 -translate-y-1/2 text-[#7c8296] hover:text-black"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#7c8296]" />
        </div>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={3}
          className="z-[96] max-h-[280px] w-[var(--radix-popover-trigger-width)] min-w-[200px] overflow-y-auto rounded-[4px] border border-[#e3e6ef] bg-white py-1 text-[13.5px] shadow-[0_8px_28px_rgba(30,50,110,0.2)] outline-none"
        >
          {searchable ? (
            <div className="p-2">
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search"
                className="bd-input !h-8"
              />
            </div>
          ) : null}
          {shown.length === 0 ? <p className="px-3 py-2 text-[#8b90a0]">No options</p> : null}
          {shown.map((o) => {
            const on = value.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggle(o.value)}
                className="flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-[#eef1fa]"
              >
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-[2px] border",
                    on ? "border-[#3a5dc2] bg-[#3a5dc2] text-white" : "border-[#c9cfe0]",
                  )}
                >
                  {on ? <Check className="size-3" /> : null}
                </span>
                {o.label}
              </button>
            );
          })}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}

/* ───────────── small helpers ───────────── */

export function Checkbox({
  checked,
  onChange,
  indeterminate,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  indeterminate?: boolean;
  label?: string;
}) {
  const ref = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = !!indeterminate && !checked;
  }, [indeterminate, checked]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label ?? "Select"}
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="size-4 cursor-pointer rounded-[3px] border-[#c9cfe0] accent-[#3a5dc2]"
    />
  );
}

/** ISO string -> value for <input type="datetime-local">. */
export function toLocalInput(d?: Date | string | null) {
  const dt = d ? new Date(d) : new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
}

export function toDateInput(d?: Date | string | null) {
  return toLocalInput(d).slice(0, 10);
}

/** JSON fetch that throws Error(message) on non-2xx. */
export async function api<T = Record<string, unknown>>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    cache: "no-store",
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...(rest.headers ?? {}) } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}
