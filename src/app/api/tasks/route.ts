import mongoose from "mongoose";
import Task from "@/models/Task";
import Lead from "@/models/Lead";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { buildTaskFilter, endOfToday, oid, mustSeeOwnOnly } from "@/lib/task-filters";
import { recordTaskCompleted } from "@/lib/task-actions";

const TYPES = ["call", "meeting", "site_visit", "follow_up", "whatsapp", "email", "other"];
const ENTITIES = ["lead", "contact", "broker", "other"];
const OPEN = ["pending", "upcoming"];

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const limit = Math.min(Math.max(parseInt(sp.get("limit") ?? "50", 10) || 50, 1), 5000);
  const page = Math.max(parseInt(sp.get("page") ?? "0", 10) || 0, 0);
  const skip = page > 0 ? (page - 1) * limit : Math.max(parseInt(sp.get("skip") ?? "0", 10) || 0, 0);

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const { filter, scopeOnly } = await buildTaskFilter(workspaceId, url, session);

  const sortKey = sp.get("sort") ?? "";
  const dir = sp.get("dir") === "desc" ? -1 : 1;
  const sort: Record<string, 1 | -1> =
    sortKey === "created"
      ? { createdAt: dir, _id: dir }
      : sortKey === "schedule"
        ? { scheduleAt: dir, _id: dir }
        : { scheduleAt: 1, createdAt: -1 };

  const sod = new Date();
  sod.setHours(0, 0, 0, 0);
  const eod = endOfToday();

  const [items, total, today, upcoming, pending, completed] = await Promise.all([
    Task.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate({
        path: "leadId",
        select: "contact leadNumber isContact assignedTo primaryProjectId",
        populate: [
          { path: "assignedTo", select: "name" },
          { path: "primaryProjectId", select: "name" },
        ],
      })
      .populate({ path: "assignedTo", select: "name email" })
      .populate({ path: "assignedBy", select: "name" })
      .lean(),
    Task.countDocuments(filter),
    Task.countDocuments({ ...scopeOnly, scheduleAt: { $gte: sod, $lte: eod } }),
    Task.countDocuments({ ...scopeOnly, scheduleAt: { $gt: eod }, status: { $in: OPEN } }),
    Task.countDocuments({ ...scopeOnly, status: { $in: OPEN } }),
    Task.countDocuments({ ...scopeOnly, status: "completed" }),
  ]);

  return ok({
    tasks: items,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit)),
    stats: { today, upcoming, pending, completed },
  });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  const leadId = oid(str(body.leadId));
  const brokerId = oid(str(body.brokerId));
  let entityType = ENTITIES.includes(str(body.entityType)) ? str(body.entityType) : "lead";
  let leadName = "";
  if (leadId) {
    const lead = await Lead.findOne({ _id: leadId, workspaceId }).select("contact isContact").lean();
    if (!lead) return bad("Lead not found.", 404);
    leadName = lead.contact?.name ?? "";
    if (!body.entityType && lead.isContact) entityType = "contact";
  }

  const type = TYPES.includes(str(body.type)) ? str(body.type) : "call";
  let scheduleAt: Date | undefined;
  if (body.scheduleAt) {
    scheduleAt = new Date(body.scheduleAt as string);
    if (Number.isNaN(scheduleAt.getTime())) return bad("Invalid schedule date.");
  }
  const LABELS: Record<string, string> = {
    call: "Call",
    meeting: "Meeting",
    site_visit: "Site Visit",
    follow_up: "Follow Up",
    whatsapp: "WhatsApp",
    email: "Email",
    other: "Task",
  };
  const label = LABELS[type];
  const when = scheduleAt
    ? scheduleAt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true })
    : "";
  const title =
    str(body.title) ||
    (leadName ? `${label} With ${leadName}${when ? ` @ ${when}` : ""}` : `${label}${when ? ` @ ${when}` : ""}`);

  let assignedTo = userId;
  const wantAssignee = oid(str(body.assignedTo));
  if (wantAssignee) {
    if (mustSeeOwnOnly(session.role) && String(wantAssignee) !== session.userId) {
      return bad("You can only assign tasks to yourself.", 403);
    }
    const u = await User.exists({ _id: wantAssignee, workspaceId });
    if (!u) return bad("Assignee not found.", 404);
    assignedTo = wantAssignee;
  }

  const completed = body.completed === true || body.status === "completed";
  const task = await Task.create({
    workspaceId,
    title,
    type,
    status: completed ? "completed" : "pending",
    scheduleAt,
    completedAt: completed ? new Date() : undefined,
    completedBy: completed ? userId : undefined,
    remindMe: body.remindMe !== false,
    reminderMinutes: typeof body.reminderMinutes === "number" ? body.reminderMinutes : 15,
    remark: str(body.remark) || undefined,
    entityType,
    leadId: leadId ?? undefined,
    brokerId: brokerId ?? undefined,
    assignedTo,
    assignedBy: userId,
    createdBy: userId,
  });
  if (completed) await recordTaskCompleted(task, session.userId);

  return ok({ task }, { status: 201 });
});
