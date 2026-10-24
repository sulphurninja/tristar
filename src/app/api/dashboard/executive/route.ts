import mongoose from "mongoose";
import Lead from "@/models/Lead";
import User from "@/models/User";
import Task from "@/models/Task";
import SiteVisit from "@/models/SiteVisit";
import { withAuth, ok } from "@/lib/api";
import { resolveAgentScope, rangeBounds, scopeParams } from "@/lib/scope";

/** Per-executive snapshot for the dashboard's "Executive Lead Analysis" table. */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const { team, agent } = scopeParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const scope = await resolveAgentScope(workspaceId, team, agent);
  const [start, end] = rangeBounds("today")!;

  const userFilter: Record<string, unknown> = { workspaceId, status: { $ne: "suspended" } };
  if (scope) userFilter._id = { $in: scope };
  const users = await User.find(userFilter).select("name role").lean();
  const ids = users.map((u) => u._id);

  const base = { workspaceId, assignedTo: { $in: ids }, isContact: { $ne: true } };
  const [totals, untouched, hot, bookedRows, todayLeads, tasksToday, overdue, visitsToday, visitsDone] =
    await Promise.all([
      Lead.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
        { $match: base },
        { $group: { _id: "$assignedTo", n: { $sum: 1 } } },
      ]),
      Lead.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
        { $match: { ...base, lastContactedAt: null, stage: { $in: ["new", "attempted_1", "attempted_2"] } } },
        { $group: { _id: "$assignedTo", n: { $sum: 1 } } },
      ]),
      Lead.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
        { $match: { ...base, $or: [{ isHot: true }, { stage: "hot" }] } },
        { $group: { _id: "$assignedTo", n: { $sum: 1 } } },
      ]),
      Lead.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
        { $match: { ...base, isBooked: true } },
        { $group: { _id: "$assignedTo", n: { $sum: 1 } } },
      ]),
      Lead.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
        { $match: { ...base, createdAt: { $gte: start, $lte: end } } },
        { $group: { _id: "$assignedTo", n: { $sum: 1 } } },
      ]),
      Task.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
        { $match: { workspaceId, assignedTo: { $in: ids }, scheduleAt: { $gte: start, $lte: end } } },
        { $group: { _id: "$assignedTo", n: { $sum: 1 } } },
      ]),
      Task.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
        {
          $match: {
            workspaceId,
            assignedTo: { $in: ids },
            status: { $in: ["pending", "upcoming"] },
            scheduleAt: { $lt: start },
          },
        },
        { $group: { _id: "$assignedTo", n: { $sum: 1 } } },
      ]),
      SiteVisit.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
        { $match: { workspaceId, assignedTo: { $in: ids }, scheduledAt: { $gte: start, $lte: end } } },
        { $group: { _id: "$assignedTo", n: { $sum: 1 } } },
      ]),
      SiteVisit.aggregate<{ _id: mongoose.Types.ObjectId; n: number }>([
        {
          $match: {
            workspaceId,
            assignedTo: { $in: ids },
            status: "done",
            scheduledAt: { $gte: start, $lte: end },
          },
        },
        { $group: { _id: "$assignedTo", n: { $sum: 1 } } },
      ]),
    ]);

  const toMap = (rows: Array<{ _id: mongoose.Types.ObjectId; n: number }>) =>
    new Map(rows.map((r) => [String(r._id), r.n]));
  const m = {
    total: toMap(totals),
    untouched: toMap(untouched),
    hot: toMap(hot),
    booked: toMap(bookedRows),
    todayLeads: toMap(todayLeads),
    tasksToday: toMap(tasksToday),
    overdue: toMap(overdue),
    visitsToday: toMap(visitsToday),
    visitsDone: toMap(visitsDone),
  };

  const rows = users
    .map((u) => {
      const id = String(u._id);
      return {
        _id: id,
        name: u.name,
        role: u.role,
        totalLeads: m.total.get(id) ?? 0,
        todayLeads: m.todayLeads.get(id) ?? 0,
        untouched: m.untouched.get(id) ?? 0,
        hot: m.hot.get(id) ?? 0,
        tasksToday: m.tasksToday.get(id) ?? 0,
        overdueTasks: m.overdue.get(id) ?? 0,
        siteVisitsToday: m.visitsToday.get(id) ?? 0,
        siteVisitsDone: m.visitsDone.get(id) ?? 0,
        booked: m.booked.get(id) ?? 0,
      };
    })
    .filter((r) => r.totalLeads || r.tasksToday || r.siteVisitsToday || r.overdueTasks)
    .sort((a, b) => b.totalLeads - a.totalLeads);

  return ok({ rows });
});
