"use client";

/**
 * Buildesk-style building blocks. Every CRM page should compose these so the
 * app keeps one consistent look: white cards on a pale-blue canvas, blue left
 * rule KPI cards, bold UPPERCASE table headers, flat 3px-radius controls.
 */
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const BD_BLUE = "#3a5dc2";

/* ───────────── layout ───────────── */

export function BdPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("space-y-4 p-4 lg:p-5", className)}>{children}</div>;
}

export function BdCard({
  title,
  actions,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <section className={cn("bd-card rounded-[3px]", className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#eef0f6] px-5 py-4">
          <h3 className="text-[16px] font-medium text-[#2b2f3a]">{title}</h3>
          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ───────────── KPI cards ───────────── */

export type KpiTone = "violet" | "blue" | "red" | "yellow" | "green" | "cyan" | "grey";

const TONES: Record<KpiTone, { bg: string; fg: string }> = {
  violet: { bg: "#e4e0fb", fg: "#7a66e0" },
  blue: { bg: "#dbe8fd", fg: "#3d7be8" },
  red: { bg: "#fbe0e0", fg: "#ef6a6a" },
  yellow: { bg: "#fbefc8", fg: "#e9b72a" },
  green: { bg: "#d6f5e3", fg: "#37c47f" },
  cyan: { bg: "#d5f3f6", fg: "#3ec1d3" },
  grey: { bg: "#ececef", fg: "#9a9ca6" },
};

export function BdKpi({
  label,
  value,
  icon: Icon,
  tone = "blue",
  onClick,
  active,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: KpiTone;
  onClick?: () => void;
  active?: boolean;
  hint?: string;
  className?: string;
}) {
  const t = TONES[tone];
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "bd-kpi min-w-0 text-left",
        onClick && "cursor-pointer transition-shadow hover:shadow-[0_2px_12px_rgba(30,50,110,0.16)]",
        active && "ring-2 ring-[#3a5dc2]/40",
        className,
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[19px] leading-tight text-[#2b2f3a]">{label}</p>
        <p className="mt-2 text-[17px] text-[#2b2f3a]">{value}</p>
        {hint ? <p className="mt-0.5 truncate text-[11.5px] text-[#8b90a0]">{hint}</p> : null}
      </div>
      {Icon ? (
        <span
          className="flex size-16 shrink-0 items-center justify-center rounded-[14px]"
          style={{ background: t.bg, color: t.fg }}
        >
          <Icon className="size-7" />
        </span>
      ) : null}
    </Comp>
  );
}

/** Small "stat card" used in the lead-count rows (title, big number, caption). */
export function BdStatCard({
  title,
  value,
  caption,
  onClick,
  active,
}: {
  title: string;
  value: React.ReactNode;
  caption?: string;
  onClick?: () => void;
  active?: boolean;
}) {
  const Comp = onClick ? "button" : "div";
  return (
    <Comp
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "bd-card block rounded-[3px] px-5 py-4 text-left",
        onClick && "cursor-pointer hover:shadow-[0_2px_12px_rgba(30,50,110,0.14)]",
        active && "ring-2 ring-[#3a5dc2]/50",
      )}
    >
      <p className="text-[16px] text-[#2b2f3a]">{title}</p>
      <p className="mt-2 text-[28px] font-medium leading-none text-[#2b2f3a]">{value}</p>
      {caption ? <p className="mt-2 text-[12px] text-[#8b90a0]">{caption}</p> : null}
    </Comp>
  );
}

/* ───────────── form controls ───────────── */

export interface BdOption {
  value: string;
  label: string;
}

export function BdField({
  label,
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label ? <label className="bd-label">{label}</label> : null}
      {children}
    </div>
  );
}

/**
 * Select with the Buildesk look: placeholder in grey, an ✕ clear button once a
 * value is chosen, caret on the right. `value === ""` means "nothing selected".
 */
export function BdSelect({
  value,
  onChange,
  options,
  placeholder = "Select",
  clearable = true,
  className,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: BdOption[];
  placeholder?: string;
  clearable?: boolean;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <div className={cn("relative", className)}>
      <select
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "bd-input appearance-none pr-12",
          value === "" && "text-[#9aa1b5]",
          disabled && "opacity-60",
        )}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-[#2b2f3a]">
            {o.label}
          </option>
        ))}
      </select>
      {clearable && value !== "" && !disabled ? (
        <button
          type="button"
          aria-label="Clear"
          onClick={() => onChange("")}
          className="absolute right-7 top-1/2 -translate-y-1/2 text-[#7c8296] hover:text-[#2b2f3a]"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#7c8296]" />
    </div>
  );
}

export function BdInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("bd-input", props.className)} />;
}

