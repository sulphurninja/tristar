import mongoose from "mongoose";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok, bad } from "@/lib/api";

export const POST = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as {
    type?: string;
    description?: string;
    channel?: string;
    direction?: string;
    durationSec?: number;
  };

  const lead = await Lead.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  }).lean();
  if (!lead) return bad("Lead not found", 404);

  const userId = new mongoose.Types.ObjectId(session.userId);

  const activity = await LeadActivity.create({
    workspaceId: lead.workspaceId,
    leadId: lead._id,
    actorId: userId,
    actorType: "user",
    type: body.type ?? "comment_added",
    description: body.description,
    channel: body.channel,
    direction: body.direction,
    durationSec: body.durationSec,
    occurredAt: new Date(),
  });

  /* Patch lead's lastContactedAt if it's a comm event */
  const commTypes = ["call_made", "whatsapp_sent", "sms_sent", "email_sent", "ai_voice_call"];
  if (body.type && commTypes.includes(body.type)) {
    await Lead.updateOne(
      { _id: lead._id },
      {
        $set: {
          lastContactedAt: new Date(),
          lastContactChannel:
            body.type === "call_made" || body.type === "ai_voice_call"
              ? "call"
              : body.type.replace("_sent", ""),
        },
      },
    );
  }

  return ok({ activity }, { status: 201 });
});
