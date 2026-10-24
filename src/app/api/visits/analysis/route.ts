import mongoose from "mongoose";
import SiteVisit from "@/models/SiteVisit";
import User from "@/models/User";
import Project from "@/models/Project";
import { withAuth, ok } from "@/lib/api";
import { buildVisitFilter } from "@/lib/visit-filters";

/** Aggregates for the current Site Visit filter (same params as GET /api/visits). */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const { filter } = await buildVisitFilter(workspaceId, url, session);

  const [byStatus, byAgent, byProject, byType, total, cpYes] = await Promise.all([
    SiteVisit.aggregate([{ $match: filter }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
    SiteVisit.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$assignedTo",
          total: { $sum: 1 },
          completed: { $sum: { $cond: [{ $eq: ["$status", "done"] }, 1, 0] } },
          noShow: { $sum: { $cond: [{ $eq: ["$status", "no_show"] }, 1, 0] } },
          cancelled: { $sum: { $cond: [{ $eq: ["$status", "cancelled"] }, 1, 0] } },
        },
      },
      { $sort: { total: -1 } },
    ]),
    SiteVisit.aggregate([
      { $match: filter },
      { $group: { _id: "$projectId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 15 },
    ]),
    SiteVisit.aggregate([{ $match: filter }, { $group: { _id: "$visitType", count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    SiteVisit.countDocuments(filter),
    SiteVisit.countDocuments({ $and: [filter, { cpPresent: true }] }),
  ]);

  const [users, projects] = await Promise.all([
    User.find({ workspaceId, _id: { $in: byAgent.map((a) => a._id).filter(Boolean) } }).select("name").lean(),
    Project.find({ workspaceId, _id: { $in: byProject.map((a) => a._id).filter(Boolean) } }).select("name").lean(),
  ]);
  const uName = new Map(users.map((u) => [String(u._id), u.name]));
  const pName = new Map(projects.map((p) => [String(p._id), p.name]));
  const done = byStatus.find((s) => s._id === "done")?.count ?? 0;

  return ok({
    total,
    cpPresent: cpYes,
    conversionRate: total ? Math.round((done / total) * 1000) / 10 : 0,
    byStatus: byStatus.map((s) => ({ status: s._id, count: s.count })),
    byType: byType.map((t) => ({ type: t._id ?? "site_visit", count: t.count })),
    byProject: byProject.map((p) => ({ name: p._id ? (pName.get(String(p._id)) ?? "Unknown") : "-", count: p.count })),
    byAgent: byAgent.map((a) => ({
      name: a._id ? (uName.get(String(a._id)) ?? "Unknown") : "Unassigned",
      total: a.total,
      completed: a.completed,
      noShow: a.noShow,
      cancelled: a.cancelled,
    })),
  });
});
