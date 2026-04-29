"use client";

import { useEffect, useState } from "react";
import { ReportShell, type ReportRange } from "@/components/reports/ReportShell";
import { formatNumber } from "@/lib/utils";

interface Row {
  userId: string;
  name: string;
  total: number;
  status: number;
  comment: number;
  uniqueLeads: number;
}

export default function ActivityReportPage() {
  const [range, setRange] = useState<ReportRange>("30d");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/activity?range=${range}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d.rows ?? []))
      .finally(() => setLoading(false));
  }, [range]);

  const exportCsv = () => {
    const csv = [
      "User,Total Edits,Status Edits,Comment Edits,Unique Leads Edited",
      ...rows.map((r) => `${r.name},${r.total},${r.status},${r.comment},${r.uniqueLeads}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReportShell
      title="Activity Report"
      description="Total edits, status edits, comments and unique leads touched per user."
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
      ) : rows.length === 0 ? (
        <div className="rounded-xl bg-slate-50/60 px-6 py-12 text-center text-[13px] text-slate-500">
          No user activity in this window.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/70">
          <table className="w-full text-[13px]">
            <thead className="bg-sky-50/80">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3 text-right">Total Edits</th>
                <th className="px-4 py-3 text-right">Status Edits</th>
                <th className="px-4 py-3 text-right">Comment Edits</th>
                <th className="px-4 py-3 text-right">Unique Leads Edited</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.userId} className="border-t border-slate-100 hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-medium text-slate-900">{r.name}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-emerald-700">
                    {formatNumber(r.total)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {formatNumber(r.status)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {formatNumber(r.comment)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {formatNumber(r.uniqueLeads)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}
