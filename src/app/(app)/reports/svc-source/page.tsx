"use client";

import { StageTableReport } from "@/components/reports/StageTableReport";

export default function SvcSourceReportPage() {
  return (
    <StageTableReport
      title="SVC Source Report"
      description="Site Visit Conversion per lead source."
      endpoint="/api/reports/svc-source"
      labelKey="label"
      firstColumnHeader="Source"
    />
  );
}
