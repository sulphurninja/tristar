import mongoose from "mongoose";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import Project from "@/models/Project";
import Reception from "@/models/Reception";
import SiteVisit from "@/models/SiteVisit";
import Task from "@/models/Task";
import User from "@/models/User";
import Workspace from "@/models/Workspace";
import { withAuth, ok, bad } from "@/lib/api";
import { pickAgent } from "@/lib/distribution";
import { createWalkinLead, findLeadByPhone } from "@/lib/reception-lead";
import { resolveForm } from "@/lib/lead-form";
import { RECEPTION_SECTIONS, normalizeReception } from "@/lib/reception-config";

type Oid = mongoose.Types.ObjectId;

const s = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : "");
const oid = (v: unknown) => (typeof v === "string" && mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : undefined);

/** "1.25 Cr" / "75 L" / "9000000" → rupees. */
function parseBudget(v: string): number | undefined {
  const m = /([\d.]+)\s*(cr|crore|l|lac|lakh|k)?/i.exec(v.replace(/,/g, ""));
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  if (!Number.isFinite(n)) return undefined;
  const unit = (m[2] ?? "").toLowerCase();
  if (unit.startsWith("c")) return Math.round(n * 1e7);
  if (unit.startsWith("l")) return Math.round(n * 1e5);
  if (unit === "k") return Math.round(n * 1e3);
  return Math.round(n);
}

const FIELD_VALUE: Record<string, (b: Record<string, unknown>) => unknown> = {
  firstName: (b) => b.firstName,
  lastName: (b) => b.lastName,
  email: (b) => b.email,
  dob: (b) => b.dob,
  primaryPhone: (b) => b.phone,
  secondaryPhone: (b) => b.secondaryPhone,
  occupation: (b) => b.occupation,
  address: (b) => b.address,
  city: (b) => b.city,
  locality: (b) => b.locality,
  pincode: (b) => b.pincode,
  project: (b) => b.projectId,
  configuration: (b) => b.configuration,
  budget: (b) => b.budget,
  purpose: (b) => b.purpose,
  timeline: (b) => b.timeline,
  preSalesAgent: (b) => b.preSalesAgentId,
  closingManager: (b) => b.closingManagerId,
  sourcingManager: (b) => b.sourcingManagerId,
  source: (b) => b.source,
  channelPartner: (b) => b.brokerId,
  visitorCount: (b) => b.visitorCount,
  remark: (b) => b.remark,
};

/**
 * POST /api/reception/checkin — the reception kiosk's submit.
 * Finds (by mobile) or creates the lead, records the walk-in, logs an
 * in-progress site visit and gives each selected agent a "meet at reception" task.
 */
