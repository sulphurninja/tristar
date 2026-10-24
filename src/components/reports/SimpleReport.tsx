"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ReportShell, ReportTable } from "@/components/reports/ReportShell";
import { useReportFilters } from "@/hooks/useReportFilters";
import { downloadCsv } from "@/lib/csv";
import { formatNumber } from "@/lib/utils";

export type Cell = string | number;
export interface Built {
  rows: Cell[][];
  total?: Cell[];
}

/**
 * Generic "filters -> one table" report. The page supplies the endpoint, the
 * column headers and a `build` that turns the JSON into rows (first column is
 * left aligned text, the rest are right aligned numbers). CSV export and the
 * Team / Sales Agent + date-range controls come for free.
 */
export function SimpleReport<T>({
  title,
  description,
  endpoint,
  columns,
  build,
  asOf: useAsOf,
  hideRange,
  emptyLabel,
}: {
  title: string;
  description?: string;
  endpoint: string;
  columns: string[];
  build: (data: T) => Built;
  /** inactive-lead style: single "As of" date instead of a window */
  asOf?: boolean;
  hideRange?: boolean;
  emptyLabel?: string;
}) {
  const f = useReportFilters("30d");
  const [asOf, setAsOf] = useState<Date>(new Date());
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const query = useMemo(() => {
    const p = new URLSearchParams(f.query);
    if (useAsOf) p.set("asOf", format(asOf, "yyyy-MM-dd"));
    return p.toString();
  }, [f.query, asOf, useAsOf]);

  useEffect(() => {
    if (!f.ready) return;
    setLoading(true);
    let live = true;
    fetch(`${endpoint}?${query}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => live && setData(d.error ? null : d))
      .catch(() => live && setData(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [endpoint, query, f.ready]);

  const built = useMemo<Built>(() => (data ? build(data) : { rows: [] }), [data, build]);
  const fmt = (c: Cell) => (typeof c === "number" ? formatNumber(c) : c);

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
      hideRange={hideRange}
      showAsOf={useAsOf}
      asOf={asOf}
      onAsOfChange={(d) => d && setAsOf(d)}
      onReset={() => {
        f.reset();
        setAsOf(new Date());
      }}
      onExport={() =>
        downloadCsv(`${title.toLowerCase().replace(/\s+/g, "-")}-${f.range}`, [
          columns,
          ...built.rows,
          ...(built.total ? [built.total] : []),
        ])
      }
    >
      <ReportTable
        loading={loading || !f.ready}
        emptyLabel={emptyLabel}
        columns={columns}
        rows={built.rows.map((r) => r.map((c, i) => (i === 0 ? <span className="font-medium">{c}</span> : fmt(c))))}
        totalRow={built.total?.map(fmt)}
      />
    </ReportShell>
  );
}
