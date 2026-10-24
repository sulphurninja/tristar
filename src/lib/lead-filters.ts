import mongoose from "mongoose";
import Task from "@/models/Task";
import { resolveAgentScope, rangeBounds, RETURNING_FILTER } from "@/lib/scope";
import { loadStageCatalog, lostKeys } from "@/lib/lead-stages";

type Filter = Record<string, unknown>;

const oid = (v: string) => new mongoose.Types.ObjectId(v);
const oids = (csv: string) =>
  csv
    .split(",")
    .map((x) => x.trim())
    .filter((x) => mongoose.isValidObjectId(x))
    .map(oid);

export function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function dateRange(p: URLSearchParams, fromKey: string, toKey: string): Filter | null {
  const from = p.get(fromKey);
  const to = p.get(toKey);
  if (!from && !to) return null;
  const r: Record<string, Date> = {};
  if (from) {
    const d = new Date(from);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(0, 0, 0, 0);
      r.$gte = d;
    }
  }
  if (to) {
    const d = new Date(to);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      r.$lte = d;
    }
  }
  return Object.keys(r).length ? r : null;
}

/** Leads (by id) that have pending tasks that are overdue / still ahead. */
export async function taskLeadSets(workspaceId: mongoose.Types.ObjectId) {
  const now = new Date();
  const base = { workspaceId, leadId: { $ne: null }, status: { $in: ["pending", "upcoming"] } };
  const [overdue, future] = await Promise.all([
    Task.distinct("leadId", { ...base, scheduleAt: { $lt: now } }),
    Task.distinct("leadId", { ...base, scheduleAt: { $gte: now } }),
  ]);
  return { overdue: overdue as mongoose.Types.ObjectId[], future: future as mongoose.Types.ObjectId[] };
}

export type LeadSets = Awaited<ReturnType<typeof taskLeadSets>>;

/** Clause for "no future followups". */
export function noFutureFollowup(sets: LeadSets): Filter {
  return {
    $and: [
      { $or: [{ nextActionAt: null }, { nextActionAt: { $lt: new Date() } }] },
      { _id: { $nin: sets.future } },
    ],
  };
}

export function overdueClause(sets: LeadSets): Filter {
  return { $or: [{ nextActionAt: { $lt: new Date() } }, { _id: { $in: sets.overdue } }] };
}

export const VIEWS = [
  { value: "active", label: "Active Lead" },
  { value: "all", label: "All Leads" },
  { value: "returning", label: "Returning" },
  { value: "hot", label: "Hot Leads" },
  { value: "booked", label: "Booked" },
  { value: "lost", label: "Lost/Inactive" },
] as const;

export interface BuiltFilter {
  filter: Filter;
  /** View + team/agent scope only (used for the overview counts). */
  base: Filter;
  sets: LeadSets;
  lost: string[];
}

/**
 * Translate the query string used by the Leads list (and its insight cards)
 * into a Mongo filter.
 */