export const POST = withAuth(async ({ req, session }) => {
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  const ws = await Workspace.findById(workspaceId).select("receptionConfig").lean();
  const config = normalizeReception((ws as { receptionConfig?: unknown } | null)?.receptionConfig);
  const { fields } = resolveForm(RECEPTION_SECTIONS, config.form);

  /* Required-field check mirrors what the admin configured. */
  for (const sec of RECEPTION_SECTIONS) {
    for (const f of sec.fields) {
      if (fields[f.key] !== "required") continue;
      const v = FIELD_VALUE[f.key]?.(b);
      if (v == null || (typeof v === "string" && !v.trim())) return bad(`${f.label} is required.`);
    }
  }

  const first = s(b.firstName, 60);
  const last = s(b.lastName, 60);
  const name = [first, last].filter(Boolean).join(" ");
  const phone = s(b.phone, 20);
  if (!first) return bad("First name is required.");
  if (phone.replace(/\D/g, "").length < 7) return bad("Enter a valid mobile number.");
  const email = s(b.email, 120).toLowerCase();
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return bad("Enter a valid email address.");

  /* Project + its desk defaults */
  let projectId = oid(b.projectId);
  let projectName: string | undefined;
  if (projectId) {
    const p = await Project.findOne({ _id: projectId, workspaceId }).select("name").lean();
    if (!p) projectId = undefined;
    else projectName = p.name;
  }
  const desk = projectId ? config.projects.find((d) => d.projectId === String(projectId)) : undefined;

  /* Agents (must be active workspace users) */
  const wanted = {
    preSales: oid(b.preSalesAgentId),
    closing: oid(b.closingManagerId) ?? (config.options.autoAssignProjectAgent ? oid(desk?.agentId) : undefined),
    sourcing: oid(b.sourcingManagerId),
  };
  const ids = [wanted.preSales, wanted.closing, wanted.sourcing].filter(Boolean) as Oid[];
  const agents = ids.length
    ? await User.find({ _id: { $in: ids }, workspaceId, status: { $ne: "suspended" } }).select("name").lean()
    : [];
  const agentName = new Map(agents.map((a) => [String(a._id), a.name]));
  const valid = (id?: Oid) => (id && agentName.has(String(id)) ? id : undefined);
  const preSales = valid(wanted.preSales);
  let closing = valid(wanted.closing);
  /* Nobody picked and no project default → Users → Distribution rules. */
  if (!closing && !preSales) {
    const auto = await pickAgent(workspaceId, { source: s(b.source, 60) || "walkin", projectId });
    if (auto) {
      const u = await User.findById(auto).select("name").lean();
      if (u) {
        agentName.set(String(auto), u.name);
        closing = auto;
      }
    }
  }
  const sourcing = valid(wanted.sourcing);

  const now = new Date();
  const budget = s(b.budget, 40);
  const configuration = s(b.configuration, 40);
  const city = s(b.city, 80);
  const locality = s(b.locality, 80);
  const purpose = s(b.purpose, 40);
  const remark = s(b.remark, 1000);
  const brokerId = oid(b.brokerId);
  const source = s(b.source, 60) || "walkin";

  /* Lead: reuse by mobile, else create */
  const existing = await findLeadByPhone(workspaceId, phone);
  let leadId: Oid;
  let leadNumber: string | undefined;
  const returning = !!existing;
  if (existing) {
    leadId = existing._id;
    leadNumber = existing.leadNumber ?? undefined;
  } else {
    const lead = await createWalkinLead({
      workspaceId,
      userId,
      name,
      phone,
      email,
      projectId,
      assignedTo: closing ?? preSales,
      description: remark || undefined,
    });
    leadId = lead._id;
    leadNumber = lead.leadNumber ?? undefined;
  }

  const set: Record<string, unknown> = { lastContactedAt: now, lastContactChannel: "site_visit" };
  if (!existing) set["source.primary"] = source;
  if (email) set["contact.email"] = email;
  if (last && !existing) set["contact.lastName"] = last;
  if (s(b.secondaryPhone)) set["contact.altPhone"] = s(b.secondaryPhone, 20);
  if (s(b.dob)) set.dateOfBirth = new Date(s(b.dob));
  if (s(b.address)) set.address = s(b.address, 300);
  if (s(b.occupation)) set["preferences.occupation"] = s(b.occupation, 80);
  if (city) set["preferences.cities"] = [city];
  if (locality) set["preferences.localities"] = [locality];
  if (configuration) set["preferences.configurations"] = [configuration];
  const rupees = budget ? parseBudget(budget) : undefined;
  if (rupees) {
    set["preferences.maxBudget"] = rupees;
    set["requirement.budgetMax"] = rupees;
  }
  if (purpose) set["customFields.receptionPurpose"] = purpose;
  if (s(b.timeline)) set["customFields.buyingTimeline"] = s(b.timeline, 40);
  if (s(b.pincode)) set["customFields.pincode"] = s(b.pincode, 12);
  if (budget) set["customFields.receptionBudget"] = budget;
  if (preSales) set.preSalesAgentId = preSales;
  if (sourcing) set.sourcingManagerId = sourcing;
  if (brokerId) {
    set.brokerId = brokerId;
    set.cpTaggedAt = now;
  }
  if (closing && !existing) {
    set.assignedTo = closing;
    set.assignedAt = now;
  }
  const update: Record<string, unknown> = { $set: set };
  if (projectId) update.$addToSet = { interestedProjects: projectId };
  if (existing) set.isReturning = true;
  await Lead.updateOne({ _id: leadId, workspaceId }, update);
  if (projectId && !existing) await Lead.updateOne({ _id: leadId, primaryProjectId: null }, { $set: { primaryProjectId: projectId } });

  /* Reception register entry */
  const meetWith = closing ?? preSales;
  const visit = await Reception.create({
    workspaceId,
    visitorName: name,
    visitorPhone: phone,
    visitorEmail: email || undefined,
    visitorCount: Math.max(1, Number(b.visitorCount) || 1),
    purpose: "site_visit",
    projectId,
    projectName,
    meetWith,
    meetWithName: meetWith ? agentName.get(String(meetWith)) : undefined,
    source,
    visitStatus: "waiting",
    visitDate: now,
    checkInAt: now,
    leadId,
    remarks: remark || undefined,
    createdBy: userId,
  });

  /* Site visit, in progress from the moment they walk in */
  if (config.options.logSiteVisit && projectId) {
    const prior = existing ? await SiteVisit.countDocuments({ workspaceId, leadId }) : 0;
    await SiteVisit.create({
      workspaceId,
      leadId,
      projectId,
      scheduledAt: now,
      checkInAt: now,
      status: "in_progress",
      visitType: prior ? "revisit" : "site_visit",
      assignedTo: meetWith,
      assignedBy: userId,
      cpPresent: !!brokerId,
      brokerId,
      createdBy: userId,
    });
  }

  /* One task per distinct agent */
  const summary = [
    projectName && `Project: ${projectName}`,
    configuration && `Looking for: ${configuration}`,
    budget && `Budget: ${budget}`,
    purpose && `Purpose: ${purpose}`,
    Number(b.visitorCount) > 1 && `${Number(b.visitorCount)} visitors`,
    remark && `Note: ${remark}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const taskFor = [
    closing && { id: closing, role: "Closing manager" },
    preSales && String(preSales) !== String(closing) && { id: preSales, role: "Pre-sales" },
  ].filter(Boolean) as Array<{ id: Oid; role: string }>;
  await Promise.all(
    taskFor.map((t) =>
      Task.create({
        workspaceId,
        leadId,
        title: `Walk-in: meet ${name} at reception`,
        type: "meeting",
        status: "pending",
        scheduleAt: now,
        assignedTo: t.id,
        assignedBy: userId,
        remark: summary || undefined,
        entityType: "lead",
        createdBy: userId,
      }),
    ),
  );

  const actor = await User.findById(userId).select("name").lean();
  await LeadActivity.create({
    workspaceId,
    leadId,
    actorId: userId,
    actorName: actor?.name,
    actorType: "user",
    type: "site_visit_scheduled",
    channel: "in_person",
    description: `${returning ? "Returning visitor" : "New walk-in"} checked in at reception${projectName ? ` for ${projectName}` : ""}.${
      taskFor.length ? ` Assigned to ${taskFor.map((t) => agentName.get(String(t.id))).join(" & ")}.` : ""
    }`,
    occurredAt: now,
  });

  return ok(
    {
      visitId: visit._id,
      lead: { _id: leadId, leadNumber, name },
      returning,
      assigned: taskFor.map((t) => ({ role: t.role, name: agentName.get(String(t.id)) })),
    },
    { status: 201 },
  );
});
