import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const BrandingSchema = new Schema(
  {
    logoUrl: String,
    favIconUrl: String,
    primaryColor: { type: String, default: "#0F8F60" },
    secondaryColor: { type: String, default: "#2563EB" },
    customDomain: String,
    senderEmail: String,
    senderName: String,
  },
  { _id: false },
);

const ComplianceSchema = new Schema(
  {
    reraNumber: String,
    reraCertUrl: String,
    gstNumber: String,
    panNumber: String,
    companyName: String,
    addressLine1: String,
    addressLine2: String,
    city: String,
    state: String,
    pincode: String,
    country: { type: String, default: "IN" },
  },
  { _id: false },
);

const WorkspaceSchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, index: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["agency", "builder", "channel_partner_network", "individual_broker", "other"],
      default: "builder",
    },
    region: {
      type: String,
      enum: ["IN", "ME", "SEA", "EU", "US", "OTHER"],
      default: "IN",
    },
    timezone: { type: String, default: "Asia/Kolkata" },
    currency: { type: String, default: "INR" },
    plan: {
      type: String,
      enum: ["trial", "starter", "growth", "enterprise"],
      default: "trial",
    },
    trialEndsAt: { type: Date, default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
    branding: { type: BrandingSchema, default: () => ({}) },
    compliance: { type: ComplianceSchema, default: () => ({}) },
    onboardingCompleted: { type: Boolean, default: false },
    onboardingStep: { type: String, default: "workspace" },
    seats: { type: Number, default: 25 },
    /** Customised role templates: { [role]: { permissions: string[], scope } }. Unset roles use ROLE_DEFAULTS. */
    rolePermissions: { type: Schema.Types.Mixed },
    /** Which "New lead" fields are hidden / optional / required (lib/lead-form). */
    leadFormConfig: { type: Schema.Types.Mixed },
    /** Reception kiosk form, project desks and options (lib/reception-config). */
    receptionConfig: { type: Schema.Types.Mixed },
    leadCap: { type: Number, default: 100000 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

WorkspaceSchema.index({ createdBy: 1 });

export type WorkspaceDoc = InferSchemaType<typeof WorkspaceSchema> & {
  _id: mongoose.Types.ObjectId;
};

const Workspace =
  (mongoose.models.Workspace as Model<WorkspaceDoc>) ||
  mongoose.model<WorkspaceDoc>("Workspace", WorkspaceSchema);

export default Workspace;
