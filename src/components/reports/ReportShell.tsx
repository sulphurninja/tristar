"use client";

import Link from "next/link";
import { ReactNode, useMemo } from "react";
import { format } from "date-fns";
import { type DateRange } from "react-day-picker";
import { Download, ArrowLeft, CalendarRange } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DatePicker, DateRangePicker } from "@/components/ui/date-picker";
import { TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { cn } from "@/lib/utils";

export type ReportRange =
  | "today"
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "ytd"
  | "custom";

const RANGE_PRESETS: Array<{ key: ReportRange; label: string }> = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "this_month", label: "This Month" },
  { key: "last_month", label: "Last Month" },
  { key: "ytd", label: "Till Date" },
  { key: "custom", label: "Custom" },
];

export interface ReportDateState {
  range: ReportRange;
  from?: Date;
  to?: Date;
}

interface ReportShellProps {
  title: string;
  description?: string;
  range: ReportRange;
  onRangeChange: (r: ReportRange) => void;
  /** Custom / explicit date bounds — used when range is custom or for as-of filtering */
  from?: Date;
  to?: Date;
  onDatesChange?: (dates: { from?: Date; to?: Date }) => void;
  onExport?: () => void;
  rightExtra?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  /** Show a single "As of" date picker beside the range (enterprise reports) */
  showAsOf?: boolean;
  asOf?: Date;
  onAsOfChange?: (d: Date | undefined) => void;
}

export function reportQuery(state: ReportDateState) {
  const params = new URLSearchParams();
  params.set("range", state.range);
  if (state.range === "custom" && state.from && state.to) {
    params.set("from", format(state.from, "yyyy-MM-dd"));
    params.set("to", format(state.to, "yyyy-MM-dd"));
  }
  return params.toString();
}

export function ReportShell({
  title,
  description,
  range,
  onRangeChange,
  from,
  to,
  onDatesChange,
  onExport,
  rightExtra,
  children,
  disabled,
  showAsOf,
  asOf,
  onAsOfChange,
}: ReportShellProps) {
  const customRange: DateRange | undefined = useMemo(
    () => (from || to ? { from, to } : undefined),
    [from, to],
  );

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="border-b border-slate-200/70 px-7 py-6 lg:px-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <Link
              href="/reports"
              className="inline-flex items-center gap-1 text-[11.5px] font-medium text-slate-500 hover:text-slate-700"
            >
              <ArrowLeft className="size-3" />
              Reports
            </Link>
            <h1 className="mt-1 text-[20px] font-bold tracking-tight text-slate-900">
              {title}
            </h1>
            {description ? (
              <p className="mt-1 text-[12.5px] text-slate-500">{description}</p>
            ) : null}
          </div>
          {rightExtra}
        </div>
      </div>

      <div className="sticky top-0 z-20 space-y-3 border-b border-slate-200/70 bg-white/95 px-7 py-3 backdrop-blur lg:px-10">
        <div className="flex flex-wrap items-center gap-2">
          {onExport ? (
            <Button variant="outline" className="h-9 gap-1.5" onClick={onExport} disabled={disabled}>
              <Download className="size-4" strokeWidth={1.75} />
              Export
            </Button>
          ) : null}

          <div className="flex flex-wrap items-center gap-1.5">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.key}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onRangeChange(p.key);
                  if (p.key !== "custom") onDatesChange?.({ from: undefined, to: undefined });
                }}
                className={cn(
                  "h-8 rounded-lg px-2.5 text-[12px] font-medium transition-colors",
                  range === p.key
                    ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/20"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200/80",
                  disabled && "pointer-events-none opacity-50",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold uppercase tracking-wider text-slate-400">
            <CalendarRange className="size-3.5" />
            Date range
          </span>
          <DateRangePicker
            disabled={disabled}
            value={
              range === "custom"
                ? customRange
                : undefined
            }
            onChange={(r) => {
              onRangeChange("custom");
              onDatesChange?.({ from: r?.from, to: r?.to });
            }}
            className={cn(range !== "custom" && "border-dashed")}
            placeholder={
              range === "custom" ? "Select custom range" : "Pick custom range…"
            }
          />
          {showAsOf ? (
            <>
              <span className="ml-1 text-[11.5px] font-semibold uppercase tracking-wider text-slate-400">
                As of
              </span>
              <DatePicker
                disabled={disabled}
                value={asOf}
                onChange={onAsOfChange ?? (() => undefined)}
                placeholder="As of date"
                className="h-9 w-[160px]"
              />
            </>
          ) : null}
          {range === "custom" && from && to ? (
            <span className="text-[12px] text-slate-500">
              Showing {format(from, "dd MMM yyyy")} – {format(to, "dd MMM yyyy")}
            </span>
          ) : null}
        </div>
      </div>

      <div className="flex-1 px-7 py-6 lg:px-10">{children}</div>
    </div>
  );
}

export function ReportTable({
  columns,
  rows,
  emptyLabel = "No data",
  totalRow,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  emptyLabel?: string;
  totalRow?: React.ReactNode[];
}) {
  if (rows.length === 0) {
    return (
      <div className="rounded-xl bg-slate-50/60 px-6 py-12 text-center text-[13px] text-slate-500">
        {emptyLabel}
      </div>
    );
  }
  return (
    <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-200/80">
      <TableRoot className="min-w-0">
        <thead>
          <tr>
            {columns.map((c) => (
              <Th key={c}>{c}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="transition-colors hover:bg-slate-50/80">
              {row.map((cell, ci) => (
                <Td key={ci}>{cell}</Td>
              ))}
            </tr>
          ))}
          {totalRow ? (
            <tr className="bg-slate-50/70">
              {totalRow.map((cell, ci) => (
                <Td key={ci} className="font-bold text-slate-900">
                  {cell}
                </Td>
              ))}
            </tr>
          ) : null}
        </tbody>
      </TableRoot>
    </div>
  );
}
