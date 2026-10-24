"use client";

import { SimpleReport } from "@/components/reports/SimpleReport";

interface Data {
  rows: Array<{ brokerId: string | null; label: string; total: number; interested: number }>;
  totalsRow?: { total: number; interested: number };
}

const build = (d: Data) => ({
  rows: d.rows.map((r) => [r.label, r.total, r.interested]),
  total: d.totalsRow ? ["Total", d.totalsRow.total, d.totalsRow.interested] : undefined,
});

export default function ChannelPartnerReportPage() {
  return (
    <SimpleReport<Data>
      title="Channel Partner Report"
      description="Lead and conversion split per broker / firm."
      endpoint="/api/reports/channel-partner"
      columns={["Channel Partner", "Total", "Interested"]}
      build={build}
    />
  );
}
