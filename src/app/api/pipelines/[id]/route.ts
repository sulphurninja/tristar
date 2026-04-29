import mongoose from "mongoose";
import { z } from "zod";
import Pipeline from "@/models/Pipeline";
import Lead from "@/models/Lead";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole, type Role } from "@/lib/auth";

/* ---------- GET /api/pipelines/[id] ---------- */

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid pipeline id");
  const pipeline = await Pipeline.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  }).lean();
  if (!pipeline) return bad("Pipeline not found", 404);

  const counts = await Lead.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        workspaceId: new mongoose.Types.ObjectId(session.workspaceId),
        pipelineId: pipeline._id,
      },
    },
    { $group: { _id: "$stage", count: { $sum: 1 } } },
  ]);
  const stageCounts: Record<string, number> = {};
  for (const c of counts) stageCounts[c._id] = c.count;

  return ok({ pipeline, stageCounts });
});

/* ---------- PATCH /api/pipelines/[id] ---------- */

const PatchSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  accent: z.string().max(40).optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!hasRole(session.role as Role, "admin")) {
    return bad("Only admins can update pipelines.", 403);
  }
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid pipeline id");

  const parsed = PatchSchema.safeParse(await req.json());
  if (!parsed.success) return bad("Invalid input");

  const wsId = new mongoose.Types.ObjectId(session.workspaceId);
  const pipeline = await Pipeline.findOne({ _id: params.id, workspaceId: wsId });
  if (!pipeline) return bad("Pipeline not found", 404);

  const data = parsed.data;
  if (data.name !== undefined) pipeline.name = data.name.trim();
  if (data.description !== undefined) pipeline.description = data.description.trim();
  if (data.accent !== undefined) pipeline.accent = data.accent;
  if (data.isActive !== undefined) pipeline.isActive = data.isActive;

  if (data.isDefault === true) {
    await Pipeline.updateMany(
      { workspaceId: wsId, _id: { $ne: pipeline._id }, isDefault: true },
      { $set: { isDefault: false } },
    );
    pipeline.isDefault = true;
  } else if (data.isDefault === false) {
    pipeline.isDefault = false;
  }

  try {
    await pipeline.save();
  } catch (err) {
    if (err instanceof Error && err.message.includes("E11000")) {
      return bad("Another pipeline with this name already exists.");
    }
    throw err;
  }

  return ok({ pipeline });
});

/* ---------- DELETE /api/pipelines/[id] ---------- */

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!hasRole(session.role as Role, "admin")) {
    return bad("Only admins can delete pipelines.", 403);
  }
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid pipeline id");

  const wsId = new mongoose.Types.ObjectId(session.workspaceId);
  const pipeline = await Pipeline.findOne({ _id: params.id, workspaceId: wsId });
  if (!pipeline) return bad("Pipeline not found", 404);

  if (pipeline.isDefault) {
    return bad(
      "This is the default pipeline. Mark another pipeline as default before deleting it.",
    );
  }

  const leadCount = await Lead.countDocuments({
    workspaceId: wsId,
    pipelineId: pipeline._id,
  });
  if (leadCount > 0) {
    return bad(
      `Cannot delete this pipeline — it currently has ${leadCount} lead${leadCount === 1 ? "" : "s"}. Move them to another pipeline first.`,
    );
  }

  await pipeline.deleteOne();
  return ok({ ok: true });
});
