import mongoose from "mongoose";
import User from "@/models/User";
import Team from "@/models/Team";
import { ROLE_HIERARCHY } from "@/lib/roles";
import { withAuth, ok, bad } from "@/lib/api";
import { hashPassword, hasRole, type Role } from "@/lib/auth";

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!hasRole(session.role as Role, "admin")) {
    return bad("You need admin access to edit users.", 403);
  }
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid user id.");
  const id = new mongoose.Types.ObjectId(params.id);
  const body = (await req.json()) as Record<string, unknown>;

  const target = await User.findOne({ _id: id, workspaceId }).select("role");
  if (!target) return bad("User not found.", 404);
  if (target.role === "owner" && session.role !== "owner") {
    return bad("Only an owner can modify another owner.", 403);
  }

  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.phone === "string") update.phone = body.phone.trim();
  if (typeof body.title === "string") update.title = body.title.trim();
  if (typeof body.role === "string") {
    if (!(body.role in ROLE_HIERARCHY)) return bad("Invalid role.");
    if (body.role === "owner" && session.role !== "owner") return bad("Only an owner can assign the owner role.", 403);
    if (params.id === session.userId && body.role !== target.role) return bad("You can't change your own role.");
    update.role = body.role;
  }
  if (body.teamId === null || body.teamId === "") update.$unset = { teamId: 1 };
  else if (typeof body.teamId === "string" && mongoose.isValidObjectId(body.teamId)) {
    if (!(await Team.exists({ _id: body.teamId, workspaceId }))) return bad("Team not found.");
    update.teamId = new mongoose.Types.ObjectId(body.teamId);
  }
  if (typeof body.status === "string" && ["active", "invited", "suspended"].includes(body.status)) {
    if (params.id === session.userId && body.status !== "active") return bad("You can't suspend your own account.");
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
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid user id.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  const victim = await User.findOne({ _id: id, workspaceId }).select("role");
  if (victim?.role === "owner" && session.role !== "owner") return bad("Only an owner can suspend an owner.", 403);
  /* Soft-delete: just suspend so historical data stays linked. */
  const updated = await User.findOneAndUpdate(
    { _id: id, workspaceId },
    { status: "suspended" },
    { new: true },
  ).select("-passwordHash");
  if (!updated) return bad("User not found.", 404);
  return ok({ user: updated });
});
