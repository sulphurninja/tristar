"use client";

/**
 * Tristar workspace building blocks. Every CRM page composes these so the app
 * keeps one consistent look: white surfaces on a cool paper canvas, hairline
 * borders, quiet sentence-case table headers, 8px-radius controls and
 * tabular figures. Colours come from the theme tokens in globals.css.
 */
import Link from "next/link";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

/** Brand colour for inline styles and SVG attributes, where CSS variables do not resolve. */
export const BD_BLUE = "#2563eb";

/* ───────────── layout ───────────── */

export function BdPage({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("ts-rise mx-auto w-full max-w-[1680px] space-y-5 px-4 py-5 sm:px-6 lg:px-8 lg:py-6", className)}>
      {children}
    </div>
  );
}

/** Page title row: title + optional description on the left, actions on the right. */
export function BdPageHeader({
  title,
  description,
  actions,
  eyebrow,
  className,
}: {
  title: React.ReactNode;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-x-6 gap-y-3", className)}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[11.5px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{eyebrow}</p>
        ) : null}
        <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.015em] text-foreground">{title}</h1>
        {description ? <p className="mt-1 max-w-2xl text-[13px] text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function BdCard({
  title,
  actions,
  children,
  className,
  bodyClassName,
  description,
}: {
  title?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  description?: React.ReactNode;
}) {
  return (
    <section className={cn("bd-card", className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-5 py-3.5">
          <div className="min-w-0">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em] text-foreground">{title}</h3>
            {description ? <p className="mt-0.5 text-[12.5px] text-muted-foreground">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={cn("p-5", bodyClassName)}>{children}</div>
    </section>
  );
}

/* ───────────── KPI cards ───────────── */

export type KpiTone = "violet" | "blue" | "red" | "yellow" | "green" | "cyan" | "grey";

/** Tinted icon tiles. Muted, desaturated so a row of KPIs never looks like confetti. */
const TONES: Record<KpiTone, { bg: string; fg: string }> = {
  violet: { bg: "hsl(258 40% 96%)", fg: "hsl(258 38% 50%)" },
  blue: { bg: "hsl(var(--primary-50))", fg: "hsl(var(--primary))" },
  red: { bg: "hsl(358 70% 97%)", fg: "hsl(358 60% 48%)" },
  yellow: { bg: "hsl(38 90% 95%)", fg: "hsl(32 85% 38%)" },
  green: { bg: "hsl(156 45% 95%)", fg: "hsl(156 58% 30%)" },
  cyan: { bg: "hsl(188 50% 95%)", fg: "hsl(188 64% 32%)" },
  grey: { bg: "hsl(var(--muted))", fg: "hsl(var(--muted-foreground))" },
};

export function BdKpi({
  label,
  value,
  icon: Icon,
  tone = "blue",
  onClick,
  href,
  active,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: KpiTone;
  onClick?: () => void;
  /** Makes the card a link (e.g. to a pre-filtered list). */
  href?: string;
  active?: boolean;
  hint?: string;
  className?: string;
}) {
  const t = TONES[tone];
  const interactive = !!(onClick || href);
  const cls = cn(
    "bd-kpi group min-w-0 text-left",
    interactive &&
      "cursor-pointer transition-[box-shadow,border-color] hover:border-primary/30 hover:shadow-[var(--shadow-md)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20",
    active && "border-primary/50 ring-[3px] ring-primary/10",
    className,
  );
  const body = (
    <>
      <div className="min-w-0">
        <p className="truncate text-[12.5px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">
          {label}
        </p>
        <p className="mt-1.5 text-[24px] font-semibold leading-none tracking-[-0.02em] text-foreground tabular-nums">
          {value}
        </p>
        {hint ? <p className="mt-1.5 truncate text-[11.5px] text-muted-foreground">{hint}</p> : null}
      </div>
      {Icon ? (
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-[9px]"
          style={{ background: t.bg, color: t.fg }}
        >
          <Icon className="size-[18px]" />
        </span>
      ) : null}
    </>
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    );
  }
  const Comp = onClick ? "button" : "div";
  return (
    <Comp type={onClick ? "button" : undefined} onClick={onClick} className={cls}>
      {body}
    </Comp>
  );
}

/** Small stat card (title, big number, caption). */
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
        "bd-card block px-4 py-3.5 text-left",
        onClick && "cursor-pointer transition-[box-shadow,border-color] hover:border-primary/30 hover:shadow-[var(--shadow-md)]",
        active && "border-primary/50 ring-[3px] ring-primary/10",
      )}
    >
      <p className="text-[12.5px] font-medium text-muted-foreground">{title}</p>
      <p className="mt-1.5 text-[24px] font-semibold leading-none tracking-[-0.02em] text-foreground tabular-nums">
        {value}
      </p>
      {caption ? <p className="mt-1.5 text-[11.5px] text-muted-foreground">{caption}</p> : null}
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
  hint,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
  hint?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      {label ? <label className="bd-label">{label}</label> : null}
      {children}
      {hint ? <p className="mt-1 text-[11.5px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * Dropdown (popover list, searchable when long) with a clear (✕) affordance once
 * a value is chosen. `value === ""` means "nothing selected".
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
    <Combobox
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder}
      clearable={clearable}
      disabled={disabled}
      className={className}
    />
  );
}

