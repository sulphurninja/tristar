import mongoose from "mongoose";
import SiteVisit from "@/models/SiteVisit";
import Lead from "@/models/Lead";
import Project from "@/models/Project";
import Broker from "@/models/Broker";
import User from "@/models/User";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok, bad } from "@/lib/api";
import { endOfToday, mustSeeOwnOnly, oid } from "@/lib/task-filters";
import { buildVisitFilter, OPEN_VISIT, visitOrdinals, todayBounds } from "@/lib/visit-filters";

const MODES = ["in_person", "virtual", "phygital"];
const VISIT_TYPES = ["site_visit", "revisit", "final_visit", "virtual"];

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const limit = Math.min(Math.max(parseInt(sp.get("limit") ?? "50", 10) || 50, 1), 5000);
  const page = Math.max(parseInt(sp.get("page") ?? "0", 10) || 0, 0);
  const skip = page > 0 ? (page - 1) * limit : Math.max(parseInt(sp.get("skip") ?? "0", 10) || 0, 0);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const { filter, scopeOnly } = await buildVisitFilter(workspaceId, url, session);

  const range = sp.get("range") ?? "upcoming";
  const sortKey = sp.get("sort") ?? "";
  const dir = sp.get("dir") === "desc" ? -1 : sp.get("dir") === "asc" ? 1 : range === "past" ? -1 : 1;
  const sort: Record<string, 1 | -1> =
    sortKey === "created" ? { createdAt: dir, _id: dir } : { scheduledAt: dir, _id: dir };

  const [tdS, tdE] = todayBounds();
  const eod = endOfToday();

  const [visits, total, today, upcoming, pending, completed] = await Promise.all([
    SiteVisit.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: "leadId",
        select: "contact stage leadNumber isContact brokerId assignedTo",
        populate: [
          { path: "brokerId", select: "name firmName" },
          { path: "assignedTo", select: "name" },
        ],
      })
      .populate({ path: "projectId", select: "name code location" })
      .populate({ path: "assignedTo", select: "name email" })
      .populate({ path: "assignedBy", select: "name" })
      .populate({ path: "brokerId", select: "name firmName" })
      .lean(),
    SiteVisit.countDocuments(filter),
    SiteVisit.countDocuments({ ...scopeOnly, scheduledAt: { $gte: tdS, $lte: tdE } }),
    SiteVisit.countDocuments({ ...scopeOnly, scheduledAt: { $gt: eod }, status: { $in: OPEN_VISIT } }),
    SiteVisit.countDocuments({ ...scopeOnly, status: { $in: OPEN_VISIT } }),
    SiteVisit.countDocuments({ ...scopeOnly, status: "done" }),
  ]);

  const leadIds = [
    ...new Set(
      visits.map((v) => String((v.leadId as { _id?: unknown } | null)?._id ?? "")).filter(Boolean),
    ),
  ].map((i) => new mongoose.Types.ObjectId(i));
  const ord = leadIds.length ? await visitOrdinals(workspaceId, leadIds) : new Map<string, number>();
  const withFreq = visits.map((v) => ({ ...v, frequency: ord.get(String(v._id)) ?? null }));

  return ok({
    visits: withFreq,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    stats: { today, upcoming, pending, completed },
  });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const leadId = oid(str(body.leadId));
  const projectId = oid(str(body.projectId));
  if (!leadId || !projectId || !body.scheduledAt) {
    return bad("Lead, project and scheduled time are required.");
  }
  const scheduledAt = new Date(body.scheduledAt as string);
  if (Number.isNaN(scheduledAt.getTime())) return bad("Invalid scheduled time.");

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  const [lead, project] = await Promise.all([
    Lead.findOne({ _id: leadId, workspaceId }).select("_id").lean(),
    Project.findOne({ _id: projectId, workspaceId }).select("_id").lean(),
  ]);
  if (!lead) return bad("Lead not found.", 404);
  if (!project) return bad("Project not found.", 404);

  let assignedTo = userId;
  let assignedToName: string | undefined;
  const wantAssignee = oid(str(body.assignedTo));
  if (wantAssignee) {
    if (mustSeeOwnOnly(session.role) && String(wantAssignee) !== session.userId) {
      return bad("You can only assign visits to yourself.", 403);
    }
    const u = await User.findOne({ _id: wantAssignee, workspaceId }).select("name").lean();
    if (!u) return bad("Assignee not found.", 404);
    assignedTo = wantAssignee;
    assignedToName = u.name;
  }
  const brokerId = oid(str(body.brokerId));
  if (brokerId && !(await Broker.exists({ _id: brokerId, workspaceId }))) {
    return bad("Channel partner not found.", 404);
  }

  const mode = MODES.includes(str(body.mode)) ? str(body.mode) : "in_person";
  const visitType = VISIT_TYPES.includes(str(body.visitType)) ? str(body.visitType) : "site_visit";
  const visit = await SiteVisit.create({
    workspaceId,
    leadId,
    projectId,
    scheduledAt,
    durationMinutes: typeof body.durationMinutes === "number" ? body.durationMinutes : 60,
    mode,
    visitType,
    virtualLink: str(body.virtualLink) || undefined,
    remark: str(body.remark) || undefined,
    cpPresent: body.cpPresent === true || !!brokerId,
    brokerId: brokerId ?? undefined,
    assignedTo,
    assignedToName,
    assignedBy: userId,
    status: "planned",
    createdBy: userId,
  });

  await Lead.updateOne({ _id: leadId, workspaceId }, { $set: { stage: "site_visit_scheduled" } });
  await LeadActivity.create({
    workspaceId,
    leadId,
    actorId: userId,
    actorType: "user",
    type: "site_visit_scheduled",
    description: `Site visit scheduled for ${scheduledAt.toLocaleString("en-IN")}.`,
    occurredAt: new Date(),
  });

  return ok({ visit }, { status: 201 });
});
