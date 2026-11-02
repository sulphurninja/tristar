"use client";

/**
 * Buildesk-flavoured overlays & small controls shared by the CP / Bookings /
 * Campaign / Accounts pages: modal, confirm, right-hand filter panel, ⋮ menu,
 * blue action dropdown, column picker, sort toggle.
 */
import { useEffect, useRef, useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ArrowDownUp, ChevronDown, Filter, MoreVertical, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { BdButton } from "@/components/bd";
import { Checkbox } from "@/components/ui/checkbox";

export function BdModal({
  open,
  title,
  onClose,
  children,
  footer,
  width = 640,
}: {
  open: boolean;
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto bg-slate-900/40 p-4 pt-[6vh]">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full rounded-lg bg-white shadow-[0_20px_50px_rgba(20,30,70,0.3)]"
        style={{ maxWidth: width }}
      >
        <div className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
          <h3 className="text-[16px] font-medium text-foreground">{title}</h3>
          <button type="button" aria-label="Close" onClick={onClose} className="text-muted-foreground hover:text-foreground">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-border/70 px-5 py-3">{footer}</div> : null}
      </div>
    </div>
  );
}

export function BdConfirm({
  open,
  title = "Confirm",
  message,
  confirmLabel = "Delete",
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title?: string;
  message: React.ReactNode;
  confirmLabel?: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <BdModal
      open={open}
      title={title}
      onClose={onClose}
      width={440}
      footer={
        <>
          <BdButton variant="light" onClick={onClose}>
            Cancel
          </BdButton>
          <BdButton variant="danger" disabled={busy} onClick={onConfirm}>
            {busy ? "Please wait…" : confirmLabel}
          </BdButton>
        </>
      }
    >
      <p className="text-[14px] text-foreground">{message}</p>
    </BdModal>
  );
}

/** Right-hand slide-in panel (the orange filter button opens one of these). */
export function BdSidePanel({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <div className="absolute inset-0 bg-slate-900/30" onClick={onClose} />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-[420px] flex-col bg-white shadow-[-8px_0_30px_rgba(20,30,70,0.18)]">
        <div className="flex items-center justify-between bg-primary px-5 py-3.5 text-white">
          <h3 className="text-[16px] font-medium">{title}</h3>
          <button type="button" aria-label="Close" onClick={onClose}>
            <X className="size-4" />
          </button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-border/70 px-5 py-3">{footer}</div> : null}
      </aside>
    </div>
  );
}

const itemCls =
  "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-foreground outline-none data-[highlighted]:bg-primary-50";

export interface BdMenuItem {
  label: string;
  onSelect: () => void;
  danger?: boolean;
  hidden?: boolean;
}

function MenuContent({ items }: { items: BdMenuItem[] }) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        align="end"
        sideOffset={4}
        className="z-[80] min-w-44 rounded-lg bg-white p-1 shadow-lg ring-1 ring-slate-900/10"
      >
        {items
          .filter((i) => !i.hidden)
          .map((i) => (
            <DropdownMenu.Item
              key={i.label}
              onSelect={i.onSelect}
              className={cn(itemCls, i.danger && "text-destructive")}
            >
              {i.label}
            </DropdownMenu.Item>
          ))}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  );
}

/** The white square ⋮ button with a dropdown (Export CSV, Refresh …). */
export function BdKebab({ items }: { items: BdMenuItem[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="More actions"
          className="flex size-[34px] items-center justify-center rounded-lg border border-primary bg-white text-primary hover:bg-primary-50"
        >
          <MoreVertical className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <MenuContent items={items} />
    </DropdownMenu.Root>
  );
}

/** Small blue caret button used in the ACTION column. */
export function BdRowActions({ items }: { items: BdMenuItem[] }) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          aria-label="Actions"
          className="flex size-6 items-center justify-center rounded-lg bg-primary text-white hover:bg-primary-700"
        >
          <svg viewBox="0 0 10 6" className="size-2.5" fill="currentColor">
            <path d="M0 0h10L5 6z" />
          </svg>
        </button>
      </DropdownMenu.Trigger>
      <MenuContent items={items} />
    </DropdownMenu.Root>
  );
}

/** Orange funnel button that opens the filter panel. */
export function BdFilterButton({ onClick, active }: { onClick: () => void; active?: boolean }) {
  return (
    <button
      type="button"
      aria-label="Filters"
      onClick={onClick}
      className={cn(
        "bd-btn-light relative !w-[34px] !px-0",
      )}
    >
      <Filter className="size-4" />
      {active ? <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-primary ring-2 ring-white" /> : null}
    </button>
  );
}

/** Up/down arrows button that flips the sort direction. */
export function BdSortToggle({ dir, onToggle }: { dir: "asc" | "desc"; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-label={dir === "asc" ? "Sorted oldest first" : "Sorted newest first"}
      title={dir === "asc" ? "Oldest first" : "Newest first"}
      onClick={onToggle}
      className="flex size-[38px] items-center justify-center rounded-lg border border-primary bg-white text-primary hover:bg-primary-50"
    >
      <ArrowDownUp className="size-4" />
    </button>
  );
}

/** "Select Columns" multi-select. `value` is the list of visible column keys. */
export function BdColumnPicker({
  columns,
  value,
  onChange,
}: {
  columns: Array<{ key: string; label: string }>;
  value: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="bd-input flex !w-[190px] items-center justify-between text-left text-muted-foreground"
      >
        <span>Select Columns</span>
        <ChevronDown className="size-3.5" />
      </button>
      {open ? (
        <div className="absolute left-0 top-full z-50 mt-1 max-h-72 w-[220px] overflow-y-auto rounded-lg bg-white p-1 shadow-lg ring-1 ring-slate-900/10">
          {columns.map((c) => {
            const on = value.includes(c.key);
            return (
              <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-[13px] hover:bg-primary-50">
                <Checkbox
                  checked={on}
                  onCheckedChange={() => onChange(on ? value.filter((k) => k !== c.key) : [...value, c.key])}
                />
                {c.label}
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/** Table-header-like checkbox styled to the page. */
export function BdCheck({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <Checkbox
      aria-label={label ?? "Select"}
      checked={checked}
      onCheckedChange={(v) => onChange(v === true)}
      className="cursor-pointer"
    />
  );
}

/** Plain native <textarea> with Buildesk look. */
export function BdTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={cn("bd-input !h-auto min-h-[84px] py-2", props.className)}
    />
  );
}
