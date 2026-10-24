import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const RECEPTION_PURPOSES = ["new_enquiry", "site_visit", "meeting", "cp_visit", "other"] as const;
export const RECEPTION_STATUSES = ["waiting", "met", "completed", "left"] as const;

/**
 * CRM → Reception: walk-in visitor registry. The `receptions` collection
 * already exists in the database (indexed on workspaceId / visitorName /
 * visitorPhone / visitStatus / visitDate / projectName) but was empty and had
 * no model, so field names follow those indexes. Indexes are managed in the
 * DB, hence autoIndex is off.
 */
const ReceptionSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    visitorName: { type: String, required: true, trim: true },
    visitorPhone: { type: String, required: true, trim: true },
    visitorEmail: { type: String, trim: true, lowercase: true },
    visitorCount: { type: Number, default: 1, min: 1 },
    purpose: { type: String, enum: RECEPTION_PURPOSES, default: "new_enquiry" },
    projectId: { type: Schema.Types.ObjectId, ref: "Project" },
    projectName: String,
    meetWith: { type: Schema.Types.ObjectId, ref: "User" },
    meetWithName: String,
    source: { type: String, default: "walkin" },
    visitStatus: { type: String, enum: RECEPTION_STATUSES, default: "waiting" },
    visitDate: { type: Date, default: Date.now },
    checkInAt: { type: Date, default: Date.now },
    metAt: Date,
    checkOutAt: Date,
    leadId: { type: Schema.Types.ObjectId, ref: "Lead" },
    remarks: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true, autoIndex: false },
);

export type ReceptionDoc = InferSchemaType<typeof ReceptionSchema> & { _id: mongoose.Types.ObjectId };

const Reception =
  (mongoose.models.Reception as Model<ReceptionDoc>) ||
  mongoose.model<ReceptionDoc>("Reception", ReceptionSchema, "receptions");

export default Reception;
