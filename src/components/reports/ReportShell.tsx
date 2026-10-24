"use client";

import Link from "next/link";
import { ReactNode } from "react";
import { format } from "date-fns";
import { Download } from "lucide-react";
import {
  BdPage,
  BdCard,
  BdButton,
  BdSelect,
  BdField,
  BdTable,
  BdTh,
  BdTd,
  BdEmptyRow,
} from "@/components/bd";
import { BdDateRange, BdDateInput, ymd } from "@/components/bd/DateInputs";
import { TeamAgentSelects, type TeamAgentValue } from "@/components/bd/TeamAgentSelects";

export type ReportRange =
  | "today"
  | "7d"
  | "30d"
  | "this_month"
  | "last_month"
  | "ytd"
  | "custom";

const RANGE_PRESETS: Array<{ value: ReportRange; label: string }> = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "this_month", label: "This Month" },
  { value: "last_month", label: "Last Month" },
  { value: "ytd", label: "Till Date" },
  { value: "custom", label: "Custom" },
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
  from?: Date;
  to?: Date;
  onDatesChange?: (dates: { from?: Date; to?: Date }) => void;
  onExport?: () => void;
  rightExtra?: ReactNode;
  children: ReactNode;
  disabled?: boolean;
  /** Show a single "As of" date picker (inactive-lead reports) */
  showAsOf?: boolean;
  asOf?: Date;
  onAsOfChange?: (d: Date | undefined) => void;
  /** Team / Sales Agent filter */
  scope?: TeamAgentValue;
  onScopeChange?: (v: TeamAgentValue) => void;
  /** Hide the date-range controls (reports that are not date-windowed) */
  hideRange?: boolean;
  onReset?: () => void;
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

function parseYmd(s: string) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
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
  scope,
  onScopeChange,
  hideRange,
  onReset,
}: ReportShellProps) {
  return (
    <BdPage>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/reports" className="text-[12px] text-[#3a5dc2] hover:underline">
            Report
          </Link>
          <h1 className="text-[20px] font-semibold text-[#2b2f3a]">{title}</h1>
          {description ? <p className="mt-0.5 text-[12.5px] text-[#8b90a0]">{description}</p> : null}
        </div>
        {scope && onScopeChange ? <TeamAgentSelects value={scope} onChange={onScopeChange} /> : null}
      </div>

      <BdCard bodyClassName="p-4">
        <div className="flex flex-wrap items-end gap-4">
          {!hideRange ? (
            <>
              <BdField label="Date Range" className="w-[200px]">
                <BdSelect
                  clearable={false}
                  value={range}
                  disabled={disabled}
                  onChange={(v) => {
                    const r = (v || "30d") as ReportRange;
                    onRangeChange(r);
                    if (r === "custom") {
                      if (!from || !to) {
                        const t = new Date();
                        const f = new Date();
                        f.setDate(f.getDate() - 29);
                        onDatesChange?.({ from: f, to: t });
                      }
                    } else onDatesChange?.({ from: undefined, to: undefined });
                  }}
                  options={RANGE_PRESETS}
                />
              </BdField>
              {range === "custom" ? (
                <BdField label="From - To">
                  <BdDateRange
                    from={from ? ymd(from) : ""}
                    to={to ? ymd(to) : ""}
                    onChange={(v) => onDatesChange?.({ from: parseYmd(v.from), to: parseYmd(v.to) })}
                  />
                </BdField>
              ) : null}
            </>
          ) : null}
          {showAsOf ? (
            <BdField label="As of">
              <BdDateInput value={asOf ? ymd(asOf) : ymd()} onChange={(v) => onAsOfChange?.(parseYmd(v))} />
            </BdField>
          ) : null}
          <div className="ml-auto flex items-center gap-2">
            {onReset ? (
              <BdButton variant="light" onClick={onReset}>
                Clear
              </BdButton>
            ) : null}
            {onExport ? (
              <BdButton onClick={onExport} disabled={disabled}>
                <Download className="size-3.5" />
                Export CSV
              </BdButton>
            ) : null}
            {rightExtra}
          </div>
        </div>
      </BdCard>

      {children}
    </BdPage>
  );
}

/** Simple Buildesk data table: columns + rows (+ optional bold totals row). */
export function ReportTable({
  columns,
  rows,
  emptyLabel,
  totalRow,
  loading,
}: {
  columns: string[];
  rows: Array<Array<React.ReactNode>>;
  emptyLabel?: string;
  totalRow?: React.ReactNode[];
  loading?: boolean;
}) {
  return (
    <BdCard bodyClassName="p-0">
      <BdTable minWidth={Math.max(600, columns.length * 110)}>
        <thead>
          <tr>
            {columns.map((c, i) => (
              <BdTh key={c} className={i === 0 ? "" : "text-right"}>
                {c}
              </BdTh>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            loading || !emptyLabel ? (
              <BdEmptyRow colSpan={columns.length} loading={loading} />
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-3 py-10 text-center text-[13px] text-[#8b90a0]">
                  {emptyLabel}
                </td>
              </tr>
            )
          ) : (
            rows.map((row, idx) => (
              <tr key={idx}>
                {row.map((cell, ci) => (
                  <BdTd key={ci} className={ci === 0 ? "" : "text-right tabular-nums"}>
                    {cell}
                  </BdTd>
                ))}
              </tr>
            ))
          )}
          {totalRow && rows.length > 0 ? (
            <tr className="bg-[#f6f8fd]">
              {totalRow.map((cell, ci) => (
                <BdTd key={ci} className={`font-bold ${ci === 0 ? "" : "text-right tabular-nums"}`}>
                  {cell}
                </BdTd>
              ))}
            </tr>
          ) : null}
        </tbody>
      </BdTable>
    </BdCard>
  );
}
