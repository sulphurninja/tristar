"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ReportShell, ReportTable } from "@/components/reports/ReportShell";
import { useReportFilters } from "@/hooks/useReportFilters";
import { formatNumber } from "@/lib/utils";

interface Row {
  source: string;
  label: string;
  count: number;
}

export default function InactiveLeadSourceReportPage() {
  const { range, setRange, from, to, onDatesChange } = useReportFilters("30d");
  const [asOf, setAsOf] = useState<Date | undefined>(new Date());
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (asOf) params.set("asOf", format(asOf, "yyyy-MM-dd"));
    if (range === "custom" && from && to) {
      params.set("from", format(from, "yyyy-MM-dd"));
      params.set("to", format(to, "yyyy-MM-dd"));
    } else {
      params.set("range", range);
    }
    fetch(`/api/reports/inactive-lead-source?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.rows ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [range, from, to, asOf]);

  const exportCsv = () => {
    const csv = [
      "Source,Inactive Leads",
      ...rows.map((r) => `${r.label},${r.count}`),
      `Total,${total}`,
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `inactive-lead-source.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReportShell
      title="Inactive Lead Source Report"
      description="Inactive lead split by lead source."
      range={range}
      onRangeChange={setRange}
      from={from}
      to={to}
      onDatesChange={onDatesChange}
      showAsOf
      asOf={asOf}
      onAsOfChange={setAsOf}
      onExport={exportCsv}
    >
      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-9 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : (
        <ReportTable
          columns={["Source", "Inactive Leads"]}
          emptyLabel="No inactive leads."
          rows={rows.map((r) => [
            <span key="label" className="font-medium text-slate-900">
              {r.label}
            </span>,
            <span key="count" className="block text-right font-semibold tabular-nums text-amber-700">
              {formatNumber(r.count)}
            </span>,
          ])}
          totalRow={[
            "Total",
            <span key="total" className="block text-right font-bold tabular-nums text-amber-700">
              {formatNumber(total)}
            </span>,
          ]}
        />
      )}
    </ReportShell>
  );
}
