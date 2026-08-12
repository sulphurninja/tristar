import mongoose from "mongoose";
import Lead from "@/models/Lead";
import SiteVisit from "@/models/SiteVisit";
import Task from "@/models/Task";
import User from "@/models/User";
import { withAuth, ok } from "@/lib/api";
import { boundsFromSearchParams } from "@/lib/report-utils";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const { start, end } = boundsFromSearchParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const now = end;

  const seriesStart = new Date(start);
  // Cap sparkline to last 14 day-buckets within the selected window for readability
  const maxSpanMs = 13 * 24 * 60 * 60 * 1000;
  if (end.getTime() - seriesStart.getTime() > maxSpanMs) {
    seriesStart.setTime(end.getTime() - maxSpanMs);
    seriesStart.setHours(0, 0, 0, 0);
  }

  const [
    todayLeads,
    svScheduled,
    svCompleted,
    bookings,
    unqualified,
    weekLeads,
    weekVisits,
    weekCompletedVisits,
    weekBookings,
    weekUnqualified,
    tasksOntime,
    tasksDelayed,
    overdueByAgent,
    users,
  ] = await Promise.all([
    Lead.countDocuments({ workspaceId, createdAt: { $gte: start, $lte: end } }),
    SiteVisit.countDocuments({
      workspaceId,
      scheduledAt: { $gte: start, $lte: end },
    }),
    SiteVisit.countDocuments({
      workspaceId,
      status: "done",
      updatedAt: { $gte: start, $lte: end },
    }),
    Lead.countDocuments({
      workspaceId,
      stage: "booked",
      updatedAt: { $gte: start, $lte: end },
    }),
    Lead.countDocuments({
      workspaceId,
      stage: { $in: ["junk", "not_interested", "lost"] },
      updatedAt: { $gte: start, $lte: end },
    }),
    Lead.aggregate<{ _id: string; count: number }>([
      { $match: { workspaceId, createdAt: { $gte: seriesStart, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SiteVisit.aggregate<{ _id: string; count: number }>([
      { $match: { workspaceId, scheduledAt: { $gte: seriesStart, $lte: end } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$scheduledAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    SiteVisit.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          workspaceId,
          status: "done",
          updatedAt: { $gte: seriesStart, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Lead.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          workspaceId,
          stage: "booked",
          updatedAt: { $gte: seriesStart, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Lead.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          workspaceId,
          stage: { $in: ["junk", "not_interested", "lost"] },
          updatedAt: { $gte: seriesStart, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$updatedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Task.countDocuments({
      workspaceId,
      status: "completed",
      completedAt: { $gte: start, $lte: end },
      $or: [
        { scheduleAt: null },
        { scheduleAt: { $exists: false } },
        { $expr: { $lte: ["$completedAt", "$scheduleAt"] } },
      ],
    }),
    Task.countDocuments({
      workspaceId,
      $or: [
        {
          status: { $in: ["pending", "upcoming"] },
          scheduleAt: { $gte: start, $lt: now },
        },
        {
          status: "completed",
          completedAt: { $gte: start, $lte: end },
          scheduleAt: { $ne: null },
          $expr: { $gt: ["$completedAt", "$scheduleAt"] },
        },
      ],
    }),
    Task.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      {
        $match: {
          workspaceId,
          status: { $in: ["pending", "upcoming"] },
          scheduleAt: { $gte: start, $lt: now },
          assignedTo: { $ne: null },
        },
      },
      { $group: { _id: "$assignedTo", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 12 },
    ]),
    User.find({ workspaceId }).select("name").lean(),
  ]);

  const days: string[] = [];
  const cursor = new Date(seriesStart);
  while (cursor <= end) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  const toSeries = (rows: Array<{ _id: string; count: number }>) =>
    days.map((day) => ({
      day: day.slice(8),
      value: rows.find((r) => r._id === day)?.count ?? 0,
    }));

  const userMap = new Map(users.map((u) => [String(u._id), u.name ?? "Unknown"]));
  const delayByAgent = overdueByAgent.map((a) => ({
    name: userMap.get(String(a._id)) ?? "Unknown",
    value: a.count,
  }));

  const totalActivity = tasksOntime + tasksDelayed;

  return ok({
    kpis: {
      todayLeads,
      siteVisitScheduled: svScheduled,
      siteVisitCompleted: svCompleted,
      booking: bookings,
      leadUnqualified: unqualified,
    },
    series: {
      todayLeads: toSeries(weekLeads),
      siteVisitScheduled: toSeries(weekVisits),
      siteVisitCompleted: toSeries(weekCompletedVisits),
      booking: toSeries(weekBookings),
      leadUnqualified: toSeries(weekUnqualified),
    },
    activity: {
      total: totalActivity,
      ontime: tasksOntime,
      delayed: tasksDelayed,
      pctOntime: totalActivity ? Math.round((tasksOntime / totalActivity) * 100) : 0,
      mostDelayBy: delayByAgent[0]?.name ?? "—",
    },
    delayByAgent,
  });
});
