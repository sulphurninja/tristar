import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** Per-user saved "Advance Filter" for the Channel Partner list. */
const CpSavedFilterSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true },
    filters: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

export type CpSavedFilterDoc = InferSchemaType<typeof CpSavedFilterSchema> & { _id: mongoose.Types.ObjectId };

const CpSavedFilter =
  (mongoose.models.CpSavedFilter as Model<CpSavedFilterDoc>) ||
  mongoose.model<CpSavedFilterDoc>("CpSavedFilter", CpSavedFilterSchema);

export default CpSavedFilter;
