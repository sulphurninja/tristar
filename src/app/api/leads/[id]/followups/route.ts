import mongoose from "mongoose";
import Lead from "@/models/Lead";
import Task from "@/models/Task";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { logActivity, oidOf } from "@/lib/lead-detail";

const TASK_TYPES = ["call", "meeting", "site_visit", "follow_up", "whatsapp", "email", "other"];

/** Keep Lead.nextActionAt = the earliest still-open task. */
async function syncNextAction(leadId: mongoose.Types.ObjectId, workspaceId: mongoose.Types.ObjectId) {
  const next = await Task.findOne({
    workspaceId,
    leadId,
    status: { $in: ["pending", "upcoming"] },
    scheduleAt: { $ne: null },
  })
    .sort({ scheduleAt: 1 })
    .select("scheduleAt type remark")
    .lean();
  if (next?.scheduleAt) {
    const t = next.type === "site_visit" || next.type === "meeting" || next.type === "whatsapp" || next.type === "email" ? next.type : "call";
    await Lead.updateOne(
      { _id: leadId },
      { $set: { nextActionAt: next.scheduleAt, nextActionType: t, nextActionNote: next.remark ?? undefined } },
    );
  } else {
    await Lead.updateOne({ _id: leadId }, { $unset: { nextActionAt: "", nextActionNote: "" } });
  }
}

export const GET = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const kind = new URL(req.url).searchParams.get("kind") ?? "followup"; // followup | meeting | all
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const filter: Record<string, unknown> = { workspaceId, leadId: new mongoose.Types.ObjectId(params.id) };
  if (kind === "meeting") filter.type = "meeting";
  else if (kind === "followup") filter.type = { $nin: ["meeting", "site_visit"] };
  const tasks = await Task.find(filter)
    .sort({ scheduleAt: -1 })
    .limit(200)
    .populate({ path: "assignedTo", select: "name" })
    .lean();
  return ok({ tasks });
});

export const POST = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Record<string, unknown>;
  const title = typeof body.title === "string" ? body.title.trim().slice(0, 200) : "";
  if (!title) return bad("Title is required.");
  const when = body.scheduleAt ? new Date(body.scheduleAt as string) : null;
  if (!when || Number.isNaN(when.getTime())) return bad("Date and time are required.");

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const lead = await Lead.findOne({ _id: params.id, workspaceId }).select("_id workspaceId assignedTo").lean();
  if (!lead) return bad("Lead not found", 404);

  const type = TASK_TYPES.includes(body.type as string) ? (body.type as string) : "follow_up";
  const assigneeId = oidOf(body.assignedTo) ?? lead.assignedTo ?? new mongoose.Types.ObjectId(session.userId);
  if (!(await User.exists({ _id: assigneeId, workspaceId }))) return bad("Assignee not found.");

  const task = await Task.create({
    workspaceId,
    leadId: lead._id,
    title,
    type,
    status: when.getTime() > Date.now() ? "upcoming" : "pending",
    scheduleAt: when,
    remindMe: body.remindMe !== false,
    remark: typeof body.remark === "string" ? body.remark.slice(0, 2000) : undefined,
    entityType: "lead",
    assignedTo: assigneeId,
    assignedBy: new mongoose.Types.ObjectId(session.userId),
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });

  await syncNextAction(lead._id, workspaceId);
  await logActivity(session, lead, {
    type: type === "meeting" ? "meeting_logged" : "followup_set",
    description: `${type === "meeting" ? "Meeting" : "Follow-up"} scheduled: ${title} (${when.toLocaleString("en-IN")}).`,
    metadata: { taskId: String(task._id) },
  });
  return ok({ task }, { status: 201 });
});

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as { taskId?: string; status?: string };
  const taskId = oidOf(body.taskId);
  if (!taskId) return bad("taskId is required.");
  if (!["pending", "upcoming", "completed", "cancelled"].includes(body.status ?? "")) return bad("Invalid status.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const leadId = new mongoose.Types.ObjectId(params.id);
  const task = await Task.findOneAndUpdate(
    { _id: taskId, workspaceId, leadId },
    { $set: { status: body.status, completedAt: body.status === "completed" ? new Date() : undefined } },
    { new: true },
  ).lean();
  if (!task) return bad("Task not found.", 404);
  await syncNextAction(leadId, workspaceId);
  if (body.status === "completed") {
    await logActivity(session, { _id: leadId, workspaceId }, { type: "other", description: `Task completed: ${task.title}.` });
  }
  return ok({ task });
});
