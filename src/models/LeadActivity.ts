import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Single source of truth for the lead timeline.
 * Captures every interaction: stage changes, calls, messages, visits,
 * emails, comments, score updates, broker actions, etc.
 */
const LeadActivitySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User" },
    actorName: String,
    actorType: { type: String, enum: ["user", "system", "automation", "ai_agent", "broker", "lead"], default: "user" },

    type: {
      type: String,
      enum: [
        "lead_created",
        "lead_assigned",
        "lead_unassigned",
        "stage_changed",
        "pipeline_changed",
        "priority_changed",
        "score_updated",
        "comment_added",
        "tag_added",
        "tag_removed",
        "field_updated",
        "call_made",
        "call_missed",
        "whatsapp_sent",
        "whatsapp_received",
        "sms_sent",
        "sms_received",
        "email_sent",
        "email_received",
        "rcs_sent",
        "ai_voice_call",
        "site_visit_scheduled",
        "site_visit_completed",
        "site_visit_cancelled",
        "document_uploaded",
        "meeting_logged",
        "followup_set",
        "payment_received",
        "automation_triggered",
        "campaign_targeted",
        "duplicate_detected",
        "merged",
        "imported",
        "exported",
        "contact_converted",
        "owner_added",
        "owner_removed",
        "cp_linked",
        "cp_unlinked",
        "interest_added",
        "interest_removed",
        "requirement_updated",
        "document_deleted",
        "note_added",
        "other",
      ],
      required: true,
      index: true,
    },

    description: String,
    fromValue: Schema.Types.Mixed,
    toValue: Schema.Types.Mixed,
    metadata: { type: Schema.Types.Mixed },

    channel: { type: String, enum: ["call", "whatsapp", "sms", "email", "rcs", "in_person", "voip", "system"] },
    direction: { type: String, enum: ["inbound", "outbound"] },
    durationSec: Number,
    recordingUrl: String,
    transcript: String,

    external: {
      messageId: String,
      campaignId: String,
      automationId: String,
      callId: String,
    },

    occurredAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true },
);

LeadActivitySchema.index({ leadId: 1, occurredAt: -1 });
LeadActivitySchema.index({ workspaceId: 1, type: 1, occurredAt: -1 });

export type LeadActivityDoc = InferSchemaType<typeof LeadActivitySchema> & { _id: mongoose.Types.ObjectId };

if (mongoose.models.LeadActivity && !(mongoose.models.LeadActivity.schema.path("type") as { enumValues?: string[] }).enumValues?.includes("note_added")) mongoose.deleteModel("LeadActivity");

const LeadActivity =
  (mongoose.models.LeadActivity as Model<LeadActivityDoc>) ||
  mongoose.model<LeadActivityDoc>("LeadActivity", LeadActivitySchema);

export default LeadActivity;
