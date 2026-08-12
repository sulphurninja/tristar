import mongoose from "mongoose";
import Lead from "@/models/Lead";
import Project from "@/models/Project";
import { withAuth, ok } from "@/lib/api";
import { boundsFromSearchParams, PIPELINE_COLUMNS } from "@/lib/report-utils";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const { start, end, range } = boundsFromSearchParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const [projects, agg] = await Promise.all([
    Project.find({ workspaceId }).select("name code location.city").lean(),
    Lead.aggregate<{
      _id: { project: mongoose.Types.ObjectId | null; stage: string };
      count: number;
    }>([
      { $match: { workspaceId, createdAt: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: { project: "$primaryProjectId", stage: "$stage" },
          count: { $sum: 1 },
        },
      },
    ]),
  ]);

  const indexed: Record<string, Record<string, number>> = {};
  for (const r of agg) {
    const pid = r._id.project ? String(r._id.project) : "_unknown";
    indexed[pid] = indexed[pid] ?? {};
    indexed[pid][r._id.stage] = r.count;
  }

  const rows = projects
    .map((p) => {
      const stages = indexed[String(p._id)] ?? {};
      const total = Object.values(stages).reduce((a, b) => a + b, 0);
      const cells: Record<string, number> = {};
      for (const c of PIPELINE_COLUMNS) cells[c.key] = stages[c.key] ?? 0;
      return {
        projectId: String(p._id),
        name: p.name,
        city: p.location?.city,
        total,
        stages: cells,
      };
    })
    .filter((r) => r.total > 0);

  if (indexed._unknown) {
    const total = Object.values(indexed._unknown).reduce((a, b) => a + b, 0);
    if (total > 0) {
      const cells: Record<string, number> = {};
      for (const c of PIPELINE_COLUMNS) cells[c.key] = indexed._unknown[c.key] ?? 0;
      rows.push({ projectId: "_unknown", name: "Unassigned", city: "", total, stages: cells });
    }
  }

  rows.sort((a, b) => b.total - a.total);

  const totalsRow = {
    name: "Total",
    total: rows.reduce((a, b) => a + b.total, 0),
    stages: PIPELINE_COLUMNS.reduce<Record<string, number>>((acc, c) => {
      acc[c.key] = rows.reduce((a, b) => a + (b.stages[c.key] ?? 0), 0);
      return acc;
    }, {}),
  };

  return ok({ range, columns: PIPELINE_COLUMNS, rows, totalsRow });
});
