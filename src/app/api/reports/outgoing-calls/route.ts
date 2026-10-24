import mongoose from "mongoose";
import Task from "@/models/Task";
import Lead from "@/models/Lead";
import User from "@/models/User";
import { withAuth, ok } from "@/lib/api";
import { boundsFromSearchParams, scopeIds, scopeMatch } from "@/lib/report-utils";

/**
 * Outgoing Calls - every call-type task scheduled in the window, with the lead,
 * the agent and whether it was completed on time.
 */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const { start, end, range } = boundsFromSearchParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const scope = await scopeIds(url, workspaceId);
  const status = url.searchParams.get("status");

  const match: Record<string, unknown> = {
    workspaceId,
    ...scopeMatch(scope),
    type: "call",
    scheduleAt: { $gte: start, $lte: end },
  };
  if (status && ["pending", "upcoming", "completed", "cancelled"].includes(status)) match.status = status;

  const tasks = await Task.find(match).sort({ scheduleAt: -1 }).limit(2000).lean();
  const leadIds = tasks.map((t) => t.leadId).filter(Boolean) as mongoose.Types.ObjectId[];
  const userIds = tasks.map((t) => t.assignedTo).filter(Boolean) as mongoose.Types.ObjectId[];
  const [leads, users] = await Promise.all([
    Lead.find({ workspaceId, _id: { $in: leadIds } }).select("contact.name contact.primaryPhone leadNumber").lean(),
    User.find({ workspaceId, _id: { $in: userIds } }).select("name").lean(),
  ]);
  const leadMap = new Map(leads.map((l) => [String(l._id), l]));
  const userMap = new Map(users.map((u) => [String(u._id), u.name as string]));

  const rows = tasks.map((t) => {
    const lead = t.leadId ? leadMap.get(String(t.leadId)) : undefined;
    const late =
      t.status === "completed"
        ? !!t.scheduleAt && !!t.completedAt && t.completedAt.getTime() > t.scheduleAt.getTime() + 5 * 60 * 1000
        : !!t.scheduleAt && t.scheduleAt.getTime() < Date.now() && t.status !== "cancelled";
    return {
      id: String(t._id),
      title: t.title,
      leadId: t.leadId ? String(t.leadId) : null,
      leadNumber: lead?.leadNumber ?? "",
      leadName: lead?.contact?.name ?? "",
      phone: lead?.contact?.primaryPhone ?? "",
      agent: t.assignedTo ? (userMap.get(String(t.assignedTo)) ?? "Unknown") : "Unassigned",
      scheduleAt: t.scheduleAt ?? null,
      completedAt: t.completedAt ?? null,
      status: t.status,
      delayed: late,
      remark: t.remark ?? "",
    };
  });

  return ok({
    range,
    rows,
    summary: {
      total: rows.length,
      completed: rows.filter((r) => r.status === "completed").length,
      pending: rows.filter((r) => r.status === "pending" || r.status === "upcoming").length,
      delayed: rows.filter((r) => r.delayed).length,
    },
  });
});
