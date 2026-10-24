import mongoose from "mongoose";
import Task from "@/models/Task";
import User from "@/models/User";
import { withAuth, ok } from "@/lib/api";
import { buildTaskFilter } from "@/lib/task-filters";

/** Aggregates for the current Tasks filter (same query params as GET /api/tasks). */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const { filter } = await buildTaskFilter(workspaceId, url, session);
  const now = new Date();
  const open = { $in: ["pending", "upcoming"] };

  const [byStatus, byType, byAgent, overdue, total] = await Promise.all([
    Task.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    Task.aggregate([{ $match: filter }, { $group: { _id: "$type", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Task.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$assignedTo",
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $in: ["$status", ["pending", "upcoming"]] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                { $and: [{ $in: ["$status", ["pending", "upcoming"]] }, { $lt: ["$scheduleAt", now] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { total: -1 } },
    ]),
    Task.countDocuments({ $and: [filter, { status: open, scheduleAt: { $lt: now } }] }),
    Task.countDocuments(filter),
  ]);

  const users = await User.find({ workspaceId, _id: { $in: byAgent.map((a) => a._id).filter(Boolean) } })
    .select("name")
    .lean();
  const nameOf = new Map(users.map((u) => [String(u._id), u.name]));

  const statusMap: Record<string, number> = { pending: 0, completed: 0, cancelled: 0 };
  for (const s of byStatus) {
    const k = s._id === "upcoming" ? "pending" : (s._id as string);
    statusMap[k] = (statusMap[k] ?? 0) + s.count;
  }
  return ok({
    total,
    overdue,
    completionRate: total ? Math.round((statusMap.completed / total) * 1000) / 10 : 0,
    byStatus: Object.entries(statusMap).map(([status, count]) => ({ status, count })),
    byType: byType.map((t) => ({ type: t._id ?? "other", count: t.count })),
    byAgent: byAgent.map((a) => ({
      agentId: a._id ? String(a._id) : null,
      name: a._id ? (nameOf.get(String(a._id)) ?? "Unknown") : "Unassigned",
      total: a.total,
      completed: a.completed,
      pending: a.pending,
      overdue: a.overdue,
    })),
  });
});
