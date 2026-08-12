"use client";

import { useEffect, useState } from "react";
import { ReportShell, ReportTable } from "@/components/reports/ReportShell";
import { useReportFilters } from "@/hooks/useReportFilters";
import { formatNumber } from "@/lib/utils";

interface Row {
  brokerId: string | null;
  label: string;
  total: number;
  interested: number;
}

export default function ChannelPartnerReportPage() {
  const { range, setRange, from, to, onDatesChange, query, ready } = useReportFilters("30d");
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState<{ total: number; interested: number } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    fetch(`/api/reports/channel-partner?${query}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows ?? []);
        setTotals(d.totalsRow ?? null);
      })
      .finally(() => setLoading(false));
  }, [query, ready]);

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
      ) : (
        <ReportTable
          columns={["Channel Partner", "Total", "Interested"]}
          emptyLabel="No channel-partner-sourced leads in this window."
          rows={rows.map((r) => [
            <span key="label" className="font-medium text-slate-900">
              {r.label}
            </span>,
            <span key="total" className="block text-right font-semibold tabular-nums text-emerald-700">
              {formatNumber(r.total)}
            </span>,
            <span key="interested" className="block text-right tabular-nums text-slate-700">
              {formatNumber(r.interested)}
            </span>,
          ])}
          totalRow={
            totals
              ? [
                  "Total",
                  <span
                    key="total"
                    className="block text-right font-bold tabular-nums text-emerald-700"
                  >
                    {formatNumber(totals.total)}
                  </span>,
                  <span
                    key="interested"
                    className="block text-right font-bold tabular-nums text-slate-900"
                  >
                    {formatNumber(totals.interested)}
                  </span>,
                ]
              : undefined
          }
        />
      )}
    </ReportShell>
  );
}