export async function buildLeadFilter(
  workspaceId: mongoose.Types.ObjectId,
  p: URLSearchParams,
  userId?: string,
): Promise<BuiltFilter> {
  const [catalog, sets] = await Promise.all([loadStageCatalog(workspaceId, userId), taskLeadSets(workspaceId)]);
  const lost = lostKeys(catalog);

  const baseAnd: Filter[] = [{ workspaceId }];

  /* Contacts (converted leads) live on their own page. */
  const isContact = p.get("isContact");
  if (isContact === "1" || isContact === "true") baseAnd.push({ isContact: true });
  else if (isContact !== "all") baseAnd.push({ isContact: { $ne: true } });

  const view = p.get("view") ?? "all";
  switch (view) {
    case "active":
      baseAnd.push({ isBooked: { $ne: true }, isInactive: { $ne: true }, stage: { $nin: ["booked", ...lost] } });
      break;
    case "returning":
      baseAnd.push(RETURNING_FILTER);
      break;
    case "hot":
      baseAnd.push({ $or: [{ isHot: true }, { stage: "hot" }] });
      break;
    case "booked":
      baseAnd.push({ $or: [{ isBooked: true }, { stage: "booked" }] });
      break;
    case "lost":
      baseAnd.push({ $or: [{ isInactive: true }, { stage: { $in: lost } }] });
      break;
    default:
      break;
  }

  /* Select Team / Select Sales Agent */
  const scope = await resolveAgentScope(workspaceId, p.get("team"), p.get("agent"));
  if (scope) baseAnd.push({ assignedTo: { $in: scope } });

  const and: Filter[] = [];

  const pipelineId = p.get("pipelineId");
  if (pipelineId && mongoose.isValidObjectId(pipelineId)) and.push({ pipelineId: oid(pipelineId) });
  const lead = p.get("leadId");
  if (lead && mongoose.isValidObjectId(lead)) and.push({ _id: oid(lead) });

  /* Insight cards */
  const card = p.get("card");
  const activeOnly = { isBooked: { $ne: true }, isInactive: { $ne: true }, stage: { $nin: ["booked", ...lost] } };
  if (card === "untouched") {
    and.push(activeOnly, { lastContactedAt: null });
  } else if (card === "nofollowup") {
    and.push(activeOnly, { lastContactedAt: { $ne: null } }, noFutureFollowup(sets));
  } else if (card === "returning") {
    and.push(RETURNING_FILTER);
  } else if (card === "returningnofollowup") {
    and.push(activeOnly, RETURNING_FILTER, noFutureFollowup(sets));
  } else if (card === "overdue") {
    and.push(activeOnly, overdueClause(sets));
  }

  /* Advanced filters */
  const stage = p.get("stage");
  if (stage && stage !== "all") and.push({ stage: { $in: stage.split(",").filter(Boolean) } });
  const priority = p.get("priority");
  if (priority && priority !== "all") and.push({ priority });
  const projectIds = oids(p.get("projectId") ?? "");
  if (projectIds.length)
    and.push({ $or: [{ primaryProjectId: { $in: projectIds } }, { interestedProjects: { $in: projectIds } }] });
  const sources = (p.get("source") ?? "").split(",").filter((s) => s && s !== "all");
  if (sources.length) and.push({ "source.primary": { $in: sources } });
  const category = (p.get("category") ?? "").split(",").filter(Boolean);
  if (category.length) and.push({ category: { $in: category } });
  const assigned = oids(p.get("assignedTo") ?? "");
  if (assigned.length) and.push({ assignedTo: { $in: assigned } });
  if (p.get("unassigned") === "1") and.push({ assignedTo: null });
  const pre = oids(p.get("preSalesAgent") ?? "");
  if (pre.length) and.push({ preSalesAgentId: { $in: pre } });
  const brokers = oids(p.get("brokerId") ?? "");
  if (brokers.length) and.push({ brokerId: { $in: brokers } });
  if (p.get("hasChannelPartner") === "1") and.push({ brokerId: { $ne: null } });
  const ftTeam = p.get("filterTeam");
  if (ftTeam && mongoose.isValidObjectId(ftTeam)) {
    const s = await resolveAgentScope(workspaceId, ftTeam, null);
    if (s) and.push({ assignedTo: { $in: s } });
  }
  const tags = (p.get("tags") ?? "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);
  if (tags.length) and.push({ tags: { $in: tags } });
  const ret = p.get("returning");
  if (ret === "1") and.push(RETURNING_FILTER);
  if (ret === "0") and.push({ isReturning: { $ne: true }, tags: { $ne: "returning" } });
  if (p.get("isHot") === "1" || p.get("isHot") === "true") and.push({ isHot: true });
  if (p.get("brokerFilter") === "1") and.push({ brokerId: { $ne: null } });

  for (const [from, to, field] of [
    ["createdFrom", "createdTo", "createdAt"],
    ["assignedFrom", "assignedUntil", "assignedAt"],
    ["lastActivityFrom", "lastActivityTo", "lastContactedAt"],
    ["followupFrom", "followupTo", "nextActionAt"],
  ] as const) {
    const r = dateRange(p, from, to);
    if (r) and.push({ [field]: r });
  }
  const createdRange = p.get("createdRange");
  if (createdRange) {
    const b = rangeBounds(createdRange, p.get("createdFrom"), p.get("createdTo"));
    if (b) and.push({ createdAt: { $gte: b[0], $lte: b[1] } });
  }

  const bMin = Number(p.get("budgetMin"));
  const bMax = Number(p.get("budgetMax"));
  if (p.get("budgetMin") && Number.isFinite(bMin)) {
    and.push({ $or: [{ "requirement.budgetMax": { $gte: bMin } }, { "preferences.maxBudget": { $gte: bMin } }] });
  }
  if (p.get("budgetMax") && Number.isFinite(bMax)) {
    and.push({ $or: [{ "requirement.budgetMin": { $lte: bMax } }, { "preferences.minBudget": { $lte: bMax } }] });
  }

  const q = p.get("q")?.trim();
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    const digits = q.replace(/[^0-9]/g, "");
    const or: Filter[] = [{ "contact.name": rx }, { "contact.email": rx }, { leadNumber: rx }, { tags: rx }];
    or.push({
      "contact.primaryPhone":
        digits.length >= 3
          ? { $regex: escapeRegex(digits.split("").join("\u0000")).replace(/\u0000/g, "[^0-9]*"), $options: "i" }
          : rx,
    });
    and.push({ $or: or });
  }

  return {
    filter: { $and: [...baseAnd, ...and] },
    base: { $and: baseAnd },
    sets,
    lost,
  };
}
