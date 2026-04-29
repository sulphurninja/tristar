import mongoose from "mongoose";
import Lead from "@/models/Lead";
import SiteVisit from "@/models/SiteVisit";
import { withAuth, ok } from "@/lib/api";

export const GET = withAuth(async ({ session }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);
  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() - 30);

  const [
    myLeads,
    myHotLeads,
    myTodayFollowUps,
    myInactiveLeads,
    myBookedLeads,
    myUpcomingVisits,
  ] = await Promise.all([
    Lead.countDocuments({ workspaceId, assignedTo: userId }),
    Lead.countDocuments({
      workspaceId,
      assignedTo: userId,
      $or: [{ isHot: true }, { stage: "hot" }, { "score.value": { $gte: 75 } }],
    }),
    Lead.countDocuments({
      workspaceId,
      assignedTo: userId,
      nextActionAt: { $gte: startOfDay, $lte: endOfDay },
    }),
    Lead.countDocuments({
      workspaceId,
      assignedTo: userId,
      isBooked: { $ne: true },
      $or: [{ isInactive: true }, { lastContactedAt: { $lt: cutoff } }],
    }),
    Lead.countDocuments({ workspaceId, assignedTo: userId, isBooked: true }),
    SiteVisit.countDocuments({
      workspaceId,
      assignedTo: userId,
      scheduledAt: { $gte: now },
      status: { $in: ["planned", "confirmed"] },
    }),
  ]);

  return ok({
    summary: {
      myLeads,
      myHotLeads,
      myTodayFollowUps,
      myInactiveLeads,
      myBookedLeads,
      myUpcomingVisits,
    },
  });
});
