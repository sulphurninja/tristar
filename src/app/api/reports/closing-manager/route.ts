import mongoose from "mongoose";
import Lead from "@/models/Lead";
import User from "@/models/User";
import { withAuth, ok } from "@/lib/api";
import { boundsFromSearchParams, scopeIds, scopeMatch } from "@/lib/report-utils";

/**
 * Closing Manager Report — for every user with role manager / supervisor /
 * sales_executive, count leads that progressed beyond `site_visit_done`,
 * including final outcomes (booked, lost, negotiating).
 */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const { start, end, range } = boundsFromSearchParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const scope = await scopeIds(url, workspaceId);

  const [users, agg] = await Promise.all([
    User.find({
      workspaceId,
      role: { $in: ["manager", "supervisor", "sales_executive"] },
    })
      .select("name role")
      .lean(),
    Lead.aggregate<{ _id: { user: mongoose.Types.ObjectId | null; stage: string }; count: number }>(
      [
        {
          $match: {
            workspaceId,
          ...scopeMatch(scope),
            createdAt: { $gte: start, $lte: end },
            stage: { $in: ["interested", "negotiating", "booked", "lost", "site_visit_done"] },
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

  const STAGES = ["site_visit_done", "interested", "negotiating", "booked", "lost"];

  const rows = users
    .map((u) => {
      const stages = indexed[String(u._id)] ?? {};
      const total = STAGES.reduce((a, k) => a + (stages[k] ?? 0), 0);
      const cells: Record<string, number> = {};
      for (const k of STAGES) cells[k] = stages[k] ?? 0;
      return { userId: String(u._id), name: u.name, role: u.role, total, stages: cells };
    })
    .filter((r) => r.total > 0);

  rows.sort((a, b) => b.total - a.total);

  return ok({
    range,
    columns: [
      { key: "site_visit_done", label: "Visited" },
      { key: "interested", label: "Interested" },
      { key: "negotiating", label: "Negotiating" },
      { key: "booked", label: "Booked" },
      { key: "lost", label: "Lost" },
    ],
    rows,
  });
});
