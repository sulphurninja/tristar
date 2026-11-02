import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Workspace pick-list entries ("Masters"): contact types, amenities, budget
 * ranges, property types and their sub-types, … See lib/masters.ts for the
 * catalog of types. Child entries point at their parent with `parentId`
 * (a Master, or a Source for lead sub-sources).
 */
const MasterSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    type: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true },
    color: String,
    description: String,
    url: String,
    min: Number,
    max: Number,
    parentId: { type: Schema.Types.ObjectId, index: true },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

MasterSchema.index({ workspaceId: 1, type: 1, parentId: 1, order: 1 });

export type MasterDoc = InferSchemaType<typeof MasterSchema> & { _id: mongoose.Types.ObjectId };

const Master = (mongoose.models.Master as Model<MasterDoc>) || mongoose.model<MasterDoc>("Master", MasterSchema);

export default Master;
