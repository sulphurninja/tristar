import mongoose from "mongoose";
import Lead from "@/models/Lead";
import Pipeline, { ensureDefaultPipeline } from "@/models/Pipeline";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok, bad } from "@/lib/api";
import { resolveAgentScope, scopeParams } from "@/lib/scope";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** CRM → Contacts: leads that were converted to contacts (isContact = true). */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "20", 10) || 20, 1), 500);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10) || 0, 0);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const { team, agent } = scopeParams(url);
  const scope = await resolveAgentScope(workspaceId, team, agent);

  const base: Record<string, unknown> = { workspaceId, isContact: true };
  if (scope) base.assignedTo = { $in: scope };

  const filter: Record<string, unknown> = { ...base };
  if (status === "lead" || status === "unqualified") filter.contactStatus = status;
  if (q) {
    const re = escapeRe(q);
    filter.$or = [
      { "contact.name": { $regex: re, $options: "i" } },
      { "contact.primaryPhone": { $regex: re, $options: "i" } },
      { "contact.email": { $regex: re, $options: "i" } },
      { leadNumber: { $regex: re, $options: "i" } },
    ];
  }

  const [contacts, total, byStatus, series] = await Promise.all([
    Lead.find(filter)
      .sort({ convertedToContactAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("leadNumber contact stage contactStatus convertedToContactAt createdAt source primaryProjectId assignedTo priority description")
      .populate({ path: "primaryProjectId", select: "name code" })
      .populate({ path: "assignedTo", select: "name" })
      .lean(),
    Lead.countDocuments(filter),
    Lead.aggregate<{ _id: string; n: number }>([
      { $match: base },
      { $group: { _id: { $ifNull: ["$contactStatus", "lead"] }, n: { $sum: 1 } } },
    ]),
    Lead.aggregate<{ _id: { d: string; s: string }; n: number }>([
      { $match: base },
      {
        $group: {
          _id: {
            d: { $dateToString: { format: "%Y-%m-%d", date: { $ifNull: ["$convertedToContactAt", "$createdAt"] } } },
            s: { $ifNull: ["$contactStatus", "lead"] },
          },
          n: { $sum: 1 },
        },
      },
    ]),
  ]);

  const counts = { lead: 0, unqualified: 0 };
  for (const r of byStatus) {
    if (r._id === "unqualified") counts.unqualified += r.n;
    else counts.lead += r.n;
  }
  const days = new Map<string, { date: string; Total: number; Lead: number; Unqualified: number }>();
  for (const r of series) {
    const row = days.get(r._id.d) ?? { date: r._id.d, Total: 0, Lead: 0, Unqualified: 0 };
    row.Total += r.n;
    if (r._id.s === "unqualified") row.Unqualified += r.n;
    else row.Lead += r.n;
    days.set(r._id.d, row);
  }
  const timeline = [...days.values()].sort((a, b) => a.date.localeCompare(b.date));

  return ok({ contacts, total, counts: { ...counts, total: counts.lead + counts.unqualified }, timeline });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!name || !phone) return bad("Name and mobile are required.");
  if (email && !/^\S+@\S+\.\S+$/.test(email)) return bad("Enter a valid email address.");

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length >= 7) {
    const dup = await Lead.findOne({
      workspaceId,
      "contact.primaryPhone": { $regex: `${digits}$` },
    })
      .select("_id isContact leadNumber")
      .lean();
    if (dup) {
      return bad(
        dup.isContact
          ? `A contact with this mobile already exists (${dup.leadNumber ?? "existing"}).`
          : `A lead with this mobile already exists (${dup.leadNumber ?? "existing"}). Convert that lead to a contact instead.`,
        409,
      );
    }
  }

  const pipeline =
    (await Pipeline.findOne({ workspaceId, isDefault: true })) ?? (await ensureDefaultPipeline(workspaceId, userId));

  const projectId =
    typeof body.projectId === "string" && mongoose.isValidObjectId(body.projectId)
      ? new mongoose.Types.ObjectId(body.projectId)
      : undefined;
  const assignedTo =
    typeof body.assignedTo === "string" && mongoose.isValidObjectId(body.assignedTo)
      ? new mongoose.Types.ObjectId(body.assignedTo)
      : userId;

  const yr = new Date().getFullYear();
  const count = await Lead.countDocuments({ workspaceId });
  const leadNumber = `TS-${yr}-${String(count + 1).padStart(5, "0")}`;
  const now = new Date();

  const lead = await Lead.create({
    workspaceId,
    leadNumber,
    pipelineId: pipeline._id,
    contact: {
      name,
      firstName: name.split(" ")[0],
      lastName: name.split(" ").slice(1).join(" "),
      primaryPhone: phone,
      email: email || undefined,
      whatsappOptIn: true,
      emailOptIn: true,
      smsOptIn: true,
      language: "en",
    },
    primaryProjectId: projectId,
    interestedProjects: projectId ? [projectId] : [],
    stage: pipeline.stages?.[0]?.key ?? "new",
    priority: "medium",
    source: { primary: typeof body.source === "string" && body.source ? body.source : "other", capturedAt: now },
    description: typeof body.description === "string" ? body.description : undefined,
    score: { value: 0, label: "cold", closeProbability: 0 },
    assignedTo,
    assignedAt: now,
    isContact: true,
    contactStatus: "lead",
    convertedToContactAt: now,
    createdBy: userId,
  });

  await LeadActivity.create({
    workspaceId,
    leadId: lead._id,
    actorId: userId,
    actorType: "user",
    type: "lead_created",
    description: `Contact ${leadNumber} added — ${name}.`,
    occurredAt: now,
  });

  return ok({ contact: lead }, { status: 201 });
});
