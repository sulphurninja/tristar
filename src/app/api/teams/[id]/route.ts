import mongoose from "mongoose";
import Team from "@/models/Team";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole, type Role } from "@/lib/auth";

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!hasRole(session.role as Role, "admin")) return bad("You need admin access to edit teams.", 403);
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid team id.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  const body = (await req.json()) as Record<string, unknown>;

  const update: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (typeof body.description === "string") update.description = body.description;
  if (body.leaderId === null || body.leaderId === "") update.leaderId = null;
  else if (typeof body.leaderId === "string" && mongoose.isValidObjectId(body.leaderId)) {
    update.leaderId = new mongoose.Types.ObjectId(body.leaderId);
  }

  const team = await Team.findOneAndUpdate({ _id: id, workspaceId }, update, { new: true });
  if (!team) return bad("Team not found.", 404);

  if (Array.isArray(body.memberIds)) {
    const ids = (body.memberIds as string[])
      .filter((x) => mongoose.isValidObjectId(x))
      .map((x) => new mongoose.Types.ObjectId(x));
    await User.updateMany({ workspaceId, teamId: id, _id: { $nin: ids } }, { $unset: { teamId: 1 } });
    await User.updateMany({ workspaceId, _id: { $in: ids } }, { teamId: id });
  }
  return ok({ team });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!hasRole(session.role as Role, "admin")) return bad("You need admin access to delete teams.", 403);
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid team id.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  await User.updateMany({ workspaceId, teamId: id }, { $unset: { teamId: 1 } });
  await Team.deleteOne({ _id: id, workspaceId });
  return ok({ ok: true });
});
