"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export type ReportRange = "today" | "7d" | "30d" | "this_month" | "last_month" | "ytd";

const RANGE_LABEL: Record<ReportRange, string> = {
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  this_month: "This Month",
  last_month: "Last Month",
  ytd: "Till Date",
};

interface ReportShellProps {
  title: string;
  description?: string;
  range: ReportRange;
  onRangeChange: (r: ReportRange) => void;
  onExport?: () => void;
  rightExtra?: ReactNode;
  children: ReactNode;
  /** Disable the export and ranges (used by disabled-marketing reports) */
  disabled?: boolean;
}

export function ReportShell({
  title,
  description,
  range,
  onRangeChange,
  onExport,
  rightExtra,
  children,
  disabled,
}: ReportShellProps) {
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

      <div className="sticky top-[72px] z-20 flex flex-wrap items-center gap-2 border-b border-slate-200/70 bg-white px-7 py-3 lg:px-10">
        {onExport ? (
          <Button variant="outline" className="gap-1.5" onClick={onExport} disabled={disabled}>
            <Download className="size-4" strokeWidth={1.75} />
            Export
          </Button>
        ) : null}
        <Tabs
          value={range}
          onValueChange={(v) => !disabled && onRangeChange(v as ReportRange)}
        >
          <TabsList>
            {(Object.keys(RANGE_LABEL) as ReportRange[]).map((k) => (
              <TabsTrigger key={k} value={k} disabled={disabled}>
                {RANGE_LABEL[k]}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
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
    <div className="overflow-x-auto rounded-xl border border-slate-200/70">
      <table className="w-full text-[13px]">
        <thead className="bg-sky-50/80">
          <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
            {columns.map((c) => (
              <th key={c} className="px-4 py-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
            >
              {row.map((cell, ci) => (
                <td key={ci} className="px-4 py-2.5 text-slate-700">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
          {totalRow ? (
            <tr className="border-t-2 border-slate-200 bg-slate-50/60">
              {totalRow.map((cell, ci) => (
                <td key={ci} className="px-4 py-2.5 font-bold text-slate-900">
                  {cell}
                </td>
              ))}
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
