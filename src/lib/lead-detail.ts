import mongoose from "mongoose";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import "@/models/User";
import "@/models/Project";
import "@/models/Property";
import "@/models/Broker";

/** Days a channel partner tag stays valid before the lead is free again. */
export const CP_TAG_DAYS = 90;

/** Full lead payload for the Lead Information drawer. */
export async function loadLeadDetail(id: string, workspaceId: string) {
  const lead = await Lead.findOne({ _id: id, workspaceId })
    .select("-documents.uploadedBy")
    .populate({ path: "primaryProjectId", select: "name code location" })
    .populate({ path: "interestedProjects", select: "name code location" })
    .populate({ path: "interestedProperties", select: "title location city configuration price status" })
    .populate({ path: "assignedTo", select: "name email phone avatarUrl" })
    .populate({ path: "preSalesAgentId", select: "name email" })
    .populate({ path: "coOwners", select: "name email" })
    .populate({ path: "brokerId", select: "name firmName phone cpCode rmName email" })
    .lean();
  if (!lead) return null;

  const lastActivity = await LeadActivity.findOne({
    leadId: lead._id,
    workspaceId: lead.workspaceId,
  })
    .sort({ occurredAt: -1 })
    .select("type description occurredAt actorName")
    .lean();

  let cpRemainingDays: number | null = null;
  if (lead.brokerId && lead.cpTaggedAt) {
    const used = Math.floor((Date.now() - new Date(lead.cpTaggedAt).getTime()) / 86_400_000);
    cpRemainingDays = Math.max(0, CP_TAG_DAYS - used);
  }

  return { lead, lastActivity, cpRemainingDays };
}

export function oidOf(v: unknown): mongoose.Types.ObjectId | undefined {
  return typeof v === "string" && mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : undefined;
}

type ActivityInput = {
  type: string;
  description?: string;
  channel?: string;
  direction?: string;
  durationSec?: number;
  fromValue?: unknown;
  toValue?: unknown;
  metadata?: Record<string, unknown>;
  occurredAt?: Date;
};

export async function logActivity(
  session: { userId: string },
  lead: { _id: mongoose.Types.ObjectId; workspaceId: mongoose.Types.ObjectId },
  a: ActivityInput,
) {
  return LeadActivity.create({
    workspaceId: lead.workspaceId,
    leadId: lead._id,
    actorId: new mongoose.Types.ObjectId(session.userId),
    actorType: "user",
    occurredAt: new Date(),
    ...a,
  });
}
