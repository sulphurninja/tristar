import mongoose from "mongoose";
import { z } from "zod";
import Pipeline, { STAGE_TYPES } from "@/models/Pipeline";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole, type Role } from "@/lib/auth";

/* ---------- POST /api/pipelines/[id]/stages — add stage ---------- */

const AddStageSchema = z.object({
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
  /** Insert at this index, or append by default. */
  position: z.number().int().min(0).optional(),
});

export const POST = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!hasRole(session.role as Role, "admin")) {
    return bad("Only admins can edit pipelines.", 403);
  }
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid pipeline id");

  const parsed = AddStageSchema.safeParse(await req.json());
  if (!parsed.success) {
    return bad(
      Object.values(parsed.error.flatten().fieldErrors).flat().join("; ") ||
        "Invalid input",
    );
  }

  const pipeline = await Pipeline.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  });
  if (!pipeline) return bad("Pipeline not found", 404);

  if (pipeline.stages?.some((s) => s.key === parsed.data.key)) {
    return bad("A stage with this key already exists in this pipeline.");
  }

  const data = parsed.data;
  const newStage = {
    key: data.key.trim(),
    label: data.label.trim(),
    description: data.description?.trim(),
    type: data.type,
    probability: data.probability,
    color: data.color,
    isSystem: false,
  };

  const current = (pipeline.stages ?? []).map((s) => {
    const obj = (s as { toObject?: () => Record<string, unknown> }).toObject?.() ?? s;
    return obj as Record<string, unknown>;
  });
  const insertAt =
    typeof data.position === "number" && data.position >= 0 && data.position <= current.length
      ? data.position
      : current.length;
  current.splice(insertAt, 0, newStage as Record<string, unknown>);
  const reordered = current.map((s, idx) => ({ ...s, order: idx }));
  pipeline.set("stages", reordered);

  await pipeline.save();
  return ok({ pipeline });
});
