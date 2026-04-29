"use client";

import { StageTableReport } from "@/components/reports/StageTableReport";

export default function SourcesReportPage() {
  return (
    <StageTableReport
      title="Sources Report"
      description="Walk-in, telecalling, channel partner and online — broken down by stage."
      endpoint="/api/reports/sources"
      labelKey="label"
      firstColumnHeader="Source"
    />
  );
}
