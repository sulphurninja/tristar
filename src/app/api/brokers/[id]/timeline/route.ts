import mongoose from "mongoose";
import Broker from "@/models/Broker";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import SiteVisit from "@/models/SiteVisit";
import Booking from "@/models/Booking";
import Task from "@/models/Task";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const brokerId = new mongoose.Types.ObjectId(params.id);

  const broker = await Broker.findOne({ _id: brokerId, workspaceId }).lean();
  if (!broker) return bad("Broker not found", 404);

  const leads = await Lead.find({ workspaceId, brokerId }).select("_id contact leadNumber").lean();
  const leadIds = leads.map((l) => l._id);
  const leadMap = new Map(leads.map((l) => [String(l._id), l]));

  const [activities, visits, bookings, tasks] = await Promise.all([
    leadIds.length
      ? LeadActivity.find({ workspaceId, leadId: { $in: leadIds } })
          .sort({ occurredAt: -1 })
          .limit(100)
          .lean()
      : Promise.resolve([]),
    leadIds.length
      ? SiteVisit.find({ workspaceId, leadId: { $in: leadIds } })
          .sort({ scheduledAt: -1 })
          .limit(50)
          .populate({ path: "projectId", select: "name" })
          .lean()
      : Promise.resolve([]),
    Booking.find({ workspaceId, brokerId }).sort({ bookedAt: -1 }).limit(50).lean(),
    Task.find({ workspaceId, brokerId }).sort({ scheduleAt: -1 }).limit(50).lean(),
  ]);

  const timeline = activities.map((a) => {
    const lead = leadMap.get(String(a.leadId));
    return {
      ...a,
      leadName: lead?.contact?.name,
      leadNumber: lead?.leadNumber,
    };
  });

  return ok({
    broker,
    timeline,
    calls: timeline.filter((a) => a.type.startsWith("call_")),
    followups: tasks.filter((t) => t.type === "follow_up" || t.type === "call"),
    meetings: tasks.filter((t) => t.type === "meeting"),
    visits,
    bookings,
    tasks,
    location: broker.location ?? null,
    projects: broker.activeProjects ?? [],
  });
});
