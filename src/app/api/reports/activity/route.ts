import mongoose from "mongoose";
import LeadActivity from "@/models/LeadActivity";
import User from "@/models/User";
import { withAuth, ok } from "@/lib/api";
import { boundsFromSearchParams } from "@/lib/report-utils";

/**
 * Activity Report — for every user, count:
 *   - Total Edits      (every activity)
 *   - Status Edits     (stage_changed)
 *   - Comment Edits    (comment_added)
 *   - Unique Leads     (distinct leadIds touched)
 */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const { start, end, range } = boundsFromSearchParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const [users, agg] = await Promise.all([
    User.find({ workspaceId }).select("name email role").lean(),
    LeadActivity.aggregate<{
      _id: mongoose.Types.ObjectId;
      total: number;
      status: number;
      comment: number;
      uniqueLeads: number;
    }>([
      {
        $match: {
          workspaceId,
          occurredAt: { $gte: start, $lte: end },
          actorId: { $ne: null },
        },
      },
      {
        $group: {
          _id: "$actorId",
          total: { $sum: 1 },
          status: { $sum: { $cond: [{ $eq: ["$type", "stage_changed"] }, 1, 0] } },
          comment: { $sum: { $cond: [{ $eq: ["$type", "comment_added"] }, 1, 0] } },
          leadIds: { $addToSet: "$leadId" },
        },
      },
      {
        $project: {
          total: 1,
          status: 1,
          comment: 1,
          uniqueLeads: { $size: "$leadIds" },
        },
      },
    ]),
  ]);

  const indexed = new Map(agg.map((a) => [String(a._id), a]));
  const rows = users
    .map((u) => {
      const r = indexed.get(String(u._id));
      return {
        userId: String(u._id),
        name: u.name,
        total: r?.total ?? 0,
        status: r?.status ?? 0,
        comment: r?.comment ?? 0,
        uniqueLeads: r?.uniqueLeads ?? 0,
      };
    })
    .filter((r) => r.total > 0);
  rows.sort((a, b) => b.total - a.total);

  return ok({ range, rows });
});
