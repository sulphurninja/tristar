import mongoose from "mongoose";
import { z } from "zod";
import Pipeline from "@/models/Pipeline";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole, type Role } from "@/lib/auth";

/* ---------- POST /api/pipelines/[id]/stages/reorder ---------- */

const Schema = z.object({
  /** Ordered list of stageId strings — order in array becomes the new stage order. */
  stageIds: z.array(z.string()).min(1),
});

export const POST = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!hasRole(session.role as Role, "admin")) {
    return bad("Only admins can reorder stages.", 403);
  }
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid pipeline id");

  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return bad("Invalid input");

  const pipeline = await Pipeline.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  });
  if (!pipeline) return bad("Pipeline not found", 404);

  const order = parsed.data.stageIds;
  const lookup = new Map(
    (pipeline.stages ?? []).map((s) => [String((s as { _id: unknown })._id), s]),
  );

  if (order.length !== lookup.size || order.some((id) => !lookup.has(id))) {
    return bad("Reorder list does not match the pipeline's current stages.");
  }

  const reordered = order.map((id, idx) => {
    const s = lookup.get(id)!;
    const obj = (s as { toObject?: () => Record<string, unknown> }).toObject?.() ?? s;
    return { ...obj, order: idx };
  });
  pipeline.set("stages", reordered);

  await pipeline.save();
  return ok({ pipeline });
});
