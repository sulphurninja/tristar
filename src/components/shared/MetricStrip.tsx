import { cn, formatNumber } from "@/lib/utils";

export interface KpiItem {
  key: string;
  label: string;
  value: number | string;
  hint?: string;
  tone?: "default" | "primary" | "warning" | "danger" | "muted";
}

const toneClass: Record<NonNullable<KpiItem["tone"]>, string> = {
  default: "text-slate-900",
  primary: "text-primary",
  warning: "text-amber-700",
  danger: "text-red-600",
  muted: "text-slate-500",
};

export function KpiStat({
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  label: string;
  value: number | string;
  hint?: string;
  tone?: KpiItem["tone"];
  className?: string;
}) {
  const display = typeof value === "number" ? formatNumber(value) : value;
  return (
    <div className={cn("min-w-0 py-1", className)}>
      <p className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500">
        {label}
      </p>
      <p className={cn("mt-1 text-[22px] font-semibold tracking-tight tabular-nums", toneClass[tone ?? "default"])}>
        {display}
      </p>
      {hint ? <p className="mt-0.5 truncate text-[12px] text-slate-500">{hint}</p> : null}
    </div>
  );
}

export function MetricStrip({
  items,
  className,
}: {
  items: KpiItem[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid gap-px overflow-hidden rounded-xl border border-slate-200/80 bg-slate-200/70 shadow-sm sm:grid-cols-2 lg:grid-cols-5",
        className,
      )}
    >
      {items.map((item) => (
        <div key={item.key} className="bg-white px-4 py-3.5">
          <KpiStat label={item.label} value={item.value} hint={item.hint} tone={item.tone} />
        </div>
      ))}
    </div>
  );
}