export function BdButton({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "light" | "danger" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        variant === "primary" && "bd-btn",
        variant === "light" && "bd-btn-light",
        variant === "danger" && "bd-btn !bg-[#e5484d] hover:!bg-[#c93c41]",
        "inline-flex items-center justify-center gap-1.5 disabled:opacity-50",
        className,
      )}
    />
  );
}

/* ───────────── tabs ───────────── */

export function BdTabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ key: T; label: string }>;
  value: T;
  onChange: (k: T) => void;
}) {
  return (
    <div className="flex items-end gap-0 px-1">
      {tabs.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            "px-4 py-2.5 text-[14.5px] transition-colors",
            t.key === value
              ? "bg-[#3a5dc2] text-white"
              : "text-[#3a5dc2] hover:bg-[#e9edf8]",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ───────────── table ───────────── */

export function BdTable({
  children,
  className,
  minWidth = 900,
}: {
  children: React.ReactNode;
  className?: string;
  minWidth?: number;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="bd-table w-full border-collapse text-left" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function BdTh({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-3", className)}>{children}</th>;
}

export function BdTd({
  children,
  className,
  colSpan,
}: {
  children?: React.ReactNode;
  className?: string;
  colSpan?: number;
}) {
  return (
    <td colSpan={colSpan} className={cn("px-3 py-2.5 align-middle", className)}>
      {children}
    </td>
  );
}

export function BdEmptyRow({ colSpan, loading }: { colSpan: number; loading?: boolean }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-3 py-10 text-center text-[13px] text-[#8b90a0]">
        {loading ? "Loading…" : "No data available in table"}
      </td>
    </tr>
  );
}

/** Small solid label (LEAD / Lead badge, To Do, etc). */
export function BdBadge({
  children,
  color = "#3a5dc2",
  className,
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-block rounded-[2px] px-2 py-[3px] text-[11px] font-medium leading-none text-white", className)}
      style={{ background: color }}
    >
      {children}
    </span>
  );
}

/* ───────────── pagination / table toolbar ───────────── */

export function BdPagination({
  page,
  totalPages,
  onPage,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
}) {
  const pages = Math.max(1, totalPages);
  const start = Math.max(1, Math.min(page - 1, pages - 3));
  const nums: number[] = [];
  for (let i = start; i <= Math.min(pages, start + 3); i++) nums.push(i);
  const base = "border border-[#dfe3ee] px-3 py-[7px] text-[13.5px] -ml-px";
  return (
    <div className="inline-flex">
      <button
        type="button"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className={cn(base, "ml-0 rounded-l-[3px] text-[#9aa1b5] enabled:text-[#3a5dc2] enabled:hover:bg-[#eef1fa]")}
      >
        Previous
      </button>
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onPage(n)}
          className={cn(base, n === page ? "border-[#3a5dc2] bg-[#3a5dc2] text-white" : "text-[#3a5dc2] hover:bg-[#eef1fa]")}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className={cn(base, "rounded-r-[3px] text-[#9aa1b5] enabled:text-[#3a5dc2] enabled:hover:bg-[#eef1fa]")}
      >
        Next
      </button>
    </div>
  );
}

/**
 * Pagination on the left; column picker slot, search box and page-size select
 * on the right — the strip that sits above every Buildesk data table.
 */
export function BdTableToolbar({
  page,
  totalPages,
  onPage,
  search,
  onSearch,
  pageSize,
  onPageSize,
  left,
  right,
}: {
  page: number;
  totalPages: number;
  onPage: (p: number) => void;
  search?: string;
  onSearch?: (v: string) => void;
  pageSize?: number;
  onPageSize?: (n: number) => void;
  left?: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
      <div className="flex flex-wrap items-center gap-3">
        <BdPagination page={page} totalPages={totalPages} onPage={onPage} />
        {left}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {right}
        {onSearch ? (
          <div className="flex">
            <input
              value={search ?? ""}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search"
              className="bd-input !w-[260px] rounded-r-none"
            />
            <span className="flex w-10 items-center justify-center bg-[#8da3dc] text-white">
              <svg viewBox="0 0 24 24" className="size-4" fill="none" stroke="currentColor" strokeWidth="2.5">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
            </span>
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onSearch("")}
              className="ml-1.5 flex w-9 items-center justify-center rounded-[3px] bg-[#e8eaf2] text-[#5a6072] hover:bg-[#dcdfea]"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ) : null}
        {onPageSize ? (
          <select
            value={pageSize}
            onChange={(e) => onPageSize(Number(e.target.value))}
            className="bd-input !w-[80px]"
          >
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    </div>
  );
}

/** Pill showing the active-filter count (the "224 👤" chip above filters). */
export function BdCountChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[#4b4fb5] px-2.5 py-[3px] text-[12.5px] font-medium text-white">
      {children}
    </span>
  );
}

export function formatBdDate(d?: string | Date | null) {
  if (!d) return "-";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
}
