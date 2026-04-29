"use client";

import { useEffect, useState } from "react";
import { ReportShell, type ReportRange } from "@/components/reports/ReportShell";
import { formatNumber } from "@/lib/utils";

interface Column {
  key: string;
  label: string;
}

interface Row {
  userId: string;
  name: string;
  role: string;
  total: number;
  stages: Record<string, number>;
}

export default function ClosingManagerReportPage() {
  const [range, setRange] = useState<ReportRange>("30d");
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/closing-manager?range=${range}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setColumns(d.columns ?? []);
        setRows(d.rows ?? []);
      })
      .finally(() => setLoading(false));
  }, [range]);

  const exportCsv = () => {
    const csv = [
      ["Closing Manager", "Role", "Total", ...columns.map((c) => c.label)].join(","),
      ...rows.map((r) =>
        [r.name, r.role, r.total, ...columns.map((c) => r.stages[c.key] ?? 0)].join(","),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `closing-manager-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReportShell
      title="Closing Manager Report"
      description="Closing-manager performance — visited, interested, negotiating, booked, lost."
      range={range}
      onRangeChange={setRange}
      onExport={exportCsv}
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-xl bg-slate-50/60 px-6 py-12 text-center text-[13px] text-slate-500">
          No data for this window.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/70">
          <table className="w-full text-[13px]">
            <thead className="bg-sky-50/80">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                <th className="px-4 py-3">Closing Manager</th>
                <th className="px-4 py-3">Role</th>
                <th className="px-4 py-3 text-right">Total</th>
                {columns.map((c) => (
                  <th key={c.key} className="px-4 py-3 text-right">
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-2.5 text-slate-600 capitalize">
                    {r.role.replace(/_/g, " ")}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-emerald-700">
                    {formatNumber(r.total)}
                  </td>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className="px-4 py-2.5 text-right tabular-nums text-slate-700"
                    >
                      {formatNumber(r.stages[c.key] ?? 0)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}
