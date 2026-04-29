import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Lead source taxonomy. Workspace-defined so each Tristar branch can have
 * their own custom sources (Walk-in, Telecalling, Channel Partner, Hoarding…).
 *
 * `key` is a slug used by the API; `label` is the human display name.
 */
const SourceSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    key: { type: String, required: true, lowercase: true, trim: true, index: true },
    label: { type: String, required: true, trim: true },
    description: String,
    color: { type: String, default: "#0F8F60" },
    isActive: { type: Boolean, default: true, index: true },
    sortOrder: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

SourceSchema.index({ workspaceId: 1, key: 1 }, { unique: true });

export type SourceDoc = InferSchemaType<typeof SourceSchema> & {
  _id: mongoose.Types.ObjectId;
};

const Source =
  (mongoose.models.Source as Model<SourceDoc>) ||
  mongoose.model<SourceDoc>("Source", SourceSchema);

export default Source;