export function BdInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn("bd-input", props.className)} />;
}

export function BdButton({
  variant = "primary",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "light" | "danger" | "ghost" }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        variant === "primary" && "bd-btn",
        variant === "light" && "bd-btn-light",
        variant === "danger" && "bd-btn !bg-destructive hover:!bg-destructive/90",
        variant === "ghost" &&
          "bd-btn-light !border-transparent !bg-transparent !shadow-none hover:!bg-muted",
        "disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0",
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
    <div role="tablist" className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-[10px] bg-muted p-1 scrollbar-hide">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={t.key === value}
          type="button"
          onClick={() => onChange(t.key)}
          className={cn(
            "whitespace-nowrap rounded-[7px] px-3 py-1.5 text-[13px] font-medium transition-colors",
            t.key === value
              ? "bg-card text-foreground shadow-[var(--shadow-sm)]"
              : "text-muted-foreground hover:text-foreground",
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
    <div className={cn("overflow-x-auto rounded-[9px] border border-border/80", className)}>
      <table className="bd-table w-full text-left" style={{ minWidth }}>
        {children}
      </table>
    </div>
  );
}

export function BdTh({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("h-9 px-3 py-0 align-middle", className)}>{children}</th>;
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
      <td colSpan={colSpan} className="px-3 py-14 text-center">
        {loading ? (
          <span className="inline-flex items-center gap-2 text-[13px] text-muted-foreground">
            <span className="size-3.5 animate-spin rounded-full border-2 border-primary/25 border-t-primary" />
            Loading…
          </span>
        ) : (
          <span className="text-[13px] text-muted-foreground">Nothing to show yet</span>
        )}
      </td>
    </tr>
  );
}

/** Legacy palette → token, so old call sites pick up the new theme. */
const BADGE_ALIASES: Record<string, string> = {
  "#3a5dc2": "hsl(var(--primary))",
  "#37b24d": "hsl(var(--success))",
  "#e5484d": "hsl(var(--destructive))",
  "#3d7be8": "hsl(var(--info))",
};

/** Soft, tinted status pill. `color` is the semantic hue; text and tint derive from it. */
export function BdBadge({
  children,
  color = "hsl(var(--primary))",
  className,
}: {
  children: React.ReactNode;
  color?: string;
  className?: string;
}) {
  const c = BADGE_ALIASES[color.toLowerCase()] ?? color;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-[3px] text-[11.5px] font-medium leading-none",
        className,
      )}
      style={{
        background: `color-mix(in srgb, ${c} 11%, white)`,
        color: `color-mix(in srgb, ${c} 82%, black)`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${c} 18%, transparent)`,
      }}
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
  const start = Math.max(1, Math.min(page - 2, pages - 4));
  const nums: number[] = [];
  for (let i = start; i <= Math.min(pages, start + 4); i++) nums.push(i);
  const btn =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-[7px] px-2 text-[13px] tabular-nums transition-colors";
  return (
    <nav aria-label="Pagination" className="inline-flex items-center gap-0.5">
      <button
        type="button"
        aria-label="Previous page"
        disabled={page <= 1}
        onClick={() => onPage(page - 1)}
        className={cn(btn, "text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent")}
      >
        <ChevronLeft className="size-4" />
      </button>
      {nums.map((n) => (
        <button
          key={n}
          type="button"
          aria-current={n === page ? "page" : undefined}
          onClick={() => onPage(n)}
          className={cn(
            btn,
            n === page
              ? "bg-card font-semibold text-foreground shadow-[var(--shadow-sm)] ring-1 ring-border"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          )}
        >
          {n}
        </button>
      ))}
      <button
        type="button"
        aria-label="Next page"
        disabled={page >= pages}
        onClick={() => onPage(page + 1)}
        className={cn(btn, "text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-40 disabled:hover:bg-transparent")}
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}

/**
 * The strip above every data table: search on the left, pagination, page size
 * and any extra controls (column picker, filters) on the right.
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
    <div className="flex flex-wrap items-center justify-between gap-3 pb-3.5">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {onSearch ? (
          <div className="relative w-full sm:w-[280px]">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search ?? ""}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Search…"
              className="bd-input !pl-8 !pr-8"
            />
            {search ? (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => onSearch("")}
                className="absolute right-2 top-1/2 flex size-5 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>
        ) : null}
        {left}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {right}
        {onPageSize ? (
          <label className="flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
            Rows
            <Combobox
              size="sm"
              align="end"
              value={String(pageSize)}
              onChange={(v) => onPageSize(Number(v))}
              options={[10, 20, 50, 100].map((n) => ({ value: String(n), label: String(n) }))}
              className="w-[72px]"
            />
          </label>
        ) : null}
        <BdPagination page={page} totalPages={totalPages} onPage={onPage} />
      </div>
    </div>
  );
}

/** Pill showing a count next to filters. */
export function BdCountChip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2.5 py-[3px] text-[12px] font-medium text-primary-700 ring-1 ring-primary/15 tabular-nums">
      {children}
    </span>
  );
}

export function formatBdDate(d?: string | Date | null) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}
