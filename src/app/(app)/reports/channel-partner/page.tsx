"use client";

import { useEffect, useState } from "react";
import { ReportShell, type ReportRange } from "@/components/reports/ReportShell";
import { formatNumber } from "@/lib/utils";

interface Row {
  brokerId: string | null;
  label: string;
  total: number;
  interested: number;
}

export default function ChannelPartnerReportPage() {
  const [range, setRange] = useState<ReportRange>("30d");
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<{ total: number; interested: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/channel-partner?range=${range}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows ?? []);
        setTotals(d.totalsRow ?? null);
      })
      .finally(() => setLoading(false));
  }, [range]);

  const exportCsv = () => {
    const csv = [
      "Channel Partner,Total,Interested",
      ...rows.map((r) => `"${r.label.replace(/"/g, '""')}",${r.total},${r.interested}`),
      `Total,${totals?.total ?? 0},${totals?.interested ?? 0}`,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `channel-partner-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReportShell
      title="Channel Partner Report"
      description="Lead and conversion split per broker / firm."
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
          No channel-partner-sourced leads in this window.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200/70">
          <table className="w-full text-[13px]">
            <thead className="bg-sky-50/80">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-700">
                <th className="px-4 py-3">Channel Partner</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right">Interested</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr
                  key={r.brokerId ?? r.label}
                  className="border-t border-slate-100 hover:bg-slate-50/60"
                >
                  <td className="px-4 py-2.5 font-medium text-slate-900">{r.label}</td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-emerald-700">
                    {formatNumber(r.total)}
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">
                    {formatNumber(r.interested)}
                  </td>
                </tr>
              ))}
              {totals ? (
                <tr className="border-t-2 border-slate-200 bg-slate-50/70">
                  <td className="px-4 py-2.5 font-bold text-slate-900">Total</td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums text-emerald-700">
                    {formatNumber(totals.total)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-bold tabular-nums text-slate-900">
                    {formatNumber(totals.interested)}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}
    </ReportShell>
  );
}
