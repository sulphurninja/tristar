import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * Stage keys are now driven by the Pipeline a lead belongs to (see
 * `src/models/Pipeline.ts`). The list below is purely a reference of the keys
 * used by the seeded default pipeline so reports/dashboards that need a
 * canonical stage vocabulary still have one. Keys remain free-form strings on
 * the lead so workspaces can define custom pipelines and stages.
 */
export const DEFAULT_LEAD_STAGE_KEYS = [
  "new",
  "attempted_1",
  "attempted_2",
  "warm",
  "hot",
  "interested",
  "not_interested",
  "site_visit_scheduled",
  "site_visit_done",
  "negotiating",
  "booked",
  "lost",
  "switched_off",
  "cnr",
  "cnc",
  "duplicate",
  "junk",
] as const;

/** @deprecated use Pipeline.stages — kept as alias for backwards compatibility. */
export const LEAD_STAGES = DEFAULT_LEAD_STAGE_KEYS;

export type LeadStage = (typeof DEFAULT_LEAD_STAGE_KEYS)[number] | string;

const PreferenceSchema = new Schema(
  {
    propertyType: [{ type: String }],
    configurations: [{ type: String }],            // ["2BHK","3BHK"]
    minBudget: Number,
    maxBudget: Number,
    currency: { type: String, default: "INR" },
    localities: [{ type: String }],
    cities: [{ type: String }],
    minArea: Number,
    maxArea: Number,
    areaUnit: { type: String, enum: ["sqft", "sqm", "sqyd", "acre"], default: "sqft" },
    facing: [{ type: String }],
    possession: { type: String, enum: ["any", "ready", "0-1y", "1-2y", "2-3y", "3y+"], default: "any" },
    purpose: { type: String, enum: ["self_use", "investment", "rental", "any"], default: "any" },
    occupation: String,
    funding: { type: String, enum: ["self", "loan", "company", "nri", "any"], default: "any" },
  },
  { _id: false },
);

const ScoreSchema = new Schema(
  {
    value: { type: Number, default: 0, min: 0, max: 100 },
    label: { type: String, enum: ["cold", "warm", "hot", "scorching"], default: "cold" },
    factors: [{ key: String, weight: Number, value: Number }],
    closeProbability: { type: Number, default: 0, min: 0, max: 1 },
    lastComputedAt: Date,
  },
  { _id: false },
);

const SourceSchema = new Schema(
  {
    primary: {
      type: String,
      // Free-form so workspace-defined Sources (Source model) are valid keys.
      default: "other",
      index: true,
    },
    subSource: String,
    campaign: String,
    medium: String,
    utm: {
      source: String,
      medium: String,
      campaign: String,
      term: String,
      content: String,
    },
    landingUrl: String,
    referrerUrl: String,
    capturedAt: Date,
  },
  { _id: false },
);

const ContactSchema = new Schema(
  {
    salutation: String,
    firstName: String,
    lastName: String,
    name: { type: String, required: true, index: true },
    primaryPhone: { type: String, required: true, index: true },
    altPhone: String,
    email: { type: String, lowercase: true, trim: true, index: true },
    whatsappOptIn: { type: Boolean, default: true },
    emailOptIn: { type: Boolean, default: true },
    smsOptIn: { type: Boolean, default: true },
    language: { type: String, default: "en" },
  },
  { _id: false },
);

const LeadSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    leadNumber: { type: String, index: true },     // human-friendly e.g. TS-2026-00012
    contact: { type: ContactSchema, required: true },

    interestedProjects: [{ type: Schema.Types.ObjectId, ref: "Project", index: true }],
    primaryProjectId: { type: Schema.Types.ObjectId, ref: "Project", index: true },
    interestedUnits: [{ type: Schema.Types.ObjectId, ref: "Unit" }],
    preferences: PreferenceSchema,

    /** Pipeline this lead lives in. Stage values are scoped to this pipeline's stages. */
    pipelineId: { type: Schema.Types.ObjectId, ref: "Pipeline", index: true },
    /** Stage key inside the lead's pipeline — free-form, validated at write time. */
    stage: { type: String, default: "new", index: true },
    subStatus: String,
    priority: { type: String, enum: ["low", "medium", "high", "vip"], default: "medium", index: true },

    source: SourceSchema,
    brokerId: { type: Schema.Types.ObjectId, ref: "Broker", index: true },
    brokerName: String,
    referredBy: { type: Schema.Types.ObjectId, ref: "Lead" },

    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    assignedAt: Date,
    teamId: { type: Schema.Types.ObjectId, ref: "Team" },

    score: ScoreSchema,
    nextActionAt: { type: Date, index: true },
    nextActionType: { type: String, enum: ["call", "whatsapp", "email", "sms", "site_visit", "meeting"], default: "call" },
    nextActionNote: String,

    lastContactedAt: Date,
    lastContactChannel: { type: String, enum: ["call", "whatsapp", "email", "sms", "site_visit", "meeting"] },
    lastResponseAt: Date,

    description: String,
    /** "Lead Category" select in the Lead Information drawer. */
    category: String,
    stageReason: String,
    country: String,
    /** "Lead Details (New)" form extras. */
    alternateNumbers: [{ type: String }],
    visitorType: String,
    address: String,
    dateOfBirth: Date,
    dateOfAnniversary: Date,
    isRelatedSource: { type: Boolean, default: false },
    sourcingManagerId: { type: Schema.Types.ObjectId, ref: "User" },
    /** Pre-sales agent (qualifies the lead before it reaches the sales owner). */
    preSalesAgentId: { type: Schema.Types.ObjectId, ref: "User", index: true },
    /** Additional owners besides `assignedTo` (Add Owner / Remove Lead Owner). */
    coOwners: [{ type: Schema.Types.ObjectId, ref: "User" }],
    /** When the channel partner was tagged to this lead (drives "CP tag remaining days"). */
    cpTaggedAt: Date,
    interestedProperties: [{ type: Schema.Types.ObjectId, ref: "Property" }],
    employment: {
      company: String,
      type: String,
      designation: String,
      income: Number,
    },
    otherDetails: {
      ethnicity: String,
      loan: { type: String, enum: ["Yes", "No"], default: "No" },
    },
    /** Requirements form on the Suggestion tab. */
    requirement: {
      budgetMin: Number,
      budgetMax: Number,
      areaMin: Number,
      areaMax: Number,
      requirementType: String,
      propertyType: String,
      subType: String,
      unitTypes: [{ type: String }],
      searchLocation: String,
      streetAddress: String,
      location: String,
      subLocation: String,
    },
    tags: [{ type: String, index: true }],
    documents: [
      {
        name: { type: String, required: true },
        url: { type: String, required: true },
        mimeType: String,
        size: Number,
        uploadedAt: { type: Date, default: Date.now },
        uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
      },
    ],
    customFields: { type: Schema.Types.Mixed },

    isHot: { type: Boolean, default: false, index: true },
    isBooked: { type: Boolean, default: false, index: true },
    isInactive: { type: Boolean, default: false, index: true },
    isDuplicate: { type: Boolean, default: false, index: true },
    /** "Convert To Contact" — contact records live in CRM → Contacts rather than the lead pool. */
    isContact: { type: Boolean, default: false, index: true },
    contactStatus: { type: String, enum: ["lead", "unqualified"], default: "lead" },
    convertedToContactAt: Date,
    /** Re-enquiry flag — set when a known number comes back in. */
    isReturning: { type: Boolean, default: false, index: true },
    duplicateOf: { type: Schema.Types.ObjectId, ref: "Lead" },

    convertedAt: Date,
    lostAt: Date,
    lostReason: String,

    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

LeadSchema.index({ workspaceId: 1, "contact.primaryPhone": 1 });
LeadSchema.index({ workspaceId: 1, stage: 1, assignedTo: 1 });
LeadSchema.index({ workspaceId: 1, pipelineId: 1, stage: 1 });
LeadSchema.index({ workspaceId: 1, createdAt: -1 });
LeadSchema.index({ workspaceId: 1, nextActionAt: 1 });
LeadSchema.index({ workspaceId: 1, isContact: 1, createdAt: -1 });
LeadSchema.index({ workspaceId: 1, assignedAt: -1 });

export type LeadDoc = InferSchemaType<typeof LeadSchema> & { _id: mongoose.Types.ObjectId };

// Dev hot-reload keeps the first compiled model; recompile if the schema grew.
if (mongoose.models.Lead && !mongoose.models.Lead.schema.path("visitorType")) mongoose.deleteModel("Lead");

const Lead = (mongoose.models.Lead as Model<LeadDoc>) || mongoose.model<LeadDoc>("Lead", LeadSchema);

export default Lead;
