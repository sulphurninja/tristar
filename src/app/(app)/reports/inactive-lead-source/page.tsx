"use client";

import { SimpleReport } from "@/components/reports/SimpleReport";

interface Data {
  rows: Array<{ source: string; label: string; count: number }>;
  total: number;
}

const build = (d: Data) => ({
  rows: d.rows.map((r) => [r.label, r.count]),
  total: ["Total", d.total],
});

export default function InactiveLeadSourceReportPage() {
  return (
    <SimpleReport<Data>
      title="Inactive Lead Source Report"
      description="Inactive lead split by lead source."
      endpoint="/api/reports/inactive-lead-source"
      columns={["Source", "Inactive Leads"]}
      asOf
      hideRange
      build={build}
    />
  );
}
