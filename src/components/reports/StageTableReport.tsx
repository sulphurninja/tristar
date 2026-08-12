"use client";

import { useEffect, useState } from "react";
import { ReportShell, type ReportRange } from "@/components/reports/ReportShell";
import { useReportFilters } from "@/hooks/useReportFilters";
import { TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { formatNumber } from "@/lib/utils";

interface StageRow {
  total: number;
  stages: Record<string, number>;
  [k: string]: unknown;
}

interface StageColumn {
  key: string;
  label: string;
}

interface ApiResponse {
  range: ReportRange;
  columns: StageColumn[];
  rows: StageRow[];
  totalsRow?: StageRow & { name?: string; label?: string };
}

interface Props {
  title: string;
  description?: string;
  endpoint: string;
  /** Field on each row to use as the row label (e.g. "name" or "label") */
  labelKey: string;
  /** Header for the first column (e.g. "User", "Project", "Source") */
  firstColumnHeader: string;
}

export function StageTableReport({
  title,
  description,
  endpoint,
  labelKey,
  firstColumnHeader,
}: Props) {
  const { range, setRange, from, to, onDatesChange, query, ready } = useReportFilters("30d");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    fetch(`${endpoint}?${query}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [endpoint, query, ready]);

  const exportCsv = () => {
    if (!data) return;
    const headers = [firstColumnHeader, "Total", ...data.columns.map((c) => c.label)];
    const rows = data.rows.map((r) => [
      String(r[labelKey] ?? ""),
      String(r.total),
      ...data.columns.map((c) => String(r.stages[c.key] ?? 0)),
    ]);
    if (data.totalsRow) {
      rows.push([
        "Total",
        String(data.totalsRow.total),
        ...data.columns.map((c) => String(data.totalsRow!.stages[c.key] ?? 0)),
      ]);
    }
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.toLowerCase().replace(/\s+/g, "-")}-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReportShell
      title={title}
      description={description}
      range={range}
      onRangeChange={setRange}
      from={from}
      to={to}
      onDatesChange={onDatesChange}
      onExport={exportCsv}
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : !ready ? (
        <div className="rounded-xl bg-slate-50/60 px-6 py-12 text-center text-[13px] text-slate-500">
          Select a start and end date to load this report.
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="rounded-xl bg-slate-50/60 px-6 py-12 text-center text-[13px] text-slate-500">
          No data for this window.
        </div>
      ) : (
        <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-200/80">
          <TableRoot className="min-w-0">
            <thead>
              <tr>
                <Th>{firstColumnHeader}</Th>
                <Th className="text-right">Total</Th>
                {data.columns.map((c) => (
                  <Th key={c.key} className="text-right">
                    {c.label}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((r, i) => (
                <tr key={i} className="transition-colors hover:bg-slate-50/80">
                  <Td className="font-medium text-slate-900">{String(r[labelKey] ?? "—")}</Td>
                  <Td className="text-right tabular-nums font-semibold">
                    {formatNumber(r.total)}
                  </Td>
                  {data.columns.map((c) => (
                    <Td key={c.key} className="text-right tabular-nums text-slate-600">
                      {formatNumber(r.stages[c.key] ?? 0)}
                    </Td>
                  ))}
                </tr>
              ))}
              {data.totalsRow ? (
                <tr className="bg-slate-50/70">
                  <Td className="font-bold text-slate-900">Total</Td>
                  <Td className="text-right tabular-nums font-bold">
                    {formatNumber(data.totalsRow.total)}
                  </Td>
                  {data.columns.map((c) => (
                    <Td key={c.key} className="text-right tabular-nums font-bold">
                      {formatNumber(data.totalsRow!.stages[c.key] ?? 0)}
                    </Td>
                  ))}
                </tr>
              ) : null}
            </tbody>
          </TableRoot>
        </div>
      )}
    </ReportShell>
  );
}
