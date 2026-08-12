import mongoose from "mongoose";
import LeadActivity from "@/models/LeadActivity";
import SiteVisit from "@/models/SiteVisit";
import { withAuth, ok } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "today";
  const types = url.searchParams.get("types")?.split(",").filter(Boolean) ?? [];
  const q = url.searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10), 0);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  const dateFilter: Record<string, Date> = {};
  if (range === "today") {
    dateFilter.$gte = startOfDay;
    dateFilter.$lte = endOfDay;
  } else if (range === "week") {
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);
    dateFilter.$gte = weekAgo;
  } else if (range === "month") {
    const monthAgo = new Date(now);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    dateFilter.$gte = monthAgo;
  }

  const filter: Record<string, unknown> = { workspaceId };
  if (Object.keys(dateFilter).length) filter.occurredAt = dateFilter;
  if (types.length) filter.type = { $in: types };
  if (q) {
    filter.$or = [
      { description: { $regex: q, $options: "i" } },
      { actorName: { $regex: q, $options: "i" } },
    ];
  }

  const occurredFilter =
    range === "all" ? { workspaceId } : { workspaceId, occurredAt: dateFilter };

  const [
    activities,
    total,
    callCount,
    visitActCount,
    stageCount,
    meetingCount,
    whatsappCount,
    visitsScheduled,
    visitsCompleted,
  ] = await Promise.all([
    LeadActivity.find(filter)
      .sort({ occurredAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "leadId", select: "contact leadNumber stage source" })
      .lean(),
    LeadActivity.countDocuments(filter),
    LeadActivity.countDocuments({
      ...occurredFilter,
      type: { $in: ["call_made", "call_missed"] },
    }),
    LeadActivity.countDocuments({
      ...occurredFilter,
      type: { $in: ["site_visit_scheduled", "site_visit_completed"] },
    }),
    LeadActivity.countDocuments({ ...occurredFilter, type: "stage_changed" }),
    LeadActivity.countDocuments({ ...occurredFilter, type: "meeting_logged" }),
    LeadActivity.countDocuments({
      ...occurredFilter,
      type: { $in: ["whatsapp_sent", "whatsapp_received"] },
    }),
    SiteVisit.countDocuments({
      workspaceId,
      ...(range === "today"
        ? { scheduledAt: { $gte: startOfDay, $lte: endOfDay } }
        : range === "all"
          ? {}
          : { scheduledAt: dateFilter.$gte ? { $gte: dateFilter.$gte } : {} }),
    }),
    SiteVisit.countDocuments({
      workspaceId,
      status: "done",
      ...(range === "today"
        ? { updatedAt: { $gte: startOfDay, $lte: endOfDay } }
        : {}),
    }),
  ]);

  return ok({
    activities,
    total,
    report: {
      stageChanges: stageCount,
      meetings: meetingCount,
      siteVisitScheduled: visitsScheduled,
      siteVisitCompleted: visitsCompleted || visitActCount,
      offlineCalls: callCount,
      callsToLead: callCount,
      whatsapp: whatsappCount,
    },
  });
});
