import mongoose from "mongoose";
import Lead from "@/models/Lead";
import User from "@/models/User";
import { withAuth, ok } from "@/lib/api";
import { boundsFromSearchParams, pipelineColumns, scopeIds, scopeMatch } from "@/lib/report-utils";

/**
 * Backlog Report — leads that are still active (not booked, not lost) and have
 * a follow-up that's already past or no follow-up at all. Bucketed per user
 * and per pipeline stage.
 */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const { start, end, range } = boundsFromSearchParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const scope = await scopeIds(url, workspaceId);
  const cols = await pipelineColumns(workspaceId);
  const now = new Date();

  const [users, agg] = await Promise.all([
    User.find({ workspaceId }).select("name email role").lean(),
    Lead.aggregate<{ _id: { user: mongoose.Types.ObjectId | null; stage: string }; count: number }>(
      [
        {
          $match: {
            workspaceId,
          ...scopeMatch(scope),
            isBooked: { $ne: true },
            stage: { $nin: ["lost", "junk", "duplicate", "booked"] },
            createdAt: { $gte: start, $lte: end },
            $or: [{ nextActionAt: { $lt: now } }, { nextActionAt: { $exists: false } }],
          },
        },
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
  for (const r of agg) {
    const uid = r._id.user ? String(r._id.user) : "_unassigned";
    indexed[uid] = indexed[uid] ?? {};
    indexed[uid][r._id.stage] = r.count;
  }

  const rows = users
    .map((u) => {
      const stages = indexed[String(u._id)] ?? {};
      const total = Object.values(stages).reduce((a, b) => a + b, 0);
      const cells: Record<string, number> = {};
      for (const c of cols) cells[c.key] = stages[c.key] ?? 0;
      return { userId: String(u._id), name: u.name, total, stages: cells };
    })
    .filter((r) => r.total > 0);


  if (indexed._unassigned) {
    const total = Object.values(indexed._unassigned).reduce((a, b) => a + b, 0);
    if (total > 0) {
      const cells: Record<string, number> = {};
      for (const c of cols) cells[c.key] = indexed._unassigned[c.key] ?? 0;
      rows.push({ userId: "_unassigned", name: "Unassigned", total, stages: cells });
    }
  }

  rows.sort((a, b) => b.total - a.total);

  const totalsRow = {
    name: "Total",
    total: rows.reduce((a, b) => a + b.total, 0),
    stages: cols.reduce<Record<string, number>>((acc, c) => {
      acc[c.key] = rows.reduce((a, b) => a + (b.stages[c.key] ?? 0), 0);
      return acc;
    }, {}),
  };

  return ok({ range, columns: cols, rows, totalsRow });
});
