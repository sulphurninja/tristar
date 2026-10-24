import mongoose from "mongoose";
import Task from "@/models/Task";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { mustSeeOwnOnly } from "@/lib/task-filters";
import { recordTaskCompleted } from "@/lib/task-actions";

/** POST { action: "complete" | "reassign" | "cancel" | "delete", ids: string[], assignedTo? } */
export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as { action?: string; ids?: unknown; assignedTo?: string };
  const ids = (Array.isArray(body.ids) ? body.ids : [])
    .filter((i): i is string => typeof i === "string" && mongoose.isValidObjectId(i))
    .slice(0, 1000);
  if (!ids.length) return bad("Select at least one task.");

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);
  const filter: Record<string, unknown> = { _id: { $in: ids }, workspaceId };
  if (mustSeeOwnOnly(session.role)) filter.assignedTo = userId;

  if (body.action === "complete") {
    const open = await Task.find({ ...filter, status: { $ne: "completed" } });
    const now = new Date();
    for (const t of open) {
      t.status = "completed";
      t.completedAt = now;
      t.completedBy = userId;
      await t.save();
      await recordTaskCompleted(t, session.userId);
    }
    return ok({ ok: true, updated: open.length });
  }
  if (body.action === "cancel") {
    const r = await Task.updateMany(filter, { $set: { status: "cancelled" } });
    return ok({ ok: true, updated: r.modifiedCount });
  }
  if (body.action === "reassign") {
    if (mustSeeOwnOnly(session.role)) return bad("You cannot reassign tasks.", 403);
    if (!body.assignedTo || !mongoose.isValidObjectId(body.assignedTo)) return bad("Choose an agent.");
    const u = await User.exists({ _id: body.assignedTo, workspaceId });
    if (!u) return bad("Agent not found.", 404);
    const r = await Task.updateMany(filter, {
      $set: { assignedTo: new mongoose.Types.ObjectId(body.assignedTo), assignedBy: userId },
    });
    return ok({ ok: true, updated: r.modifiedCount });
  }
  if (body.action === "delete") {
    const r = await Task.deleteMany(filter);
    return ok({ ok: true, updated: r.deletedCount });
  }
  return bad("Unknown action.");
});
