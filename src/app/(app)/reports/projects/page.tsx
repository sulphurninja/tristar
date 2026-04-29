"use client";

import { StageTableReport } from "@/components/reports/StageTableReport";

export default function ProjectsReportPage() {
  return (
    <StageTableReport
      title="Projects Report"
      description="Lead distribution and stage mix per Tristar project."
      endpoint="/api/reports/projects"
      labelKey="name"
      firstColumnHeader="Project"
    />
  );
}
