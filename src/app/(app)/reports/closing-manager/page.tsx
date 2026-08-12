"use client";

import { useEffect, useState } from "react";
import { ReportShell } from "@/components/reports/ReportShell";
import { useReportFilters } from "@/hooks/useReportFilters";
import { TableRoot, Th, Td } from "@/components/shared/DataTableShell";
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
  const { range, setRange, from, to, onDatesChange, query, ready } = useReportFilters("30d");
  const [columns, setColumns] = useState<Column[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    fetch(`/api/reports/closing-manager?${query}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setColumns(d.columns ?? []);
        setRows(d.rows ?? []);
      })
      .finally(() => setLoading(false));
  }, [query, ready]);

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
      from={from}
      to={to}
      onDatesChange={onDatesChange}
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
        <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-200/80">
          <TableRoot>
            <thead>
              <tr>
                <Th>Closing Manager</Th>
                <Th>Role</Th>
                <Th className="text-right">Total</Th>
                {columns.map((c) => (
                  <Th key={c.key} className="text-right">
                    {c.label}
                  </Th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="transition-colors hover:bg-slate-50/80">
                  <Td className="font-medium text-slate-900">{r.name}</Td>
                  <Td className="capitalize text-slate-600">{r.role.replace(/_/g, " ")}</Td>
                  <Td className="text-right font-semibold tabular-nums text-emerald-700">
                    {formatNumber(r.total)}
                  </Td>
                  {columns.map((c) => (
                    <Td key={c.key} className="text-right tabular-nums text-slate-700">
                      {formatNumber(r.stages[c.key] ?? 0)}
                    </Td>
                  ))}
                </tr>
              ))}
            </tbody>
          </TableRoot>
        </div>
      )}
    </ReportShell>
  );
}
