import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const BrokerSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    firmName: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true, index: true },
    phone: { type: String, required: true, trim: true, index: true },
    altPhone: String,

    cpCode: { type: String, index: true },                    // Channel Partner code (your internal code)
    rmId: { type: Schema.Types.ObjectId, ref: "User" },       // Relationship Manager (internal)
    rmName: String,

    rera: {
      number: String,
      state: String,
      certificateUrl: String,
      verifiedAt: Date,
    },
    panNumber: String,
    gstNumber: String,
    bankAccount: {
      accountHolder: String,
      accountNumber: { type: String, select: false },
      ifsc: String,
      bankName: String,
    },

    location: {
      addressLine: String,
      locality: String,
      city: String,
      state: String,
      pincode: String,
      country: { type: String, default: "IN" },
    },

    activeProjects: [{ type: Schema.Types.ObjectId, ref: "Project" }],
    commissionSlabs: [
      {
        projectId: { type: Schema.Types.ObjectId, ref: "Project" },
        type: { type: String, enum: ["flat", "percentage", "tiered"], default: "percentage" },
        flatAmount: Number,
        percentage: Number,
        tiers: [{ min: Number, max: Number, value: Number }],
        currency: { type: String, default: "INR" },
      },
    ],

    portalAccessEnabled: { type: Boolean, default: false },
    portalUserId: { type: Schema.Types.ObjectId, ref: "User" },

    status: { type: String, enum: ["active", "blacklisted", "inactive", "pending_kyc"], default: "active", index: true },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalLeadsReferred: { type: Number, default: 0 },
    totalDealsBooked: { type: Number, default: 0 },
    totalCommissionEarned: { type: Number, default: 0 },
    totalCommissionPaid: { type: Number, default: 0 },

    notes: String,
    tags: [{ type: String }],
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

BrokerSchema.index({ workspaceId: 1, phone: 1 }, { unique: true });
BrokerSchema.index({ workspaceId: 1, name: "text", firmName: "text" });

export type BrokerDoc = InferSchemaType<typeof BrokerSchema> & { _id: mongoose.Types.ObjectId };

const Broker = (mongoose.models.Broker as Model<BrokerDoc>) || mongoose.model<BrokerDoc>("Broker", BrokerSchema);

export default Broker;
