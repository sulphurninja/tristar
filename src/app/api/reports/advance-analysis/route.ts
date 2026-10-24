import mongoose from "mongoose";
import Lead from "@/models/Lead";
import SiteVisit from "@/models/SiteVisit";
import Booking from "@/models/Booking";
import { withAuth, ok } from "@/lib/api";
import { boundsFromSearchParams, scopeIds, scopeMatch } from "@/lib/report-utils";
import { activityCompleted, dailyMetrics, UNQUALIFIED_STAGES } from "@/lib/lead-analysis";

/**
 * Advance Analysis - the Lead Analysis KPIs over an arbitrary date window
 * (counts for the whole window, sparkline = trailing 7 days of the window end).
 */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const { start, end } = boundsFromSearchParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const scope = await scopeIds(url, workspaceId);
  const a = scopeMatch(scope);

  const [leads, svScheduled, svCompleted, bookings, unqualified, daily, activity] = await Promise.all([
    Lead.countDocuments({ workspaceId, ...a, createdAt: { $gte: start, $lte: end } }),
    SiteVisit.countDocuments({ workspaceId, ...a, scheduledAt: { $gte: start, $lte: end } }),
    SiteVisit.countDocuments({
      workspaceId,
      ...a,
      status: "done",
      $or: [
        { completedAt: { $gte: start, $lte: end } },
        { completedAt: { $exists: false }, updatedAt: { $gte: start, $lte: end } },
      ],
    }),
    Booking.countDocuments({
      workspaceId,
      ...scopeMatch(scope, "salesAgentId"),
      approvalStatus: { $ne: "rejected" },
      bookedAt: { $gte: start, $lte: end },
    }),
    Lead.countDocuments({
      workspaceId,
      ...a,
      stage: { $in: UNQUALIFIED_STAGES },
      updatedAt: { $gte: start, $lte: end },
    }),
    dailyMetrics({ workspaceId, scope }, end),
    activityCompleted({ workspaceId, scope }, start, end),
  ]);

  const rev = (s: Array<{ day: string; value: number }>) =>
    [...s].reverse().map((p) => ({ day: p.day, value: p.value }));

  return ok({
    kpis: {
      todayLeads: leads,
      siteVisitScheduled: svScheduled,
      siteVisitCompleted: svCompleted,
      booking: bookings,
      leadUnqualified: unqualified,
    },
    series: {
      todayLeads: rev(daily.todayLeads.series),
      siteVisitScheduled: rev(daily.siteVisitScheduled.series),
      siteVisitCompleted: rev(daily.siteVisitCompleted.series),
      booking: rev(daily.booking.series),
      leadUnqualified: rev(daily.leadUnqualified.series),
    },
    activity: {
      total: activity.total,
      ontime: activity.ontime,
      delayed: activity.delayed,
      pctOntime: activity.pctOntime,
      mostDelayBy: activity.byAgent[0]?.delayed ? activity.byAgent[0].name : "-",
    },
    delayByAgent: activity.byAgent
      .filter((x) => x.delayed > 0)
      .map((x) => ({ name: x.name, value: x.delayed })),
  });
});
