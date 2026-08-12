import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const LedgerSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    name: { type: String, required: true },
    email: String,
    mobile: String,
    gstNo: String,
    openingBalance: { type: Number, default: 0 },
    /** Account group — maps to Buildesk "Group" */
    type: {
      type: String,
      enum: [
        "customer",
        "vendor",
        "broker",
        "bank",
        "cash",
        "direct_income",
        "direct_expense",
        "indirect_income",
        "indirect_expense",
        "other",
      ],
      default: "customer",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

LedgerSchema.index({ workspaceId: 1, name: 1 });

export type LedgerDoc = InferSchemaType<typeof LedgerSchema> & {
  _id: mongoose.Types.ObjectId;
};

const Ledger =
  (mongoose.models.Ledger as Model<LedgerDoc>) ||
  mongoose.model<LedgerDoc>("Ledger", LedgerSchema);

export default Ledger;
