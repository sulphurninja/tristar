import mongoose from "mongoose";
import Lead from "@/models/Lead";
import User from "@/models/User";
import { withAuth, ok } from "@/lib/api";
import { boundsFromSearchParams, PIPELINE_COLUMNS } from "@/lib/report-utils";

/**
 * Team Performance Report — for every user in the workspace, count leads in
 * each pipeline stage that fall inside the selected date range.
 *
 * The screenshot shows columns: User, Total, New, Warm, Attempted-1,
 * Attempted-2, Interested, Not Interested, Switch Off, CNR, CNC.
 */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const { start, end, range } = boundsFromSearchParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const [users, perUser] = await Promise.all([
    User.find({ workspaceId }).select("name email role status").lean(),
    Lead.aggregate<{ _id: { user: mongoose.Types.ObjectId | null; stage: string }; count: number }>(
      [
        { $match: { workspaceId, createdAt: { $gte: start, $lte: end } } },
        {
          $group: {
            _id: { user: "$assignedTo", stage: "$stage" },
            count: { $sum: 1 },
          },
        },
      ],
    ),
  ]);

  const indexed: Record<string, Record<string, number>> = {};
  for (const r of perUser) {
    const uid = r._id.user ? String(r._id.user) : "_unassigned";
    indexed[uid] = indexed[uid] ?? {};
    indexed[uid][r._id.stage] = r.count;
  }

  const rows = users.map((u) => {
    const stages = indexed[String(u._id)] ?? {};
    const total = Object.values(stages).reduce((a, b) => a + b, 0);
    const cells: Record<string, number> = {};
    for (const c of PIPELINE_COLUMNS) cells[c.key] = stages[c.key] ?? 0;
    return {
      userId: String(u._id),
      name: u.name,
      total,
      stages: cells,
    };
  });

  /* Drop users with 0 leads in this range — but always keep the unassigned bucket if it has leads */
  const filtered = rows.filter((r) => r.total > 0);
  if (indexed._unassigned) {
    const total = Object.values(indexed._unassigned).reduce((a, b) => a + b, 0);
    if (total > 0) {
      const cells: Record<string, number> = {};
      for (const c of PIPELINE_COLUMNS) cells[c.key] = indexed._unassigned[c.key] ?? 0;
      filtered.push({ userId: "_unassigned", name: "Unassigned", total, stages: cells });
    }
  }

  filtered.sort((a, b) => b.total - a.total);

  /* Totals row */
  const totalsRow = {
    name: "Total",
    total: filtered.reduce((a, b) => a + b.total, 0),
    stages: PIPELINE_COLUMNS.reduce<Record<string, number>>((acc, c) => {
      acc[c.key] = filtered.reduce((a, b) => a + (b.stages[c.key] ?? 0), 0);
      return acc;
    }, {}),
  };

  return ok({ range, columns: PIPELINE_COLUMNS, rows: filtered, totalsRow });
});
