import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PaymentSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    bookingId: { type: Schema.Types.ObjectId, ref: "Booking", index: true },
    type: { type: String, default: "receipt" },
    paymentFor: String,
    date: { type: Date, default: Date.now, index: true },
    customerName: String,
    ledgerAccount: String,
    paymentType: {
      type: String,
      enum: ["cash", "cheque", "neft", "rtgs", "upi", "card", "other"],
      default: "neft",
    },
    bankDetails: String,
    netAmount: { type: Number, default: 0 },
    tds: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 },
    totalAmount: { type: Number, default: 0 },
    finalAmount: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

PaymentSchema.index({ workspaceId: 1, date: -1 });

export type PaymentDoc = InferSchemaType<typeof PaymentSchema> & {
  _id: mongoose.Types.ObjectId;
};

const Payment =
  (mongoose.models.Payment as Model<PaymentDoc>) ||
  mongoose.model<PaymentDoc>("Payment", PaymentSchema);

export default Payment;
