import mongoose from "mongoose";
import { z } from "zod";
import Pipeline, { ensureDefaultPipeline, STAGE_TYPES } from "@/models/Pipeline";
import Lead from "@/models/Lead";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole, type Role } from "@/lib/auth";

/* ---------- GET /api/pipelines — list workspace pipelines ---------- */

export const GET = withAuth(async ({ session }) => {
  const wsId = new mongoose.Types.ObjectId(session.workspaceId);

  /* Auto-seed default pipeline if this is a fresh workspace. */
  await ensureDefaultPipeline(wsId, session.userId);

  const pipelines = await Pipeline.find({ workspaceId: wsId })
    .sort({ isDefault: -1, name: 1 })
    .lean();

  /* Quick lead-count rollup per pipeline + stage so the UI can show counts. */
  const counts = await Lead.aggregate<{
    _id: { pipelineId: mongoose.Types.ObjectId | null; stage: string };
    count: number;
  }>([
    { $match: { workspaceId: wsId } },
    { $group: { _id: { pipelineId: "$pipelineId", stage: "$stage" }, count: { $sum: 1 } } },
  ]);

  const countsByPipeline: Record<string, Record<string, number>> = {};
  for (const c of counts) {
    const pid = c._id.pipelineId ? String(c._id.pipelineId) : "none";
    countsByPipeline[pid] = countsByPipeline[pid] ?? {};
    countsByPipeline[pid][c._id.stage] = c.count;
  }

  return ok({ pipelines, counts: countsByPipeline });
});

/* ---------- POST /api/pipelines — create new pipeline ---------- */

const StageInput = z.object({
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9_\-]+$/, "Use lowercase letters, numbers, _ or - only"),
  label: z.string().min(1).max(80),
  description: z.string().max(240).optional(),
  type: z.enum(STAGE_TYPES).default("open"),
  probability: z.number().min(0).max(100).default(0),
  color: z.string().max(40).default("slate"),
});

const CreatePipeline = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional(),
  accent: z.string().max(40).optional(),
  isDefault: z.boolean().optional(),
  /** If omitted, three sensible starter stages are added. */
  stages: z.array(StageInput).max(40).optional(),
});

export const POST = withAuth(async ({ req, session }) => {
  if (!hasRole(session.role as Role, "admin")) {
    return bad("Only admins can create pipelines.", 403);
  }

  const parsed = CreatePipeline.safeParse(await req.json());
  if (!parsed.success) {
    return bad(parsed.error.flatten().formErrors.join("; ") || "Invalid input");
  }
  const data = parsed.data;
  const wsId = new mongoose.Types.ObjectId(session.workspaceId);

  /* Stage keys must be unique within the pipeline. */
  const stageInput = data.stages ?? [
    { key: "new", label: "New", type: "open" as const, probability: 5, color: "slate" },
    {
      key: "qualified",
      label: "Qualified",
      type: "open" as const,
      probability: 30,
      color: "sky",
    },
    {
      key: "won",
      label: "Won",
      type: "won" as const,
      probability: 100,
      color: "emerald",
    },
    { key: "lost", label: "Lost", type: "lost" as const, probability: 0, color: "rose" },
  ];

  const seen = new Set<string>();
  for (const s of stageInput) {
    if (seen.has(s.key)) return bad(`Duplicate stage key: ${s.key}`);
    seen.add(s.key);
  }

  /* If marking new pipeline as default, unmark the existing one. */
  if (data.isDefault) {
    await Pipeline.updateMany({ workspaceId: wsId, isDefault: true }, { $set: { isDefault: false } });
  }

  /* If no pipelines yet, the new one is automatically default. */
  const existingCount = await Pipeline.countDocuments({ workspaceId: wsId });

  try {
    const pipeline = await Pipeline.create({
      workspaceId: wsId,
      name: data.name.trim(),
      description: data.description?.trim(),
      accent: data.accent ?? "emerald",
      isDefault: existingCount === 0 ? true : Boolean(data.isDefault),
      stages: stageInput.map((s, idx) => ({ ...s, order: idx })),
      createdBy: new mongoose.Types.ObjectId(session.userId),
    });
    return ok({ pipeline }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message.includes("E11000")) {
      return bad("A pipeline with this name already exists.");
    }
    throw err;
  }
});
