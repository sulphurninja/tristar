import mongoose from "mongoose";
import SiteVisit from "@/models/SiteVisit";
import Lead from "@/models/Lead";
import { rangeBounds } from "@/lib/scope";
import { assigneeFilter, endOfToday, leadIdsFor, oid } from "@/lib/task-filters";

type Oid = mongoose.Types.ObjectId;
type Filter = Record<string, unknown>;

export const OPEN_VISIT = ["planned", "confirmed", "rescheduled", "in_progress"];

/** visitId -> 1-based ordinal of the visit for its lead (cancelled visits are not counted). */
export async function visitOrdinals(workspaceId: Oid, leadIds?: Oid[]) {
  const f: Filter = { workspaceId, status: { $ne: "cancelled" } };
  if (leadIds) f.leadId = { $in: leadIds };
  const rows = await SiteVisit.find(f).select("leadId scheduledAt").sort({ scheduledAt: 1, _id: 1 }).lean();
  const seen = new Map<string, number>();
  const out = new Map<string, number>();
  for (const r of rows) {
    const k = String(r.leadId);
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    out.set(String(r._id), n);
  }
  return out;
}

export interface VisitFilterResult {
  filter: Filter;
  scopeOnly: Filter;
}

export async function buildVisitFilter(
  workspaceId: Oid,
  url: URL,
  session: { userId: string; role: string },
): Promise<VisitFilterResult> {
  const sp = url.searchParams;
  const scopeOnly: Filter = { workspaceId, ...(await assigneeFilter(workspaceId, url, session)) };
  const filter: Filter = { ...scopeOnly };
  const and: Filter[] = [];

  const project = oid(sp.get("projectId"));
  if (project) filter.projectId = project;
  const lead = oid(sp.get("leadId"));
  if (lead) filter.leadId = lead;
  const by = oid(sp.get("assignedBy"));
  if (by) filter.assignedBy = by;

  const status = sp.get("status") ?? "";
  if (status === "pending") filter.status = { $in: OPEN_VISIT };
  else if (status === "completed") filter.status = "done";
  else if (status && status !== "all") filter.status = status.includes(",") ? { $in: status.split(",") } : status;

  const vs = sp.get("visitStatus") ?? "";
  if (vs && vs !== "all") filter.status = vs === "scheduled" ? { $in: ["planned", "rescheduled"] } : vs;

  const vt = sp.get("visitType") ?? "";
  if (vt && vt !== "all") filter.visitType = vt;
  const mode = sp.get("mode") ?? "";
  if (mode && mode !== "all") filter.mode = mode;

  const cp = sp.get("cpPresent") ?? "";
  if (cp === "yes") filter.cpPresent = true;
  else if (cp === "no") filter.cpPresent = { $ne: true };

  const range = sp.get("range") ?? "upcoming";
  const bounds = rangeBounds(range, sp.get("from"), sp.get("to"));
  const now = new Date();
  if (bounds) filter.scheduledAt = { $gte: bounds[0], $lte: bounds[1] };
  else if (range === "upcoming") filter.scheduledAt = { $gte: now };
  else if (range === "later") filter.scheduledAt = { $gt: endOfToday() };
  else if (range === "past") filter.scheduledAt = { $lt: now };

  // channel partner: matched on the visit's CP or the lead's CP
  const broker = oid(sp.get("brokerId"));
  const leadSp = new URLSearchParams(sp);
  leadSp.delete("brokerId");
  const leadIds = await leadIdsFor(workspaceId, leadSp, { search: true, entity: true });
  if (leadIds) and.push({ leadId: { $in: leadIds } });
  if (broker) {
    const viaLead = await Lead.find({ workspaceId, brokerId: broker }).select("_id").lean();
    and.push({ $or: [{ brokerId: broker }, { leadId: { $in: viaLead.map((l) => l._id) } }] });
  }

  const freq = sp.get("frequency") ?? "";
  if (freq) {
    const ord = await visitOrdinals(workspaceId);
    const want = freq === "4+" ? (n: number) => n >= 4 : (n: number) => n === Number(freq);
    const ids = [...ord.entries()].filter(([, n]) => want(n)).map(([id]) => new mongoose.Types.ObjectId(id));
    and.push({ _id: { $in: ids } });
  }

  if (and.length) filter.$and = and;
  return { filter, scopeOnly };
}

export function todayBounds(): [Date, Date] {
  const s = new Date();
  s.setHours(0, 0, 0, 0);
  return [s, endOfToday()];
}
