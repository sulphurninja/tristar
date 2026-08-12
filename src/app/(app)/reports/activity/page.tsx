"use client";

import { useEffect, useState } from "react";
import { ReportShell, ReportTable } from "@/components/reports/ReportShell";
import { useReportFilters } from "@/hooks/useReportFilters";
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
  const { range, setRange, from, to, onDatesChange, query, ready } = useReportFilters("30d");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    fetch(`/api/reports/activity?${query}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d.rows ?? []))
      .finally(() => setLoading(false));
  }, [query, ready]);

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
      from={from}
      to={to}
      onDatesChange={onDatesChange}
      onExport={exportCsv}
    >
      {loading || !ready ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : (
        <ReportTable
          columns={[
            "User",
            "Total Edits",
            "Status Edits",
            "Comment Edits",
            "Unique Leads Edited",
          ]}
          emptyLabel="No user activity in this window."
          rows={rows.map((r) => [
            <span key="name" className="font-medium text-slate-900">
              {r.name}
            </span>,
            <span key="total" className="block text-right font-semibold tabular-nums text-emerald-700">
              {formatNumber(r.total)}
            </span>,
            <span key="status" className="block text-right tabular-nums text-slate-700">
              {formatNumber(r.status)}
            </span>,
            <span key="comment" className="block text-right tabular-nums text-slate-700">
              {formatNumber(r.comment)}
            </span>,
            <span key="unique" className="block text-right tabular-nums text-slate-700">
              {formatNumber(r.uniqueLeads)}
            </span>,
          ])}
        />
      )}
    </ReportShell>
  );
}
