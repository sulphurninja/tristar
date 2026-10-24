import mongoose from "mongoose";
import Task from "@/models/Task";
import User from "@/models/User";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok, bad } from "@/lib/api";
import { mustSeeOwnOnly } from "@/lib/task-filters";
import { recordTaskCompleted } from "@/lib/task-actions";

const TYPES = ["call", "meeting", "site_visit", "follow_up", "whatsapp", "email", "other"];
const STATUSES = ["pending", "upcoming", "completed", "cancelled"];
const ENTITIES = ["lead", "contact", "broker", "other"];

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id.");
  const body = (await req.json()) as Record<string, unknown>;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  const task = await Task.findOne({ _id: params.id, workspaceId });
  if (!task) return bad("Task not found.", 404);
  if (mustSeeOwnOnly(session.role) && String(task.assignedTo) !== session.userId) {
    return bad("You can only change your own tasks.", 403);
  }

  const wasCompleted = task.status === "completed";

  if (typeof body.title === "string" && body.title.trim()) task.title = body.title.trim();
  if (typeof body.type === "string" && TYPES.includes(body.type)) task.type = body.type as typeof task.type;
  if (typeof body.entityType === "string" && ENTITIES.includes(body.entityType)) {
    task.entityType = body.entityType as typeof task.entityType;
  }
  if (typeof body.remark === "string") task.remark = body.remark.trim();
  if (typeof body.remindMe === "boolean") task.remindMe = body.remindMe;
  if (typeof body.reminderMinutes === "number") task.reminderMinutes = body.reminderMinutes;
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) return bad("Invalid status.");
    task.status = body.status as typeof task.status;
    if (body.status === "completed" && !wasCompleted) {
      task.completedAt = new Date();
      task.completedBy = userId;
    }
    if (body.status !== "completed") {
      task.completedAt = undefined;
      task.completedBy = undefined;
    }
  }
  if (body.scheduleAt !== undefined) {
    if (!body.scheduleAt) return bad("Schedule date is required.");
    const d = new Date(body.scheduleAt as string);
    if (Number.isNaN(d.getTime())) return bad("Invalid schedule date.");
    if (!task.scheduleAt || task.scheduleAt.getTime() !== d.getTime()) {
      task.scheduleAt = d;
      task.rescheduleCount = (task.rescheduleCount ?? 0) + 1;
    }
  }
  if (body.assignedTo !== undefined) {
    if (!mongoose.isValidObjectId(body.assignedTo as string)) return bad("Invalid assignee.");
    if (mustSeeOwnOnly(session.role)) return bad("You cannot reassign tasks.", 403);
    const u = await User.exists({ _id: body.assignedTo as string, workspaceId });
    if (!u) return bad("Assignee not found.", 404);
    task.assignedTo = new mongoose.Types.ObjectId(body.assignedTo as string);
    task.assignedBy = userId;
  }

  await task.save();

  if (task.status === "completed" && !wasCompleted) {
    await recordTaskCompleted(task, session.userId);
  } else if (typeof body.remark === "string" && body.remark.trim() && task.leadId) {
    await LeadActivity.create({
      workspaceId,
      leadId: task.leadId,
      actorId: userId,
      actorType: "user",
      type: "comment_added",
      description: `Task remark (${task.title}): ${body.remark.trim()}`,
      metadata: { taskId: String(task._id) },
      occurredAt: new Date(),
    });
  }
  return ok({ task });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const filter: Record<string, unknown> = { _id: params.id, workspaceId };
  if (mustSeeOwnOnly(session.role)) filter.assignedTo = new mongoose.Types.ObjectId(session.userId);
  const res = await Task.deleteOne(filter);
  if (!res.deletedCount) return bad("Task not found.", 404);
  return ok({ ok: true });
});
