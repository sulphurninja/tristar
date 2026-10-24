import mongoose from "mongoose";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok, bad } from "@/lib/api";

/** Activity types that belong to each per-channel tab. */
const CHANNEL_TYPES: Record<string, string[]> = {
  email: ["email_sent", "email_received"],
  call: ["call_made", "call_missed", "ai_voice_call"],
  sms: ["sms_sent", "sms_received"],
  whatsapp: ["whatsapp_sent", "whatsapp_received"],
  meeting: ["meeting_logged"],
};

const WRITABLE = new Set([
  "comment_added",
  "call_made",
  "call_missed",
  "whatsapp_sent",
  "sms_sent",
  "email_sent",
  "meeting_logged",
  "other",
]);

export const GET = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const url = new URL(req.url);
  const channel = url.searchParams.get("channel") ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10) || 100, 300);

  const lead = await Lead.findOne({ _id: params.id, workspaceId: session.workspaceId }).select("_id workspaceId").lean();
  if (!lead) return bad("Lead not found", 404);

  const filter: Record<string, unknown> = { leadId: lead._id, workspaceId: lead.workspaceId };
  if (channel && CHANNEL_TYPES[channel]) filter.type = { $in: CHANNEL_TYPES[channel] };

  const activities = await LeadActivity.find(filter)
    .sort({ occurredAt: -1 })
    .limit(limit)
    .populate({ path: "actorId", select: "name" })
    .lean();
  return ok({ activities });
});

export const POST = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as {
    type?: string;
    description?: string;
    channel?: string;
    direction?: string;
    durationSec?: number;
    metadata?: Record<string, unknown>;
    occurredAt?: string;
  };

  const type = body.type ?? "comment_added";
  if (!WRITABLE.has(type)) return bad(`Unsupported activity type "${type}".`);
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 4000) : "";
  if (!description && type === "comment_added") return bad("Note text is required.");

  const lead = await Lead.findOne({ _id: params.id, workspaceId: session.workspaceId }).lean();
  if (!lead) return bad("Lead not found", 404);

  const channel = ["call", "whatsapp", "sms", "email", "in_person"].includes(body.channel ?? "")
    ? body.channel
    : undefined;
  const direction = body.direction === "inbound" ? "inbound" : body.direction === "outbound" ? "outbound" : undefined;
  const durationSec = typeof body.durationSec === "number" && body.durationSec >= 0 ? Math.round(body.durationSec) : undefined;
  const when = body.occurredAt ? new Date(body.occurredAt) : new Date();

  const activity = await LeadActivity.create({
    workspaceId: lead.workspaceId,
    leadId: lead._id,
    actorId: new mongoose.Types.ObjectId(session.userId),
    actorType: "user",
    type,
    description,
    channel,
    direction,
    durationSec,
    metadata: body.metadata && typeof body.metadata === "object" ? body.metadata : undefined,
    occurredAt: Number.isNaN(when.getTime()) ? new Date() : when,
  });

  /* A real touch point updates "last contact" (used by the Untouched Leads card). */
  const touch: Record<string, string> = {
    call_made: "call",
    whatsapp_sent: "whatsapp",
    sms_sent: "sms",
    email_sent: "email",
    meeting_logged: "meeting",
  };
  if (touch[type]) {
    await Lead.updateOne(
      { _id: lead._id },
      { $set: { lastContactedAt: new Date(), lastContactChannel: touch[type] } },
    );
  }

  return ok({ activity }, { status: 201 });
});
