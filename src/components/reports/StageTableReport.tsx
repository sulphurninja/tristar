"use client";

import { useEffect, useState } from "react";
import { ReportShell, type ReportRange } from "@/components/reports/ReportShell";
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
  const [range, setRange] = useState<ReportRange>("30d");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`${endpoint}?range=${range}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [endpoint, range]);

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
      onExport={exportCsv}
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : !data || data.rows.length === 0 ? (
        <div className="rounded-xl bg-slate-50/60 px-6 py-12 text-center text-[13px] text-slate-500">
          No data for this window.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/70">
          <table className="w-full text-[13px]">
            <thead className="bg-sky-50/80">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                <th className="px-4 py-3">{firstColumnHeader}</th>
                <th className="px-4 py-3 text-right">Total</th>
                {data.columns.map((c) => (
                  <th key={c.key} className="px-4 py-3 text-right">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.rows.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-t border-slate-100 transition-colors hover:bg-slate-50/60"
                >
                  <td className="px-4 py-2.5 font-medium text-slate-900">
                    {String(row[labelKey] ?? "")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-emerald-700">
                    {formatNumber(row.total)}
                  </td>
                  {data.columns.map((c) => {
                    const v = row.stages[c.key] ?? 0;
                    return (
                      <td
                        key={c.key}
                        className="px-4 py-2.5 text-right tabular-nums text-slate-700"
                      >
                        {v === 0 ? <span className="text-slate-300">0</span> : formatNumber(v)}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {data.totalsRow ? (
                <tr className="border-t-2 border-slate-200 bg-slate-50/70">
                  <td className="px-4 py-2.5 font-bold text-slate-900">Total</td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums text-emerald-700">
                    {formatNumber(data.totalsRow.total)}
                  </td>
                  {data.columns.map((c) => (
                    <td
                      key={c.key}
                      className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-900"
                    >
                      {formatNumber(data.totalsRow!.stages[c.key] ?? 0)}
                    </td>
                  ))}
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}
