import mongoose from "mongoose";
import { z } from "zod";
import Pipeline, { STAGE_TYPES } from "@/models/Pipeline";
import Lead from "@/models/Lead";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole, type Role } from "@/lib/auth";

/* ---------- PATCH /api/pipelines/[id]/stages/[stageId] ---------- */

const UpdateStage = z.object({
  label: z.string().min(1).max(80).optional(),
  description: z.string().max(240).optional(),
  type: z.enum(STAGE_TYPES).optional(),
  probability: z.number().min(0).max(100).optional(),
  color: z.string().max(40).optional(),
});

export const PATCH = withAuth<{ id: string; stageId: string }>(
  async ({ req, session, params }) => {
    if (!hasRole(session.role as Role, "admin")) {
      return bad("Only admins can edit pipelines.", 403);
    }
    if (!mongoose.isValidObjectId(params.id)) return bad("Invalid pipeline id");
    if (!mongoose.isValidObjectId(params.stageId)) return bad("Invalid stage id");

    const parsed = UpdateStage.safeParse(await req.json());
    if (!parsed.success) return bad("Invalid input");

    const pipeline = await Pipeline.findOne({
      _id: params.id,
      workspaceId: session.workspaceId,
    });
    if (!pipeline) return bad("Pipeline not found", 404);

    const stage = pipeline.stages?.find(
      (s) => String((s as { _id: unknown })._id) === params.stageId,
    );
    if (!stage) return bad("Stage not found", 404);

    const d = parsed.data;
    if (d.label !== undefined) stage.label = d.label.trim();
    if (d.description !== undefined) stage.description = d.description.trim();
    if (d.type !== undefined) stage.type = d.type;
    if (d.probability !== undefined) stage.probability = d.probability;
    if (d.color !== undefined) stage.color = d.color;

    await pipeline.save();
    return ok({ pipeline });
  },
);

/* ---------- DELETE /api/pipelines/[id]/stages/[stageId] ---------- */

export const DELETE = withAuth<{ id: string; stageId: string }>(
  async ({ session, params }) => {
    if (!hasRole(session.role as Role, "admin")) {
      return bad("Only admins can edit pipelines.", 403);
    }
    if (!mongoose.isValidObjectId(params.id)) return bad("Invalid pipeline id");
    if (!mongoose.isValidObjectId(params.stageId)) return bad("Invalid stage id");

    const pipeline = await Pipeline.findOne({
      _id: params.id,
      workspaceId: session.workspaceId,
    });
    if (!pipeline) return bad("Pipeline not found", 404);

    const stage = pipeline.stages?.find(
      (s) => String((s as { _id: unknown })._id) === params.stageId,
    );
    if (!stage) return bad("Stage not found", 404);

    if (stage.isSystem) {
      return bad("This is a system stage and cannot be deleted.");
    }

    const usedCount = await Lead.countDocuments({
      workspaceId: session.workspaceId,
      pipelineId: pipeline._id,
      stage: stage.key,
    });
    if (usedCount > 0) {
      return bad(
        `Cannot delete this stage — ${usedCount} lead${usedCount === 1 ? " is" : "s are"} currently in it. Move them to another stage first.`,
      );
    }

    const remaining = (pipeline.stages ?? [])
      .filter((s) => String((s as { _id: unknown })._id) !== params.stageId)
      .map((s, idx) => {
        const obj =
          (s as { toObject?: () => Record<string, unknown> }).toObject?.() ?? s;
        return { ...obj, order: idx };
      });
    pipeline.set("stages", remaining);

    await pipeline.save();
    return ok({ pipeline });
  },
);
