import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

/**
 * A Pipeline is a workflow (e.g. "Residential Sales", "Resale", "Rental") that
 * a lead moves through. Each pipeline has its own ordered list of stages.
 *
 * Stages have a `key` (a stable string identifier used by leads) and a `label`
 * (the display name). They also have a `type` of "open" | "won" | "lost" so
 * reports/dashboards can roll them up regardless of pipeline.
 */
export const STAGE_TYPES = ["open", "won", "lost"] as const;
export type StageType = (typeof STAGE_TYPES)[number];

const StageSchema = new Schema(
  {
    key: { type: String, required: true, trim: true },          // e.g. "new", "qualified"
    label: { type: String, required: true, trim: true },        // e.g. "New", "Qualified"
    description: { type: String, trim: true },
    order: { type: Number, default: 0, index: true },
    type: { type: String, enum: STAGE_TYPES, default: "open", index: true },
    /** Probability (%) of closing won when the lead is in this stage. */
    probability: { type: Number, min: 0, max: 100, default: 0 },
    /** Tailwind-friendly accent colour, e.g. "emerald" | "sky" | "amber" | "violet". */
    color: { type: String, default: "slate" },
    /** Stages that are part of the system (e.g. seeded defaults) cannot be deleted. */
    isSystem: { type: Boolean, default: false },
  },
  { _id: true, timestamps: false },
);

const PipelineSchema = new Schema(
  {
    workspaceId: {
      type: Schema.Types.ObjectId,
      ref: "Workspace",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    isDefault: { type: Boolean, default: false, index: true },
    isActive: { type: Boolean, default: true, index: true },
    /** Used as a fallback colour for stages that don't define one. */
    accent: { type: String, default: "emerald" },
    stages: { type: [StageSchema], default: [] },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

PipelineSchema.index({ workspaceId: 1, name: 1 }, { unique: true });
PipelineSchema.index({ workspaceId: 1, isDefault: 1 });

export type PipelineDoc = InferSchemaType<typeof PipelineSchema> & {
  _id: mongoose.Types.ObjectId;
};

export type StageDoc = NonNullable<PipelineDoc["stages"]>[number] & {
  _id: mongoose.Types.ObjectId;
};

const Pipeline =
  (mongoose.models.Pipeline as Model<PipelineDoc>) ||
  mongoose.model<PipelineDoc>("Pipeline", PipelineSchema);

export default Pipeline;

/* ------------------------------ Default seed ----------------------------- */

/**
 * The stages that ship with a brand-new Tristar workspace. The keys preserve
 * backwards-compat with the previous hard-coded `LEAD_STAGES` array so
 * existing reports and queries keep working unchanged.
 */
export const DEFAULT_STAGES: Array<{
  key: string;
  label: string;
  type: StageType;
  probability: number;
  color: string;
  isSystem?: boolean;
}> = [
  { key: "new", label: "New", type: "open", probability: 5, color: "slate", isSystem: true },
  {
    key: "attempted_1",
    label: "Attempted - 1",
    type: "open",
    probability: 8,
    color: "slate",
  },
  {
    key: "attempted_2",
    label: "Attempted - 2",
    type: "open",
    probability: 10,
    color: "slate",
  },
  { key: "warm", label: "Warm", type: "open", probability: 25, color: "sky" },
  { key: "hot", label: "Hot", type: "open", probability: 50, color: "amber" },
  { key: "interested", label: "Interested", type: "open", probability: 35, color: "indigo" },
  {
    key: "site_visit_scheduled",
    label: "Site Visit Scheduled",
    type: "open",
    probability: 60,
    color: "violet",
  },
  {
    key: "site_visit_done",
    label: "Site Visit Done",
    type: "open",
    probability: 70,
    color: "violet",
  },
  {
    key: "negotiating",
    label: "Negotiating",
    type: "open",
    probability: 80,
    color: "orange",
  },
  {
    key: "booked",
    label: "Booked",
    type: "won",
    probability: 100,
    color: "emerald",
    isSystem: true,
  },
  { key: "lost", label: "Lost", type: "lost", probability: 0, color: "rose", isSystem: true },
  {
    key: "not_interested",
    label: "Not Interested",
    type: "lost",
    probability: 0,
    color: "rose",
  },
];

/**
 * Ensures the workspace has at least one pipeline. Creates a "Tristar Sales
 * Pipeline" (default) if no pipelines exist yet. Also back-fills any leads
 * created before pipelines existed so they show up on the Kanban. Idempotent.
 */
export async function ensureDefaultPipeline(
  workspaceId: mongoose.Types.ObjectId | string,
  createdBy?: mongoose.Types.ObjectId | string,
) {
  const wsId =
    typeof workspaceId === "string"
      ? new mongoose.Types.ObjectId(workspaceId)
      : workspaceId;

  let pipeline =
    (await Pipeline.findOne({ workspaceId: wsId, isDefault: true })) ??
    (await Pipeline.findOne({ workspaceId: wsId }));

  if (!pipeline) {
    pipeline = await Pipeline.create({
      workspaceId: wsId,
      name: "Tristar Sales Pipeline",
      description:
        "Default residential sales workflow. Leads flow from first contact through site visit, negotiation, and booking.",
      isDefault: true,
      isActive: true,
      accent: "emerald",
      stages: DEFAULT_STAGES.map((s, idx) => ({ ...s, order: idx })),
      createdBy: createdBy
        ? typeof createdBy === "string"
          ? new mongoose.Types.ObjectId(createdBy)
          : createdBy
        : undefined,
    });
  }

  /* Back-fill any leads in this workspace that don't yet have a pipelineId. */
  try {
    const Lead = mongoose.models.Lead;
    if (Lead) {
      await Lead.updateMany(
        { workspaceId: wsId, $or: [{ pipelineId: null }, { pipelineId: { $exists: false } }] },
        { $set: { pipelineId: pipeline._id } },
      );
    }
  } catch {
    /* not fatal — pipeline still exists */
  }

  return pipeline;
}
