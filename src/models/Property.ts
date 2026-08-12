import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const PropertySchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    projectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    propertyNumber: String,
    title: { type: String, required: true },
    inventoryType: { type: String, default: "residential" },
    location: String,
    city: String,
    visibility: { type: String, enum: ["public", "private", "internal"], default: "internal" },
    availableFor: { type: String, enum: ["sale", "rent", "both"], default: "sale" },
    floor: String,
    configuration: String,
    area: Number,
    areaUnit: { type: String, default: "sqft" },
    price: Number,
    status: {
      type: String,
      enum: ["available", "held", "booked", "sold", "unavailable"],
      default: "available",
      index: true,
    },
    ownerName: String,
    ownerEmail: String,
    ownerMobile: String,
    notes: String,
    images: [
      {
        url: { type: String, required: true },
        caption: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    timeline: [
      {
        text: { type: String, required: true },
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.Types.ObjectId, ref: "User" },
        createdByName: String,
      },
    ],
    expiryAt: Date,
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

PropertySchema.index({ workspaceId: 1, createdAt: -1 });

export type PropertyDoc = InferSchemaType<typeof PropertySchema> & {
  _id: mongoose.Types.ObjectId;
};

const Property =
  (mongoose.models.Property as Model<PropertyDoc>) ||
  mongoose.model<PropertyDoc>("Property", PropertySchema);

export default Property;
