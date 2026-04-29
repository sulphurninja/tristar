import mongoose from "mongoose";
import Lead from "@/models/Lead";
import User from "@/models/User";
import { withAuth, ok } from "@/lib/api";

/**
 * Inactive Lead Report — leads with no contact for 30+ days, grouped by
 * the user they're assigned to.
 */
export const GET = withAuth(async ({ session }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const [users, agg] = await Promise.all([
    User.find({ workspaceId }).select("name").lean(),
    Lead.aggregate<{ _id: mongoose.Types.ObjectId | null; count: number }>([
      {
        $match: {
          workspaceId,
          isBooked: { $ne: true },
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

  return ok({ rows, total: rows.reduce((a, b) => a + b.count, 0) });
});
