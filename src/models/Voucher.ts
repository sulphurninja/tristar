import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const VoucherSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    voucherNumber: String,
    type: {
      type: String,
      enum: ["receipt", "payment", "journal", "contra"],
      default: "receipt",
    },
    date: { type: Date, default: Date.now, index: true },
    paymentMode: {
      type: String,
      enum: ["cash", "cheque", "neft", "rtgs", "upi", "card", "other"],
      default: "neft",
    },
    /** Primary / from account */
    ledgerId: { type: Schema.Types.ObjectId, ref: "Ledger" },
    fromLedgerId: { type: Schema.Types.ObjectId, ref: "Ledger" },
    toLedgerId: { type: Schema.Types.ObjectId, ref: "Ledger" },
    amount: { type: Number, default: 0 },
    tdsPercent: { type: Number, default: 0 },
    tdsAmount: { type: Number, default: 0 },
    taxType: {
      type: String,
      enum: ["none", "gst_5", "gst_12", "gst_18", "gst_28", "igst_18"],
      default: "none",
    },
    taxAmount: { type: Number, default: 0 },
    /** amount - TDS + tax: the value posted Dr to "To" / Cr from "From". */
    totalAmount: { type: Number, default: 0 },
    narration: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

VoucherSchema.index({ workspaceId: 1, date: -1 });

export type VoucherDoc = InferSchemaType<typeof VoucherSchema> & {
  _id: mongoose.Types.ObjectId;
};

if (process.env.NODE_ENV !== "production") delete mongoose.models.Voucher;

const Voucher =
  (mongoose.models.Voucher as Model<VoucherDoc>) ||
  mongoose.model<VoucherDoc>("Voucher", VoucherSchema);

export default Voucher;
