import mongoose from "mongoose";
import Lead from "@/models/Lead";
import SiteVisit from "@/models/SiteVisit";
import Task from "@/models/Task";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok } from "@/lib/api";
import { resolveAgentScope, rangeBounds, scopeParams, RETURNING_FILTER, NOT_RETURNING_FILTER } from "@/lib/scope";

/**
 * Dashboard counters. Each dashboard card group asks for one `section`
 * (leads | today | activity) with its own Team / Sales Agent filter.
 */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const section = url.searchParams.get("section") ?? "leads";
  const { team, agent } = scopeParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const scope = await resolveAgentScope(workspaceId, team, agent);
  const [start, end] = rangeBounds("today")!;

  const leadScope = scope ? { assignedTo: { $in: scope } } : {};
  const taskScope = scope ? { assignedTo: { $in: scope } } : {};
  const visitScope = scope ? { assignedTo: { $in: scope } } : {};
  const actScope = scope ? { actorId: { $in: scope } } : {};
  const base = { workspaceId, isContact: { $ne: true } };

  if (section === "leads") {
    const [total, returning, untouched, unassigned] = await Promise.all([
      Lead.countDocuments({ ...base, ...leadScope }),
      Lead.countDocuments({ ...base, ...leadScope, ...RETURNING_FILTER }),
      Lead.countDocuments({
        ...base,
        ...leadScope,
        lastContactedAt: null,
        stage: { $in: ["new", "attempted_1", "attempted_2"] },
      }),
      Lead.countDocuments({ ...base, assignedTo: null }),
    ]);
    return ok({ total, fresh: Math.max(total - returning, 0), returning, untouched, unassigned });
  }

  if (section === "today") {
    const created = { createdAt: { $gte: start, $lte: end } };
    const [leads, fresh, returning, tasks, siteVisits] = await Promise.all([
      Lead.countDocuments({ ...base, ...leadScope, ...created }),
      Lead.countDocuments({ ...base, ...leadScope, ...created, ...NOT_RETURNING_FILTER }),
      Lead.countDocuments({ ...base, ...leadScope, ...created, ...RETURNING_FILTER }),
      Task.countDocuments({ workspaceId, ...taskScope, scheduleAt: { $gte: start, $lte: end } }),
      SiteVisit.countDocuments({ workspaceId, ...visitScope, scheduledAt: { $gte: start, $lte: end } }),
    ]);
    return ok({ leads, fresh, returning, tasks, siteVisits });
  }

  /* activity */
  const day = { occurredAt: { $gte: start, $lte: end } };
  const callTypes = { type: { $in: ["call_made", "call_missed"] } };
  const contactIds = (
    await Lead.find({ workspaceId, isContact: true }).select("_id").limit(50000).lean()
  ).map((l) => l._id);

  const [
    tasks,
    meetingTasks,
    meetingActs,
    offlineCalls,
    ivrCalls,
    callsToLead,
    callsToContact,
    cpTaskCalls,
    scheduled,
    completed,
  ] = await Promise.all([
    Task.countDocuments({ workspaceId, ...taskScope, scheduleAt: { $gte: start, $lte: end } }),
    Task.countDocuments({ workspaceId, ...taskScope, type: "meeting", scheduleAt: { $gte: start, $lte: end } }),
    LeadActivity.countDocuments({ workspaceId, ...actScope, ...day, type: "meeting_logged" }),
    LeadActivity.countDocuments({ workspaceId, ...actScope, ...day, ...callTypes, channel: { $ne: "voip" } }),
    LeadActivity.countDocuments({ workspaceId, ...actScope, ...day, ...callTypes, channel: "voip" }),
    LeadActivity.countDocuments({ workspaceId, ...actScope, ...day, ...callTypes, leadId: { $nin: contactIds } }),
    LeadActivity.countDocuments({ workspaceId, ...actScope, ...day, ...callTypes, leadId: { $in: contactIds } }),
    Task.countDocuments({
      workspaceId,
      ...taskScope,
      brokerId: { $ne: null },
      type: "call",
      status: "completed",
      completedAt: { $gte: start, $lte: end },
    }),
    SiteVisit.countDocuments({
      workspaceId,
      ...visitScope,
      scheduledAt: { $gte: start, $lte: end },
      status: { $in: ["planned", "confirmed", "in_progress", "rescheduled"] },
    }),
    SiteVisit.countDocuments({
      workspaceId,
      ...visitScope,
      status: "done",
      $or: [
        { completedAt: { $gte: start, $lte: end } },
        { completedAt: null, scheduledAt: { $gte: start, $lte: end } },
      ],
    }),
  ]);

  return ok({
    tasks,
    meetings: meetingTasks + meetingActs,
    offlineCalls,
    ivrCalls,
    callsToLead,
    callsToContact,
    callsToChannelPartner: cpTaskCalls,
    siteVisitScheduled: scheduled,
    siteVisitCompleted: completed,
  });
});
