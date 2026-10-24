import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const BookingSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    propertyId: { type: Schema.Types.ObjectId, ref: "Property" },
    bookingNumber: String,
    customerName: String,
    amount: { type: Number, default: 0 },
    currency: { type: String, default: "INR" },
    stage: { type: String, default: "booked", index: true },
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected", "all"],
      default: "pending",
      index: true,
    },
    salesAgentId: { type: Schema.Types.ObjectId, ref: "User" },
    preSalesAgentId: { type: Schema.Types.ObjectId, ref: "User" },
    sourcingManagerId: { type: Schema.Types.ObjectId, ref: "User" },
    brokerId: { type: Schema.Types.ObjectId, ref: "Broker" },
    source: String,
    bookedAt: { type: Date, default: Date.now },
    notes: String,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

BookingSchema.index({ workspaceId: 1, bookedAt: -1 });

export type BookingDoc = InferSchemaType<typeof BookingSchema> & {
  _id: mongoose.Types.ObjectId;
};

if (process.env.NODE_ENV !== "production") delete mongoose.models.Booking;

const Booking =
  (mongoose.models.Booking as Model<BookingDoc>) ||
  mongoose.model<BookingDoc>("Booking", BookingSchema);

export default Booking;
