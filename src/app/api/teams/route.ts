import mongoose from "mongoose";
import Team from "@/models/Team";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole, type Role } from "@/lib/auth";

export const GET = withAuth(async ({ session }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const [teams, counts] = await Promise.all([
    Team.find({ workspaceId }).sort({ name: 1 }).lean(),
    User.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
      { $match: { workspaceId, teamId: { $ne: null } } },
      { $group: { _id: "$teamId", count: { $sum: 1 } } },
    ]),
  ]);
  const byTeam = new Map(counts.map((c) => [String(c._id), c.count]));
  return ok({
    teams: teams.map((t) => ({ ...t, memberCount: byTeam.get(String(t._id)) ?? 0 })),
  });
});

export const POST = withAuth(async ({ req, session }) => {
  if (!hasRole(session.role as Role, "admin")) return bad("You need admin access to create teams.", 403);
  const body = (await req.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) return bad("Team name is required.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  if (await Team.exists({ workspaceId, name })) return bad("A team with this name already exists.", 409);

  const team = await Team.create({
    workspaceId,
    name,
    description: typeof body.description === "string" ? body.description : undefined,
    leaderId:
      typeof body.leaderId === "string" && mongoose.isValidObjectId(body.leaderId)
        ? new mongoose.Types.ObjectId(body.leaderId)
        : undefined,
  });

  if (Array.isArray(body.memberIds)) {
    const ids = (body.memberIds as string[])
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));
    await User.updateMany({ workspaceId, _id: { $in: ids } }, { teamId: team._id });
  }
  return ok({ team }, { status: 201 });
});
