"use client";

import { SimpleReport } from "@/components/reports/SimpleReport";

interface Data {
  rows: Array<{ userId: string; name: string; count: number }>;
  total: number;
}

const build = (d: Data) => ({
  rows: d.rows.map((r) => [r.name, r.count]),
  total: ["Total", d.total],
});

export default function InactiveLeadsReportPage() {
  return (
    <SimpleReport<Data>
      title="Inactive Lead Report"
      description="Leads with no contact in the 30 days before the chosen date, grouped by assignee."
      endpoint="/api/reports/inactive-leads"
      columns={["User", "Inactive Leads"]}
      asOf
      hideRange
      build={build}
    />
  );
}
