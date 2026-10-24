import mongoose from "mongoose";
import Lead from "@/models/Lead";
import User from "@/models/User";
import { withAuth, ok } from "@/lib/api";
import { boundsFromSearchParams, scopeIds, scopeMatch } from "@/lib/report-utils";

/**
 * Inactive Lead Report — leads with no contact for 30+ days (as of date),
 * grouped by assignee.
 */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const { end } = boundsFromSearchParams(url);
  const asOfParam = url.searchParams.get("asOf");
  const asOf = asOfParam ? new Date(asOfParam) : end;
  asOf.setHours(23, 59, 59, 999);

  const cutoff = new Date(asOf);
  cutoff.setDate(cutoff.getDate() - 30);

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const scope = await scopeIds(url, workspaceId);

  const [users, agg] = await Promise.all([
    User.find({ workspaceId }).select("name").lean(),
    Lead.aggregate<{ _id: mongoose.Types.ObjectId | null; count: number }>([
      {
        $match: {
          workspaceId,
          ...scopeMatch(scope),
          isBooked: { $ne: true },
          createdAt: { $lte: asOf },
          $or: [
            { isInactive: true },
            { lastContactedAt: { $lt: cutoff } },
            { lastContactedAt: { $exists: false }, createdAt: { $lt: cutoff } },
          ],
        },
      },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
    ]),
  ]);

  const indexed = new Map(agg.map((a) => [String(a._id ?? "_unassigned"), a.count]));
  const rows = users
    .map((u) => ({
      userId: String(u._id),
      name: u.name,
      count: indexed.get(String(u._id)) ?? 0,
    }))
    .filter((r) => r.count > 0);
  rows.sort((a, b) => b.count - a.count);

  if (indexed.has("_unassigned")) {
    rows.push({
      userId: "_unassigned",
      name: "Unassigned",
      count: indexed.get("_unassigned") ?? 0,
    });
  }

  return ok({ rows, total: rows.reduce((a, b) => a + b.count, 0), asOf: asOf.toISOString() });
});
