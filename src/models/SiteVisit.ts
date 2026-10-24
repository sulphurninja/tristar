import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SiteVisitSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", required: true, index: true },
    unitIds: [{ type: Schema.Types.ObjectId, ref: "Unit" }],

    scheduledAt: { type: Date, required: true, index: true },
    durationMinutes: { type: Number, default: 60 },
    timezone: { type: String, default: "Asia/Kolkata" },
    mode: { type: String, enum: ["in_person", "virtual", "phygital"], default: "in_person" },
    virtualLink: String,

    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    assignedToName: String,
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    remark: String,
    visitType: { type: String, enum: ["site_visit", "revisit", "final_visit", "virtual"], default: "site_visit", index: true },
    cpPresent: { type: Boolean, default: false },
    brokerId: { type: Schema.Types.ObjectId, ref: "Broker", index: true },
    rescheduleCount: { type: Number, default: 0 },
    noShowAt: Date,
    accompaniedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],

    status: {
      type: String,
      enum: ["planned", "confirmed", "in_progress", "done", "no_show", "cancelled", "rescheduled"],
      default: "planned",
      index: true,
    },
    confirmedAt: Date,
    checkInAt: Date,
    checkInLocation: { lat: Number, lng: Number, accuracy: Number },
    completedAt: Date,
    cancelledAt: Date,
    cancelReason: String,

    feedback: {
      interest: { type: String, enum: ["very_high", "high", "medium", "low", "none"], default: "medium" },
      objections: [{ type: String }],
      pricingFeedback: String,
      followUpRequired: { type: Boolean, default: true },
      followUpAt: Date,
      notes: String,
      photos: [{ type: String }],
      voiceNoteUrl: String,
      aiSummary: String,
    },

    remindersSent: [
      {
        type: { type: String, enum: ["confirmation", "reminder_24h", "reminder_3h", "reminder_1h", "post_visit_feedback"] },
        channel: { type: String, enum: ["whatsapp", "sms", "email", "call"] },
        sentAt: Date,
        externalMessageId: String,
        delivered: { type: Boolean, default: false },
      },
    ],

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

SiteVisitSchema.index({ workspaceId: 1, scheduledAt: 1 });
SiteVisitSchema.index({ workspaceId: 1, status: 1, scheduledAt: 1 });

// Dev only: re-register on hot reload so schema edits are picked up.
if (process.env.NODE_ENV !== "production") delete mongoose.models.SiteVisit;

export type SiteVisitDoc = InferSchemaType<typeof SiteVisitSchema> & { _id: mongoose.Types.ObjectId };

const SiteVisit = (mongoose.models.SiteVisit as Model<SiteVisitDoc>) || mongoose.model<SiteVisitDoc>("SiteVisit", SiteVisitSchema);

export default SiteVisit;
