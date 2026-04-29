import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const ProjectAssetSchema = new Schema(
  {
    type: { type: String, enum: ["image", "video", "brochure", "floor_plan", "walkthrough", "other"], required: true },
    url: { type: String, required: true },
    label: String,
    width: Number,
    height: Number,
    durationSec: Number,
    isPrimary: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true },
);

const RERASchema = new Schema(
  {
    number: String,
    state: String,
    issuedOn: Date,
    expiresOn: Date,
    certificateUrl: String,
    verifiedAt: Date,
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { _id: false },
);

const LocationSchema = new Schema(
  {
    addressLine: String,
    locality: String,
    city: String,
    state: String,
    country: { type: String, default: "IN" },
    pincode: String,
    lat: Number,
    lng: Number,
    landmark: String,
  },
  { _id: false },
);

const PriceRangeSchema = new Schema(
  {
    currency: { type: String, default: "INR" },
    min: Number,
    max: Number,
    perSqFt: Number,
  },
  { _id: false },
);

const ProjectSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    code: { type: String, required: true, trim: true, index: true },
    name: { type: String, required: true, trim: true, index: true },
    builderName: String,
    builderId: { type: Schema.Types.ObjectId, ref: "Builder" },

    propertyType: {
      type: String,
      enum: [
        "residential_apartment",
        "residential_villa",
        "residential_plot",
        "residential_independent_house",
        "commercial_office",
        "commercial_retail",
        "commercial_warehouse",
        "industrial",
        "mixed_use",
        "farmland",
        "other",
      ],
      default: "residential_apartment",
      index: true,
    },
    configurations: [{ type: String }],            // e.g. ["1BHK","2BHK","3BHK","4BHK","Studio"]
    saleStage: {
      type: String,
      enum: ["pre_launch", "launching_soon", "ready_to_move", "under_construction", "resale", "sold_out"],
      default: "under_construction",
      index: true,
    },
    possessionDate: Date,
    rera: RERASchema,
    location: LocationSchema,
    priceRange: PriceRangeSchema,
    totalUnits: Number,
    availableUnits: Number,
    amenities: [{ type: String }],
    highlights: [{ type: String }],
    description: String,
    assets: [ProjectAssetSchema],

    isActive: { type: Boolean, default: true, index: true },
    archived: { type: Boolean, default: false, index: true },
    tags: [{ type: String }],

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

ProjectSchema.index({ workspaceId: 1, code: 1 }, { unique: true });
ProjectSchema.index({ workspaceId: 1, name: "text", "location.city": "text", "location.locality": "text" });

export type ProjectDoc = InferSchemaType<typeof ProjectSchema> & { _id: mongoose.Types.ObjectId };

const Project = (mongoose.models.Project as Model<ProjectDoc>) || mongoose.model<ProjectDoc>("Project", ProjectSchema);

export default Project;
