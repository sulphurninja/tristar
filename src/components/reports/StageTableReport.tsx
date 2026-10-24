"use client";

import { useEffect, useState } from "react";
import { ReportShell, ReportTable, type ReportRange } from "@/components/reports/ReportShell";
import { useReportFilters } from "@/hooks/useReportFilters";
import { downloadCsv } from "@/lib/csv";
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

export function StageTableReport({ title, description, endpoint, labelKey, firstColumnHeader }: Props) {
  const f = useReportFilters("30d");
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!f.ready) return;
    setLoading(true);
    let live = true;
    fetch(`${endpoint}?${f.query}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => live && setData(d.error ? null : d))
      .catch(() => live && setData(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [endpoint, f.query, f.ready]);

  const columns = data?.columns ?? [];
  const rows = data?.rows ?? [];

  const exportCsv = () => {
    if (!data) return;
    const out: Array<Array<string | number>> = [
      [firstColumnHeader, "Total", ...columns.map((c) => c.label)],
      ...rows.map((r) => [String(r[labelKey] ?? ""), r.total, ...columns.map((c) => r.stages[c.key] ?? 0)]),
    ];
    if (data.totalsRow) {
      out.push(["Total", data.totalsRow.total, ...columns.map((c) => data.totalsRow!.stages[c.key] ?? 0)]);
    }
    downloadCsv(`${title.toLowerCase().replace(/\s+/g, "-")}-${f.range}`, out);
  };

  return (
    <ReportShell
      title={title}
      description={description}
      range={f.range}
      onRangeChange={f.setRange}
      from={f.from}
      to={f.to}
      onDatesChange={f.onDatesChange}
      scope={f.scope}
      onScopeChange={f.setScope}
      onReset={f.reset}
      onExport={exportCsv}
    >
      <ReportTable
        loading={loading || !f.ready}
        emptyLabel={f.ready ? undefined : "Select a start and end date"}
        columns={[firstColumnHeader, "Total", ...columns.map((c) => c.label)]}
        rows={rows.map((r) => [
          <span key="l" className="font-medium">
            {String(r[labelKey] ?? "-")}
          </span>,
          <b key="t">{formatNumber(r.total)}</b>,
          ...columns.map((c) => formatNumber(r.stages[c.key] ?? 0)),
        ])}
        totalRow={
          data?.totalsRow
            ? [
                "Total",
                formatNumber(data.totalsRow.total),
                ...columns.map((c) => formatNumber(data.totalsRow!.stages[c.key] ?? 0)),
              ]
            : undefined
        }
      />
    </ReportShell>
  );
}
