"use client";

import { useEffect, useState } from "react";
import { ReportShell, type ReportRange } from "@/components/reports/ReportShell";
import { formatNumber } from "@/lib/utils";

interface Row {
  userId: string;
  name: string;
  count: number;
}

export default function InactiveLeadsReportPage() {
  const [range, setRange] = useState<ReportRange>("30d");
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/inactive-leads`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, []);

  const exportCsv = () => {
    const csv = [
      "User,Inactive Leads",
      ...rows.map((r) => `${r.name},${r.count}`),
      `Total,${total}`,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `inactive-leads.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReportShell
      title="Inactive Lead Report"
      description="Leads with no contact in the last 30 days, grouped by their assignee."
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
          No inactive leads — your team is on top of follow-ups.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/70">
          <table className="w-full text-[13px]">
            <thead className="bg-sky-50/80">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3 text-right">Inactive Leads</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-amber-700">
                    {formatNumber(r.count)}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 bg-slate-50/70">
                <td className="px-4 py-2.5 font-bold text-slate-900">Total</td>
                <td className="px-4 py-2.5 text-right font-bold tabular-nums text-amber-700">
                  {formatNumber(total)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}
