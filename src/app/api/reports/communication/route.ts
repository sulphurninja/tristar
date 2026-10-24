import mongoose from "mongoose";
import Task from "@/models/Task";
import User from "@/models/User";
import { withAuth, ok } from "@/lib/api";
import { boundsFromSearchParams, scopeIds, scopeMatch } from "@/lib/report-utils";

const TYPES = ["call", "whatsapp", "email", "meeting", "site_visit", "follow_up", "other"] as const;

/**
 * Communication Analysis - per sales agent, how many scheduled communication
 * tasks (calls, WhatsApp, email, meetings ...) fell in the window and how many
 * of them were completed.
 */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const { start, end, range } = boundsFromSearchParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const scope = await scopeIds(url, workspaceId);

  const [agg, users] = await Promise.all([
    Task.aggregate<{ _id: { user: mongoose.Types.ObjectId | null; type: string }; total: number; done: number }>([
      {
        $match: {
          workspaceId,
          ...scopeMatch(scope),
          status: { $ne: "cancelled" },
          scheduleAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { user: "$assignedTo", type: "$type" },
          total: { $sum: 1 },
          done: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
        },
      },
    ]),
    User.find({ workspaceId }).select("name").lean(),
  ]);
  const names = new Map(users.map((u) => [String(u._id), u.name as string]));

  const byUser = new Map<string, { name: string; types: Record<string, number>; total: number; done: number }>();
  for (const r of agg) {
    const id = r._id.user ? String(r._id.user) : "_unassigned";
    const row = byUser.get(id) ?? {
      name: r._id.user ? (names.get(id) ?? "Unknown") : "Unassigned",
      types: {},
      total: 0,
      done: 0,
    };
    row.types[r._id.type] = (row.types[r._id.type] ?? 0) + r.total;
    row.total += r.total;
    row.done += r.done;
    byUser.set(id, row);
  }
  const rows = [...byUser.entries()]
    .map(([userId, r]) => ({ userId, ...r }))
    .sort((a, b) => b.total - a.total);

  return ok({ range, types: TYPES, rows });
});
