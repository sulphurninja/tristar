import mongoose from "mongoose";
import Lead, { LEAD_STAGES } from "@/models/Lead";
import SiteVisit from "@/models/SiteVisit";
import Project from "@/models/Project";
import Broker from "@/models/Broker";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok } from "@/lib/api";

export const GET = withAuth(async ({ session }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(startOfWeek.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 7);

  let Task: typeof mongoose.Model | null = null;
  try {
    Task = (await import("@/models/Task")).default;
  } catch {
    Task = null;
  }

  const [
    totalLeads,
    freshLeads,
    returningLeads,
    untouchedLeads,
    unassignedLeads,
    todayLeads,
    todayFresh,
    todayTasks,
    todayVisits,
    newLeadsLast7d,
    hotLeads,
    todayFollowUps,
    overdueFollowUps,
    visitsThisWeek,
    confirmedVisitsThisWeek,
    visitExpirations,
    bookedLeads,
    inactiveLeads,
    backlogLeads,
    activeProjects,
    activeBrokers,
    pipelineByStage,
    recentActivity,
    topProjects,
    callActivitiesToday,
    visitActivitiesToday,
    stageChangedToday,
    meetingActivitiesToday,
    whatsappActivitiesToday,
  ] = await Promise.all([
    Lead.countDocuments({ workspaceId }),
    Promise.resolve(0), // freshLeads filled below from total - returning
    Lead.countDocuments({
      workspaceId,
      $or: [{ tags: "returning" }, { "customFields.returning": true }],
    }),
    Lead.countDocuments({
      workspaceId,
      lastContactedAt: null,
      stage: { $in: ["new", "attempted_1", "attempted_2"] },
    }),
    Lead.countDocuments({ workspaceId, assignedTo: null }),
    Lead.countDocuments({ workspaceId, createdAt: { $gte: startOfDay, $lte: endOfDay } }),
    Lead.countDocuments({
      workspaceId,
      createdAt: { $gte: startOfDay, $lte: endOfDay },
      tags: { $ne: "returning" },
    }),
    Task
      ? Task.countDocuments({
          workspaceId,
          scheduleAt: { $gte: startOfDay, $lte: endOfDay },
        })
      : Lead.countDocuments({
          workspaceId,
          nextActionAt: { $gte: startOfDay, $lte: endOfDay },
        }),
    SiteVisit.countDocuments({
      workspaceId,
      scheduledAt: { $gte: startOfDay, $lte: endOfDay },
    }),
    Lead.countDocuments({ workspaceId, createdAt: { $gte: sevenDaysAgo } }),
    Lead.countDocuments({
      workspaceId,
      $or: [{ isHot: true }, { stage: "hot" }, { "score.value": { $gte: 75 } }],
    }),
    Lead.countDocuments({ workspaceId, nextActionAt: { $gte: startOfDay, $lte: endOfDay } }),
    Lead.countDocuments({
      workspaceId,
      nextActionAt: { $lt: startOfDay },
      isBooked: { $ne: true },
    }),
    SiteVisit.countDocuments({
      workspaceId,
      scheduledAt: { $gte: startOfWeek, $lte: endOfWeek },
    }),
    SiteVisit.countDocuments({
      workspaceId,
      scheduledAt: { $gte: startOfWeek, $lte: endOfWeek },
      status: { $in: ["confirmed", "done"] },
    }),
    SiteVisit.countDocuments({
      workspaceId,
      scheduledAt: { $lt: startOfDay },
      status: { $in: ["planned", "confirmed"] },
    }),
    Lead.countDocuments({ workspaceId, isBooked: true }),
    Lead.countDocuments({
      workspaceId,
      $or: [{ isInactive: true }, { lastContactedAt: { $lt: thirtyDaysAgo } }],
    }),
    Lead.countDocuments({
      workspaceId,
      stage: { $in: ["new", "attempted_1", "attempted_2", "warm"] },
      isBooked: { $ne: true },
      isInactive: { $ne: true },
    }),
    Project.countDocuments({ workspaceId, isActive: true, archived: { $ne: true } }),
    Broker.countDocuments({ workspaceId, status: "active" }),
    Lead.aggregate<{ _id: string; count: number }>([
      { $match: { workspaceId } },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]),
    LeadActivity.find({ workspaceId })
      .sort({ occurredAt: -1 })
      .limit(8)
      .populate({ path: "leadId", select: "contact leadNumber stage" })
      .lean(),
    Lead.aggregate<{ _id: mongoose.Types.ObjectId; count: number; name?: string; city?: string }>([
      { $match: { workspaceId, primaryProjectId: { $ne: null } } },
      { $group: { _id: "$primaryProjectId", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "projects",
          localField: "_id",
          foreignField: "_id",
          as: "project",
        },
      },
      { $unwind: { path: "$project", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          count: 1,
          name: "$project.name",
          city: "$project.location.city",
        },
      },
    ]),
    LeadActivity.countDocuments({
      workspaceId,
      occurredAt: { $gte: startOfDay, $lte: endOfDay },
      type: { $in: ["call_made", "call_missed", "ai_voice_call"] },
    }),
    LeadActivity.countDocuments({
      workspaceId,
      occurredAt: { $gte: startOfDay, $lte: endOfDay },
      type: { $in: ["site_visit_scheduled", "site_visit_completed"] },
    }),
    LeadActivity.countDocuments({
      workspaceId,
      occurredAt: { $gte: startOfDay, $lte: endOfDay },
      type: "stage_changed",
    }),
    LeadActivity.countDocuments({
      workspaceId,
      occurredAt: { $gte: startOfDay, $lte: endOfDay },
      type: "meeting_logged",
    }),
    LeadActivity.countDocuments({
      workspaceId,
      occurredAt: { $gte: startOfDay, $lte: endOfDay },
      type: { $in: ["whatsapp_sent", "whatsapp_received"] },
    }),
  ]);

  const returningCount = returningLeads;
  const freshCount = Math.max(totalLeads - returningCount, 0);
  void freshLeads;

  const pipelineMap: Record<string, number> = {};
  for (const stage of LEAD_STAGES) pipelineMap[stage] = 0;
  for (const p of pipelineByStage) pipelineMap[p._id] = p.count;

  return ok({
    kpis: {
      totalLeads,
      freshLeads: freshCount,
      returningLeads: returningCount,
      untouchedLeads,
      unassignedLeads,
      todayLeads,
      todayFresh,
      todayReturning: Math.max(todayLeads - todayFresh, 0),
      todayTasks,
      todayVisits,
      newLeadsLast7d,
      hotLeads,
      todayFollowUps,
      overdueFollowUps,
      visitsThisWeek,
      confirmedVisitsThisWeek,
      visitExpirations,
      activeProjects,
      activeBrokers,
      bookedLeads,
      inactiveLeads,
      backlogLeads,
    },
    todayActivity: {
      tasks: todayTasks,
      meetings: meetingActivitiesToday,
      siteVisitScheduled: todayVisits,
      offlineCalls: callActivitiesToday,
      callsToLead: callActivitiesToday,
      whatsapp: whatsappActivitiesToday,
      stageChanges: stageChangedToday,
      visitActivities: visitActivitiesToday,
      overdueFollowUps,
    },
    pipeline: pipelineMap,
    recentActivity,
    topProjects,
  });
});
