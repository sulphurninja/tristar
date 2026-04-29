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

  const [
    totalLeads,
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
  ] = await Promise.all([
    Lead.countDocuments({ workspaceId }),
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
    Lead.aggregate<{ _id: mongoose.Types.ObjectId; count: number; name?: string }>([
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
  ]);

  const pipelineMap: Record<string, number> = {};
  for (const stage of LEAD_STAGES) pipelineMap[stage] = 0;
  for (const p of pipelineByStage) pipelineMap[p._id] = p.count;

  return ok({
    kpis: {
      totalLeads,
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
    pipeline: pipelineMap,
    recentActivity,
    topProjects,
  });
});
