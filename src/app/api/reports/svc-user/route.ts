import mongoose from "mongoose";
import Lead from "@/models/Lead";
import User from "@/models/User";
import { withAuth, ok } from "@/lib/api";
import { boundsFromSearchParams, pipelineColumns, scopeIds, scopeMatch } from "@/lib/report-utils";

/**
 * SVC (Site Visit Conversion) User Report — for each user, leads they own
 * that visited the site, broken down by post-visit stage.
 *
 * Numbers in parentheses on the screenshot represent the unique-lead count.
 */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const { start, end, range } = boundsFromSearchParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const scope = await scopeIds(url, workspaceId);
  const cols = await pipelineColumns(workspaceId);

  const [users, agg] = await Promise.all([
    User.find({ workspaceId }).select("name").lean(),
    Lead.aggregate<{ _id: { user: mongoose.Types.ObjectId | null; stage: string }; count: number }>(
      [
        {
          $match: {
            workspaceId,
          ...scopeMatch(scope),
            createdAt: { $gte: start, $lte: end },
            stage: {
              $in: [
                "site_visit_done",
                "site_visit_scheduled",
                "interested",
                "negotiating",
                "booked",
                "new",
                "attempted_1",
                "cnr",
              ],
            },
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
