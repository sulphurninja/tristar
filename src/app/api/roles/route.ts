import mongoose from "mongoose";
import Workspace from "@/models/Workspace";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { invalidateRoleTemplates, workspaceRoleTemplates } from "@/lib/access";
import { ROLE_HIERARCHY, type Role } from "@/lib/roles";
import {
  DATA_SCOPES,
  ROLE_DEFAULTS,
  isPermission,
  roleTemplate,
  type RoleTemplates,
} from "@/lib/permissions";

/** Effective template per role, which roles are customised, and head-counts. */
export const GET = withAuth(async ({ session }) => {
  const custom = await workspaceRoleTemplates(session.workspaceId);
  const counts = await User.aggregate<{ _id: string; n: number }>([
    { $match: { workspaceId: new mongoose.Types.ObjectId(session.workspaceId), status: { $ne: "suspended" } } },
    { $group: { _id: "$role", n: { $sum: 1 } } },
  ]);
  const byRole = new Map(counts.map((c) => [c._id, c.n]));
  const roles = (Object.keys(ROLE_HIERARCHY) as Role[]).map((role) => ({
    role,
    ...roleTemplate(role, custom),
    customised: role !== "owner" && !!custom?.[role],
    members: byRole.get(role) ?? 0,
  }));
  return ok({ roles });
});

/**
 * Replace (or reset) one role's template. Body: { role, permissions?, scope?, reset? }.
 * Super Administrator only (enforced by the route policy).
 */
export const PUT = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as {
    role?: string;
    permissions?: unknown;
    scope?: unknown;
    reset?: boolean;
  };
  const role = body.role as Role;
  if (!role || !(role in ROLE_DEFAULTS)) return bad("Unknown role.");
  if (role === "owner") return bad("The Super Administrator always has full access.");

  const ws = await Workspace.findById(session.workspaceId).select("rolePermissions");
  if (!ws) return bad("Workspace not found.", 404);
  const next: RoleTemplates = { ...((ws.get("rolePermissions") as RoleTemplates | undefined) ?? {}) };

  if (body.reset) {
    delete next[role];
  } else {
    const permissions = Array.isArray(body.permissions) ? [...new Set(body.permissions.filter(isPermission))] : undefined;
    const scope = DATA_SCOPES.find((d) => d.value === body.scope)?.value;
    if (!permissions && !scope) return bad("Nothing to update.");
    const current = roleTemplate(role, next);
    next[role] = { permissions: permissions ?? current.permissions, scope: scope ?? current.scope };
  }

  ws.set("rolePermissions", next);
  ws.markModified("rolePermissions");
  await ws.save();
  invalidateRoleTemplates(session.workspaceId);
  return ok({ role, ...roleTemplate(role, next), customised: !!next[role] });
});
