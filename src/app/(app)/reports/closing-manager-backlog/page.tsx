"use client";

import { StageTableReport } from "@/components/reports/StageTableReport";

export default function ClosingManagerBacklogPage() {
  return (
    <StageTableReport
      title="Closing Manager Backlog"
      description="Per closing manager (manager / supervisor / executive) — what's still open."
      endpoint="/api/reports/closing-manager-backlog"
      labelKey="name"
      firstColumnHeader="Closing Manager"
    />
  );
}
