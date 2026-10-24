import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const TeamSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    leaderId: { type: Schema.Types.ObjectId, ref: "User" },
    description: String,
  },
  { timestamps: true },
);

TeamSchema.index({ workspaceId: 1, name: 1 }, { unique: true });

export type TeamDoc = InferSchemaType<typeof TeamSchema> & { _id: mongoose.Types.ObjectId };

const Team = (mongoose.models.Team as Model<TeamDoc>) || mongoose.model<TeamDoc>("Team", TeamSchema);

export default Team;
