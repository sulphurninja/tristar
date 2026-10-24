import mongoose from "mongoose";
import Source from "@/models/Source";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole, type Role } from "@/lib/auth";

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!hasRole(session.role as Role, "admin")) return bad("You need admin access to edit sources.", 403);
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid source id.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  const body = (await req.json()) as Record<string, unknown>;

  const update: Record<string, unknown> = {};
  if (typeof body.label === "string") {
    if (!body.label.trim()) return bad("Label is required.");
    update.label = body.label.trim();
  }
  if (typeof body.description === "string") update.description = body.description;
  if (typeof body.color === "string") update.color = body.color;
  if (typeof body.isActive === "boolean") update.isActive = body.isActive;
  if (typeof body.sortOrder === "number") update.sortOrder = body.sortOrder;

  const updated = await Source.findOneAndUpdate(
    { _id: id, workspaceId },
    update,
    { new: true },
  );
  if (!updated) return bad("Source not found.", 404);
  return ok({ source: updated });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!hasRole(session.role as Role, "admin")) return bad("You need admin access to delete sources.", 403);
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid source id.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  await Source.findOneAndDelete({ _id: id, workspaceId });
  return ok({ ok: true });
});
