import mongoose from "mongoose";
import Lead from "@/models/Lead";
import Broker from "@/models/Broker";
import { rangeBounds, resolveAgentScope, scopeParams } from "@/lib/scope";
import { hasRole, type Role } from "@/lib/roles";

type Oid = mongoose.Types.ObjectId;
type Filter = Record<string, unknown>;

export function oid(v?: string | null): Oid | null {
  return v && mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : null;
}

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function endOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Roles below "supervisor" only ever see their own work. */
export function mustSeeOwnOnly(role: string) {
  return !hasRole(role as Role, "supervisor");
}

/**
 * Lead ids matching lead-level filters shared by tasks and site visits
 * (search, pre sales agent, project, lead source, entity type, channel partner).
 * Returns null when no lead-level filter is active.
 */
export async function leadIdsFor(
  workspaceId: Oid,
  sp: URLSearchParams,
  opts: { search?: boolean; entity?: boolean } = {},
): Promise<Oid[] | null> {
  const lf: Filter = { workspaceId };
  let active = false;

  const preSales = oid(sp.get("preSales"));
  if (preSales) {
    lf.assignedTo = preSales;
    active = true;
  }
  const project = oid(sp.get("projectId"));
  if (project) {
    lf.$or = [{ primaryProjectId: project }, { interestedProjects: project }];
    active = true;
  }
  const source = sp.get("source");
  if (source && source !== "all") {
    lf["source.primary"] = source;
    active = true;
  }
  const cp = oid(sp.get("brokerId"));
  if (cp) {
    lf.brokerId = cp;
    active = true;
  }
  const sm = oid(sp.get("sourcingManager"));
  if (sm) {
    const ids = await Broker.find({ workspaceId, rmId: sm }).select("_id").lean();
    lf.brokerId = lf.brokerId ?? { $in: ids.map((b) => b._id) };
    if (cp && !ids.some((b) => String(b._id) === String(cp))) lf.brokerId = { $in: [] };
    active = true;
  }
  if (opts.entity) {
    const e = sp.get("entityType");
    if (e === "contact") {
      lf.isContact = true;
      active = true;
    } else if (e === "lead") {
      lf.isContact = { $ne: true };
      active = true;
    }
  }
  if (opts.search) {
    const q = sp.get("q")?.trim();
    if (q) {
      const rx = { $regex: escapeRegex(q), $options: "i" };
      lf.$and = [
        {
          $or: [{ "contact.name": rx }, { "contact.primaryPhone": rx }, { leadNumber: rx }],
        },
      ];
      active = true;
    }
  }
  if (!active) return null;
  const rows = await Lead.find(lf).select("_id").limit(20000).lean();
  return rows.map((r) => r._id as Oid);
}

/** Assignee restriction from team / agent / assignedTo params (+ role limits). */
export async function assigneeFilter(
  workspaceId: Oid,
  url: URL,
  session: { userId: string; role: string },
): Promise<Filter> {
  if (mustSeeOwnOnly(session.role)) return { assignedTo: new mongoose.Types.ObjectId(session.userId) };
  const assignedTo = oid(url.searchParams.get("assignedTo"));
  if (assignedTo) return { assignedTo };
  const { team, agent } = scopeParams(url);
  const scope = await resolveAgentScope(workspaceId, team, agent);
  return scope ? { assignedTo: { $in: scope } } : {};
}

export interface TaskFilterResult {
  filter: Filter;
  scopeOnly: Filter;
}

/** Build the Task collection filter from request params. */
export async function buildTaskFilter(
  workspaceId: Oid,
  url: URL,
  session: { userId: string; role: string },
): Promise<TaskFilterResult> {
  const sp = url.searchParams;
  const scopeOnly: Filter = { workspaceId, ...(await assigneeFilter(workspaceId, url, session)) };
  const filter: Filter = { ...scopeOnly };

  const and: Filter[] = [];

  const status = sp.get("status") ?? "";
  if (status === "pending") filter.status = { $in: ["pending", "upcoming"] };
  else if (status === "overdue") {
    filter.status = { $in: ["pending", "upcoming"] };
    and.push({ scheduleAt: { $lt: new Date() } });
  } else if (status && status !== "all") filter.status = status;

  const type = sp.get("activityType") || sp.get("type") || "";
  if (type && type !== "all") filter.type = type.includes(",") ? { $in: type.split(",") } : type;

  const entity = sp.get("entityType") ?? "";
  if (entity && entity !== "all") filter.entityType = entity;

  const lead = oid(sp.get("leadId"));
  if (lead) filter.leadId = lead;
  const broker = oid(sp.get("brokerId"));
  if (broker) filter.brokerId = broker;
  const by = oid(sp.get("assignedBy"));
  if (by) filter.assignedBy = by;

  const range = sp.get("range") ?? "";
  const bounds = rangeBounds(range, sp.get("from"), sp.get("to"));
  if (bounds) filter.scheduleAt = { $gte: bounds[0], $lte: bounds[1] };
  else if (range === "upcoming") {
    filter.scheduleAt = { $gt: endOfToday() };
    if (!filter.status) filter.status = { $in: ["pending", "upcoming"] };
  }

  // lead-level filters (the brokerId param belongs to the task itself here)
  const leadSp = new URLSearchParams(sp);
  leadSp.delete("brokerId");
  const leadIds = await leadIdsFor(workspaceId, leadSp, { search: true });
  if (leadIds) {
    const q = sp.get("q")?.trim();
    const hasOtherLeadFilter = ["preSales", "projectId", "source"].some((k) => sp.get(k));
    if (q && !hasOtherLeadFilter) {
      const rx = { $regex: escapeRegex(q), $options: "i" };
      and.push({ $or: [{ leadId: { $in: leadIds } }, { title: rx }, { remark: rx }] });
    } else {
      and.push({ leadId: { $in: leadIds } });
    }
  }
  if (and.length) filter.$and = and;
  return { filter, scopeOnly };
}
