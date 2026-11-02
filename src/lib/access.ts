/**
 * Server-side access control: resolves the signed-in user's live role,
 * permissions and data scope from the database on every request, and exposes
 * them to deep helpers (lead filters, report scoping) via AsyncLocalStorage.
 *
 * The JWT only proves identity. Role, status and permissions are always read
 * fresh, so changes made by an admin take effect on the user's next request.
 */
import { AsyncLocalStorage } from "node:async_hooks";
import mongoose from "mongoose";
import User from "@/models/User";
import Team from "@/models/Team";
import Workspace from "@/models/Workspace";
import type { JwtPayload } from "@/lib/auth";
import type { Role } from "@/lib/roles";
import {
  effectiveAccess,
  type DataScope,
  type Permission,
  type PermissionOverrides,
  type RoleTemplates,
} from "@/lib/permissions";

export interface AuthSession extends JwtPayload {
  permissions: Permission[];
  dataScope: DataScope;
  teamId?: string;
  /** Memoised user ids visible under `dataScope` (null = everyone). */
  _visible?: Promise<mongoose.Types.ObjectId[] | null>;
}

/* Role templates change rarely; cache per workspace for a few seconds. */
const TEMPLATE_TTL = 15_000;
const templateCache = new Map<string, { at: number; value: RoleTemplates | null }>();

export async function workspaceRoleTemplates(workspaceId: string): Promise<RoleTemplates | null> {
  const hit = templateCache.get(workspaceId);
  if (hit && Date.now() - hit.at < TEMPLATE_TTL) return hit.value;
  const ws = await Workspace.findById(workspaceId).select("rolePermissions").lean();
  const value = ((ws as { rolePermissions?: RoleTemplates } | null)?.rolePermissions ?? null) as RoleTemplates | null;
  templateCache.set(workspaceId, { at: Date.now(), value });
  return value;
}

export function invalidateRoleTemplates(workspaceId: string) {
  templateCache.delete(workspaceId);
}

/** Load the live access profile for a token. Null when the user is gone, suspended or deleted. */
export async function loadAccess(jwt: JwtPayload): Promise<AuthSession | null> {
  if (!mongoose.isValidObjectId(jwt.userId)) return null;
  const [user, templates] = await Promise.all([
    User.findOne({ _id: jwt.userId, workspaceId: jwt.workspaceId })
      .select("role status teamId email permissionOverrides dataScope")
      .lean(),
    workspaceRoleTemplates(jwt.workspaceId),
  ]);
  if (!user || user.status === "suspended" || user.status === "deleted") return null;
  const role = user.role as Role;
  const access = effectiveAccess(
    role,
    user.permissionOverrides as PermissionOverrides | undefined,
    (user.dataScope as DataScope | undefined) ?? null,
    templates,
  );
  return {
    userId: String(user._id),
    workspaceId: jwt.workspaceId,
    email: user.email,
    role,
    permissions: access.permissions,
    dataScope: access.scope,
    teamId: user.teamId ? String(user.teamId) : undefined,
  };
}

export function can(session: Pick<AuthSession, "role" | "permissions">, perm: Permission) {
  return session.role === "owner" || session.permissions.includes(perm);
}

/* ───────── request context ───────── */

const store = new AsyncLocalStorage<AuthSession>();

export function runWithSession<T>(session: AuthSession, fn: () => T): T {
  return store.run(session, fn);
}

export function currentSession(): AuthSession | undefined {
  return store.getStore();
}

/**
 * User ids whose records `session` may see, or null for "everything".
 *  - own  → just the user
 *  - team → members of the user's team + members of any team they lead
 */
export function visibleUserIds(session: AuthSession): Promise<mongoose.Types.ObjectId[] | null> {
  if (session.role === "owner" || session.dataScope === "all") return Promise.resolve(null);
  session._visible ??= (async () => {
    const me = new mongoose.Types.ObjectId(session.userId);
    if (session.dataScope === "own") return [me];
    const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
    const led = await Team.find({ workspaceId, leaderId: me }).select("_id").lean();
    const teamIds = [...led.map((t) => t._id)];
    if (session.teamId) teamIds.push(new mongoose.Types.ObjectId(session.teamId));
    if (!teamIds.length) return [me];
    const members = await User.find({ workspaceId, teamId: { $in: teamIds } }).select("_id").lean();
    const ids = new Map(members.map((m) => [String(m._id), m._id]));
    ids.set(String(me), me);
    return [...ids.values()];
  })();
  return session._visible;
}

/** Visible user ids for the request in progress (null = unrestricted or no session). */
export async function currentVisibleUserIds() {
  const s = currentSession();
  return s ? visibleUserIds(s) : null;
}

/** Narrow a requested user filter (null = all) to what the current user may see. */
export async function clampToVisible(
  requested: mongoose.Types.ObjectId[] | null,
): Promise<mongoose.Types.ObjectId[] | null> {
  const visible = await currentVisibleUserIds();
  if (!visible) return requested;
  if (!requested) return visible;
  const allowed = new Set(visible.map(String));
  return requested.filter((id) => allowed.has(String(id)));
}

/** True when the current user may see a record assigned to `assignee`. */
export async function canSeeAssignee(assignee: unknown, extra: unknown[] = []): Promise<boolean> {
  const visible = await currentVisibleUserIds();
  if (!visible) return true;
  const allowed = new Set(visible.map(String));
  return [assignee, ...extra].some((v) => v != null && allowed.has(String(v)));
}

/* ───────── single-record guards ───────── */

const RECORD_GUARDS: Array<{ pattern: RegExp; check: (id: string, s: AuthSession) => Promise<boolean> }> = [
  {
    pattern: /^\/api\/(?:leads|contacts)\/([a-f0-9]{24})(?:\/|$)/i,
    check: async (id, s) => {
      const { default: Lead } = await import("@/models/Lead");
      const lead = await Lead.findOne({ _id: id, workspaceId: s.workspaceId })
        .select("assignedTo preSalesAgentId sourcingManagerId coOwners createdBy")
        .lean();
      if (!lead) return true; // let the handler answer 404
      return canSeeAssignee(lead.assignedTo, [
        lead.preSalesAgentId,
        lead.sourcingManagerId,
        lead.createdBy,
        ...((lead.coOwners as unknown[]) ?? []),
      ]);
    },
  },
  {
    pattern: /^\/api\/bookings\/([a-f0-9]{24})(?:\/|$)/i,
    check: async (id, s) => {
      const { default: Booking } = await import("@/models/Booking");
      const b = await Booking.findOne({ _id: id, workspaceId: s.workspaceId })
        .select("salesAgentId preSalesAgentId sourcingManagerId createdBy")
        .lean();
      if (!b) return true;
      return canSeeAssignee(b.salesAgentId, [b.preSalesAgentId, b.sourcingManagerId, b.createdBy]);
    },
  },
];

/** False when the URL addresses a single record outside the user's data scope. */
export async function recordVisible(pathname: string, session: AuthSession): Promise<boolean> {
  if (session.role === "owner" || session.dataScope === "all") return true;
  for (const g of RECORD_GUARDS) {
    const m = g.pattern.exec(pathname);
    if (m) return runWithSession(session, () => g.check(m[1], session));
  }
  return true;
}
