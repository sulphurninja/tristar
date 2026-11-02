import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Round-robin lead distribution. The first active rule (by `order`) whose
 * sources / projects match a new, unassigned lead hands it to the next agent
 * in `agentIds`, skipping anyone suspended, deleted or on holiday.
 * Empty `sources` / `projectIds` mean "any".
 */
const DistributionRuleSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true },
    active: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
    sources: [{ type: String }],
    projectIds: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    agentIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    /** Monotonic counter; next agent = agentIds[pointer % length]. */
    pointer: { type: Number, default: 0 },
    assignedCount: { type: Number, default: 0 },
    lastAssignedAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

export type DistributionRuleDoc = InferSchemaType<typeof DistributionRuleSchema> & { _id: mongoose.Types.ObjectId };

const DistributionRule =
  (mongoose.models.DistributionRule as Model<DistributionRuleDoc>) ||
  mongoose.model<DistributionRuleDoc>("DistributionRule", DistributionRuleSchema);

export default DistributionRule;
