"use client";

import { StageTableReport } from "@/components/reports/StageTableReport";

export default function SvcUserReportPage() {
  return (
    <StageTableReport
      title="SVC User Report"
      description="Site Visit Conversion per user."
      endpoint="/api/reports/svc-user"
      labelKey="name"
      firstColumnHeader="User"
    />
  );
}
