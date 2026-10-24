"use client";

import { SimpleReport } from "@/components/reports/SimpleReport";

interface Data {
  rows: Array<{ userId: string; name: string; total: number; status: number; comment: number; uniqueLeads: number }>;
}

const build = (d: Data) => ({
  rows: d.rows.map((r) => [r.name, r.total, r.status, r.comment, r.uniqueLeads]),
  total: [
    "Total",
    d.rows.reduce((a, r) => a + r.total, 0),
    d.rows.reduce((a, r) => a + r.status, 0),
    d.rows.reduce((a, r) => a + r.comment, 0),
    d.rows.reduce((a, r) => a + r.uniqueLeads, 0),
  ],
});

export default function ActivityReportPage() {
  return (
    <SimpleReport<Data>
      title="Activity Report"
      description="Total edits, status edits, comments and unique leads touched per user."
      endpoint="/api/reports/activity"
      columns={["User", "Total Edits", "Status Edits", "Comment Edits", "Unique Leads Edited"]}
      build={build}
    />
  );
}
