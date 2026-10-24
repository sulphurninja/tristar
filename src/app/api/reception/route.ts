import mongoose from "mongoose";
import Reception, { RECEPTION_PURPOSES, RECEPTION_STATUSES } from "@/models/Reception";
import Project from "@/models/Project";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { rangeBounds } from "@/lib/scope";
import { createWalkinLead, findLeadByPhone } from "@/lib/reception-lead";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const GET = withAuth(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const limit = Math.min(Math.max(parseInt(sp.get("limit") ?? "20", 10) || 20, 1), 1000);
  const skip = Math.max(parseInt(sp.get("skip") ?? "0", 10) || 0, 0);

  const base: Record<string, unknown> = { workspaceId };
  const range = sp.get("range") ?? "today";
  const bounds = range === "all" ? null : rangeBounds(range, sp.get("from"), sp.get("to"));
  if (bounds) base.visitDate = { $gte: bounds[0], $lte: bounds[1] };
  const projectId = sp.get("projectId");
  if (projectId && mongoose.isValidObjectId(projectId)) base.projectId = new mongoose.Types.ObjectId(projectId);
  const assignee = sp.get("assignee");
  if (assignee && mongoose.isValidObjectId(assignee)) base.meetWith = new mongoose.Types.ObjectId(assignee);
  const purpose = sp.get("purpose");
  if (purpose && (RECEPTION_PURPOSES as readonly string[]).includes(purpose)) base.purpose = purpose;
  const q = sp.get("q")?.trim();
  if (q) {
    const re = escapeRe(q);
    base.$or = [
      { visitorName: { $regex: re, $options: "i" } },
      { visitorPhone: { $regex: re, $options: "i" } },
      { projectName: { $regex: re, $options: "i" } },
      { meetWithName: { $regex: re, $options: "i" } },
    ];
  }

  const filter: Record<string, unknown> = { ...base };
  const status = sp.get("status");
  if (status && (RECEPTION_STATUSES as readonly string[]).includes(status)) filter.visitStatus = status;

  const [visits, total, byStatus] = await Promise.all([
    Reception.find(filter)
      .sort({ checkInAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "leadId", select: "leadNumber contact.name" })
      .lean(),
    Reception.countDocuments(filter),
    Reception.aggregate<{ _id: string; n: number }>([
      { $match: base },
      { $group: { _id: "$visitStatus", n: { $sum: 1 } } },
    ]),
  ]);
  const kpis = { total: 0, waiting: 0, met: 0, completed: 0, left: 0 };
  for (const r of byStatus) {
    kpis.total += r.n;
    if (r._id in kpis) kpis[r._id as "waiting" | "met" | "completed" | "left"] = r.n;
  }
  return ok({ visits, total, kpis });
});

/**
 * Body: { visitorName, visitorPhone, visitorEmail?, visitorCount?, purpose?, projectId?,
 *         meetWith?, source?, remarks?, leadMode?: "none" | "match" | "create" }
 * leadMode "match" links an existing lead with the same mobile; "create" links it,
 * or creates a new walk-in lead when none exists.
 */
export const POST = withAuth(async ({ req, session }) => {
  const b = (await req.json()) as Record<string, unknown>;
  const name = typeof b.visitorName === "string" ? b.visitorName.trim() : "";
  const phone = typeof b.visitorPhone === "string" ? b.visitorPhone.trim() : "";
  if (!name || !phone) return bad("Visitor name and mobile are required.");
  if (phone.replace(/\D/g, "").length < 7) return bad("Enter a valid mobile number.");
  const email = typeof b.visitorEmail === "string" ? b.visitorEmail.trim().toLowerCase() : "";
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return bad("Enter a valid email address.");
  const purpose = (RECEPTION_PURPOSES as readonly string[]).includes(b.purpose as string) ? (b.purpose as string) : "new_enquiry";

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  let projectId: mongoose.Types.ObjectId | undefined;
  let projectName: string | undefined;
  if (typeof b.projectId === "string" && mongoose.isValidObjectId(b.projectId)) {
    const p = await Project.findOne({ _id: b.projectId, workspaceId }).select("name").lean();
    if (!p) return bad("Project not found.");
    projectId = p._id;
    projectName = p.name;
  }
  let meetWith: mongoose.Types.ObjectId | undefined;
  let meetWithName: string | undefined;
  if (typeof b.meetWith === "string" && mongoose.isValidObjectId(b.meetWith)) {
    const u = await User.findOne({ _id: b.meetWith, workspaceId }).select("name").lean();
    if (!u) return bad("User not found.");
    meetWith = u._id;
    meetWithName = u.name;
  }

  let leadId: mongoose.Types.ObjectId | undefined;
  let leadCreated = false;
  let leadMatched = false;
  if (b.leadMode === "match" || b.leadMode === "create") {
    const existing = await findLeadByPhone(workspaceId, phone);
    if (existing) {
      leadId = existing._id;
      leadMatched = true;
    } else if (b.leadMode === "create") {
      const lead = await createWalkinLead({
        workspaceId,
        userId,
        name,
        phone,
        email,
        projectId,
        assignedTo: meetWith,
        description: typeof b.remarks === "string" ? b.remarks : undefined,
      });
      leadId = lead._id;
      leadCreated = true;
    }
  }

  const now = new Date();
  const visit = await Reception.create({
    workspaceId,
    visitorName: name,
    visitorPhone: phone,
    visitorEmail: email || undefined,
    visitorCount: Math.max(1, Number(b.visitorCount) || 1),
    purpose,
    projectId,
    projectName,
    meetWith,
    meetWithName,
    source: typeof b.source === "string" && b.source ? b.source : "walkin",
    visitStatus: "waiting",
    visitDate: now,
    checkInAt: now,
    leadId,
    remarks: typeof b.remarks === "string" ? b.remarks : undefined,
    createdBy: userId,
  });
  return ok({ visit, leadCreated, leadMatched }, { status: 201 });
});
