"use client";

import { SimpleReport } from "@/components/reports/SimpleReport";

interface Data {
  types: string[];
  rows: Array<{ userId: string; name: string; types: Record<string, number>; total: number; done: number }>;
}

const LABEL: Record<string, string> = {
  call: "Calls",
  whatsapp: "WhatsApp",
  email: "Email",
  meeting: "Meetings",
  site_visit: "Site Visits",
  follow_up: "Follow Ups",
  other: "Other",
};
const TYPES = Object.keys(LABEL);

const build = (d: Data) => {
  const rows = d.rows.map((r) => [
    r.name,
    r.total,
    r.done,
    r.total ? `${Math.round((r.done / r.total) * 100)}%` : "0%",
    ...TYPES.map((t) => r.types[t] ?? 0),
  ]);
  const sum = (f: (r: Data["rows"][number]) => number) => d.rows.reduce((a, r) => a + f(r), 0);
  const total = sum((r) => r.total);
  const done = sum((r) => r.done);
  return {
    rows,
    total: [
      "Total",
      total,
      done,
      total ? `${Math.round((done / total) * 100)}%` : "0%",
      ...TYPES.map((t) => sum((r) => r.types[t] ?? 0)),
    ],
  };
};

export default function CommunicationAnalysisPage() {
  return (
    <SimpleReport<Data>
      title="Communication Analysis"
      description="Scheduled calls, WhatsApp, email and meetings per sales agent, and how many were completed."
      endpoint="/api/reports/communication"
      columns={["Sales Agent", "Total", "Completed", "Completed %", ...TYPES.map((t) => LABEL[t])]}
      build={build}
    />
  );
}
