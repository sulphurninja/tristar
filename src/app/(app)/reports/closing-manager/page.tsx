"use client";

import { SimpleReport } from "@/components/reports/SimpleReport";

interface Data {
  columns: Array<{ key: string; label: string }>;
  rows: Array<{ userId: string; name: string; role: string; total: number; stages: Record<string, number> }>;
}

const build = (d: Data) => ({
  rows: d.rows.map((r) => [
    `${r.name} (${r.role.replace(/_/g, " ")})`,
    r.total,
    ...d.columns.map((c) => r.stages[c.key] ?? 0),
  ]),
  total: [
    "Total",
    d.rows.reduce((a, r) => a + r.total, 0),
    ...d.columns.map((c) => d.rows.reduce((a, r) => a + (r.stages[c.key] ?? 0), 0)),
  ],
});

export default function ClosingManagerReportPage() {
  return (
    <SimpleReport<Data>
      title="Closing Manager Report"
      description="Closing-manager performance - visited, interested, negotiating, booked, lost."
      endpoint="/api/reports/closing-manager"
      columns={["Closing Manager", "Total", "Visited", "Interested", "Negotiating", "Booked", "Lost"]}
      build={build}
    />
  );
}
