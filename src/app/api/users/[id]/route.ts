import mongoose from "mongoose";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { hashPassword, hasRole, type Role } from "@/lib/auth";

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!hasRole(session.role as Role, "admin")) {
    return bad("You need admin access to edit users.", 403);
  }
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  const body = (await req.json()) as Record<string, unknown>;

  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.phone === "string") update.phone = body.phone.trim();
  if (typeof body.title === "string") update.title = body.title.trim();
  if (typeof body.role === "string") update.role = body.role;
  if (typeof body.status === "string" && ["active", "invited", "suspended"].includes(body.status)) {
    update.status = body.status;
  }
  if (typeof body.password === "string" && body.password.length >= 8) {
    update.passwordHash = await hashPassword(body.password);
  }

  const updated = await User.findOneAndUpdate({ _id: id, workspaceId }, update, {
    new: true,
  }).select("-passwordHash");
  if (!updated) return bad("User not found.", 404);
  return ok({ user: updated });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!hasRole(session.role as Role, "admin")) {
    return bad("You need admin access to delete users.", 403);
  }
  if (params.id === session.userId) return bad("You can't delete your own account.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  /* Soft-delete: just suspend so historical data stays linked. */
  const updated = await User.findOneAndUpdate(
    { _id: id, workspaceId },
    { status: "suspended" },
    { new: true },
  ).select("-passwordHash");
  if (!updated) return bad("User not found.", 404);
  return ok({ user: updated });
});
