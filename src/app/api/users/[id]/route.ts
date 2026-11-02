import mongoose from "mongoose";
import User from "@/models/User";
import Team from "@/models/Team";
import { ROLE_HIERARCHY } from "@/lib/roles";
import { withAuth, ok, bad } from "@/lib/api";
import { hashPassword } from "@/lib/auth";
import { outranks } from "@/lib/roles";
import { DATA_SCOPES, isPermission } from "@/lib/permissions";
import { normalizeUsername, usernameProblem, usernameTaken } from "@/lib/username";

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid user id.");
  const id = new mongoose.Types.ObjectId(params.id);
  const body = (await req.json()) as Record<string, unknown>;

  const target = await User.findOne({ _id: id, workspaceId }).select("role status");
  if (!target) return bad("User not found.", 404);
  if (target.role === "owner" && session.role !== "owner") {
    return bad("Only an owner can modify another owner.", 403);
  }
  if (outranks(target.role, session.role)) return bad("You can't edit someone with a higher role than yours.", 403);

  const update: Record<string, unknown> = {};
  if (typeof body.name === "string") update.name = body.name.trim();
  if (typeof body.phone === "string") update.phone = body.phone.trim();
  if (typeof body.title === "string") update.title = body.title.trim();
  if (typeof body.region === "string") update.region = body.region.trim();
  if ("username" in body) {
    const u = normalizeUsername(body.username);
    const problem = usernameProblem(u);
    if (problem) return bad(problem);
    if (await usernameTaken(u, params.id)) return bad("That username is already taken.", 409);
    update.username = u;
  }
  if (typeof body.onHoliday === "boolean") {
    update.onHoliday = body.onHoliday;
    if (!body.onHoliday) update.$unset = { ...((update.$unset as object) ?? {}), holidayUntil: 1 };
  }
  if (typeof body.holidayUntil === "string" && body.holidayUntil) {
    const d = new Date(body.holidayUntil);
    if (!Number.isNaN(d.getTime())) update.holidayUntil = d;
  }
  if (typeof body.role === "string") {
    if (!(body.role in ROLE_HIERARCHY)) return bad("Invalid role.");
    if (body.role === "owner" && session.role !== "owner") return bad("Only an owner can assign the owner role.", 403);
    if (params.id === session.userId && body.role !== target.role) return bad("You can't change your own role.");
    if (outranks(body.role, session.role)) return bad("You can't assign a role higher than your own.", 403);
    update.role = body.role;
  }

  /* Fine-grained access — Super Administrator only. */
  const touchesAccess = "permissionOverrides" in body || "dataScope" in body;
  if (touchesAccess && session.role !== "owner") {
    return bad("Only the Super Administrator can change individual permissions.", 403);
  }
  if ("permissionOverrides" in body) {
    const o = body.permissionOverrides as { allow?: unknown; deny?: unknown } | null;
    const clean = (v: unknown) => [...new Set(Array.isArray(v) ? v.filter(isPermission) : [])];
    const allow = clean(o?.allow);
    const deny = clean(o?.deny).filter((p) => !allow.includes(p));
    update.permissionOverrides = { allow, deny };
  }
  if ("dataScope" in body) {
    if (body.dataScope === null || body.dataScope === "") {
      update.$unset = { ...((update.$unset as object) ?? {}), dataScope: 1 };
    } else if (DATA_SCOPES.some((d) => d.value === body.dataScope)) {
      update.dataScope = body.dataScope;
    } else return bad("Invalid data scope.");
  }
  if (body.teamId === null || body.teamId === "") update.$unset = { ...((update.$unset as object) ?? {}), teamId: 1 };
  else if (typeof body.teamId === "string" && mongoose.isValidObjectId(body.teamId)) {
    if (!(await Team.exists({ _id: body.teamId, workspaceId }))) return bad("Team not found.");
    update.teamId = new mongoose.Types.ObjectId(body.teamId);
  }
  if (typeof body.status === "string" && ["active", "invited", "suspended"].includes(body.status)) {
    if (params.id === session.userId && body.status !== "active") return bad("You can't suspend your own account.");
    update.status = body.status;
    if (body.status === "suspended" && target.status !== "suspended") update.inactiveAt = new Date();
    if (body.status === "active") update.$unset = { ...((update.$unset as object) ?? {}), inactiveAt: 1, deletedAt: 1 };
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
  if (params.id === session.userId) return bad("You can't delete your own account.");
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid user id.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  const victim = await User.findOne({ _id: id, workspaceId }).select("role");
  if (victim?.role === "owner" && session.role !== "owner") return bad("Only an owner can delete an owner.", 403);
  if (victim && outranks(victim.role, session.role)) return bad("You can't delete someone with a higher role.", 403);
  /* Soft delete: their leads and history stay linked; restorable from Users → Deleted. */
  const now = new Date();
  const updated = await User.findOneAndUpdate(
    { _id: id, workspaceId },
    { $set: { status: "deleted", deletedAt: now, inactiveAt: now } },
    { new: true },
  ).select("-passwordHash");
  if (!updated) return bad("User not found.", 404);
  return ok({ user: updated });
});
