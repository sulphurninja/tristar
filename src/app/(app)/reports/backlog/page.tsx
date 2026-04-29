"use client";

import { StageTableReport } from "@/components/reports/StageTableReport";

export default function BacklogReportPage() {
  return (
    <StageTableReport
      title="Backlog Report"
      description="Leads still pending action — overdue or never-followed-up — bucketed per user."
      endpoint="/api/reports/backlog"
      labelKey="name"
      firstColumnHeader="User"
    />
  );
}
