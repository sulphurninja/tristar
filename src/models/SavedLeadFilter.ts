import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** A per-user saved filter preset for the Leads list ("Select Advance Filter"). */
const SavedLeadFilterSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    /** Flat query-string style params understood by /api/leads. */
    params: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true },
);

SavedLeadFilterSchema.index({ workspaceId: 1, userId: 1, name: 1 }, { unique: true });

export type SavedLeadFilterDoc = InferSchemaType<typeof SavedLeadFilterSchema> & {
  _id: mongoose.Types.ObjectId;
};

const SavedLeadFilter =
  (mongoose.models.SavedLeadFilter as Model<SavedLeadFilterDoc>) ||
  mongoose.model<SavedLeadFilterDoc>("SavedLeadFilter", SavedLeadFilterSchema);

export default SavedLeadFilter;
