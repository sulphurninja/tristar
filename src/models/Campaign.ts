import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const CampaignSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true },
    channel: {
      type: String,
      enum: ["facebook", "instagram", "google", "whatsapp", "sms", "email", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["draft", "active", "paused", "completed"],
      default: "draft",
      index: true,
    },
    utmSource: String,
    utmMedium: String,
    utmCampaign: String,
    budget: Number,
    startDate: Date,
    endDate: Date,
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

CampaignSchema.index({ workspaceId: 1, createdAt: -1 });

export type CampaignDoc = InferSchemaType<typeof CampaignSchema> & {
  _id: mongoose.Types.ObjectId;
};

if (process.env.NODE_ENV !== "production") delete mongoose.models.Campaign;

const Campaign =
  (mongoose.models.Campaign as Model<CampaignDoc>) ||
  mongoose.model<CampaignDoc>("Campaign", CampaignSchema);

export default Campaign;
