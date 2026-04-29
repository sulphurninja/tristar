import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Workflow requests raised by sales / telecallers / supervisors that need
 * approval from a manager — e.g. lead reassignment, status override,
 * exporting data, deleting a lead, or claiming a duplicate as their own.
 */
export const REQUEST_TYPES = [
  "reassignment",
  "status_override",
  "lead_delete",
  "data_export",
  "duplicate_claim",
  "site_visit_extension",
  "discount_approval",
  "other",
] as const;

export type RequestType = (typeof REQUEST_TYPES)[number];

const RequestSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },

    type: { type: String, enum: REQUEST_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: String,

    raisedBy: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    raisedByName: String,
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    assignedToName: String,

    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
      index: true,
    },
    decision: String,
    decidedAt: Date,
    decidedBy: { type: Schema.Types.ObjectId, ref: "User" },

    leadId: { type: Schema.Types.ObjectId, ref: "Lead", index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    payload: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

RequestSchema.index({ workspaceId: 1, status: 1, createdAt: -1 });

export type RequestDoc = InferSchemaType<typeof RequestSchema> & {
  _id: mongoose.Types.ObjectId;
};

const RequestModel =
  (mongoose.models.Request as Model<RequestDoc>) ||
  mongoose.model<RequestDoc>("Request", RequestSchema);

export default RequestModel;
