"use client";

import { StageTableReport } from "@/components/reports/StageTableReport";

export default function TeamPerformanceReportPage() {
  return (
    <StageTableReport
      title="Team Performance Report"
      description="Per-user breakdown across every pipeline stage for the selected window."
      endpoint="/api/reports/team-performance"
      labelKey="name"
      firstColumnHeader="User"
    />
  );
}
