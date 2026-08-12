import mongoose from "mongoose";
import Task from "@/models/Task";
import { withAuth, ok, bad } from "@/lib/api";

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id.");
  const body = (await req.json()) as Record<string, unknown>;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const update: Record<string, unknown> = {};
  for (const key of ["title", "type", "status", "remark", "entityType"] as const) {
    if (body[key] !== undefined) update[key] = body[key];
  }
  if (body.scheduleAt !== undefined) {
    update.scheduleAt = body.scheduleAt ? new Date(body.scheduleAt as string) : null;
  }
  if (body.status === "completed") update.completedAt = new Date();
  if (body.assignedTo && mongoose.isValidObjectId(body.assignedTo as string)) {
    update.assignedTo = new mongoose.Types.ObjectId(body.assignedTo as string);
  }

  const task = await Task.findOneAndUpdate({ _id: params.id, workspaceId }, update, {
    new: true,
  }).lean();
  if (!task) return bad("Task not found.", 404);
  return ok({ task });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const res = await Task.deleteOne({ _id: params.id, workspaceId });
  if (!res.deletedCount) return bad("Task not found.", 404);
  return ok({ ok: true });
});
