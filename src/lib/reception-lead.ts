import mongoose from "mongoose";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import Pipeline, { ensureDefaultPipeline } from "@/models/Pipeline";
import User from "@/models/User";

/** Find a lead in the workspace by the last 10 digits of a phone number. */
export async function findLeadByPhone(workspaceId: mongoose.Types.ObjectId, phone: string) {
  const digits = phone.replace(/\D/g, "").slice(-10);
  if (digits.length < 7) return null;
  return Lead.findOne({ workspaceId, "contact.primaryPhone": { $regex: `${digits}$` } })
    .select("leadNumber contact stage isContact assignedTo")
    .populate({ path: "assignedTo", select: "name" })
    .lean();
}

/** Create a lead for a walk-in visitor (source: walkin) and log it. */
export async function createWalkinLead(opts: {
  workspaceId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  name: string;
  phone: string;
  email?: string;
  projectId?: mongoose.Types.ObjectId;
  assignedTo?: mongoose.Types.ObjectId;
  description?: string;
}) {
  const { workspaceId, userId, name, phone } = opts;
  const pipeline =
    (await Pipeline.findOne({ workspaceId, isDefault: true })) ?? (await ensureDefaultPipeline(workspaceId, userId));
  const count = await Lead.countDocuments({ workspaceId });
  const leadNumber = `TS-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;
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
      email: opts.email || undefined,
      whatsappOptIn: true,
      emailOptIn: true,
      smsOptIn: true,
      language: "en",
    },
    primaryProjectId: opts.projectId,
    interestedProjects: opts.projectId ? [opts.projectId] : [],
    stage: pipeline.stages?.[0]?.key ?? "new",
    priority: "medium",
    source: { primary: "walkin", capturedAt: now },
    description: opts.description,
    score: { value: 0, label: "cold", closeProbability: 0 },
    assignedTo: opts.assignedTo ?? userId,
    assignedAt: now,
    createdBy: userId,
  });
  const actor = await User.findById(userId).select("name").lean();
  await LeadActivity.create({
    workspaceId,
    leadId: lead._id,
    actorId: userId,
    actorName: actor?.name,
    actorType: "user",
    type: "lead_created",
    description: `Lead ${leadNumber} created from Reception walk-in — ${name}.`,
    occurredAt: now,
  });
  return lead;
}
