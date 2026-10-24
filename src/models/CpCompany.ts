import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/** Channel Partner Company — a firm that one or more channel partners belong to. */
const CpCompanySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    /** Human-facing sequential company id (Buildesk "COMPANY ID"). */
    companyId: { type: Number, required: true },
    name: { type: String, required: true, trim: true },
    owner: { type: String, trim: true },
    mobile: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    category: { type: String, trim: true },
    reraNumber: { type: String, trim: true },
    address: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

CpCompanySchema.index({ workspaceId: 1, companyId: 1 }, { unique: true });
CpCompanySchema.index({ workspaceId: 1, name: 1 });

export type CpCompanyDoc = InferSchemaType<typeof CpCompanySchema> & { _id: mongoose.Types.ObjectId };

const CpCompany =
  (mongoose.models.CpCompany as Model<CpCompanyDoc>) ||
  mongoose.model<CpCompanyDoc>("CpCompany", CpCompanySchema);

export default CpCompany;
