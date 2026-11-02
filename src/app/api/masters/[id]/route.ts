import mongoose from "mongoose";
import Master from "@/models/Master";
import { withAuth, ok, bad } from "@/lib/api";
import { masterFields } from "@/lib/master-input";

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const b = (await req.json()) as Record<string, unknown>;
  const f = masterFields(b);

  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  for (const k of ["name", "code", "color", "description", "url", "min", "max"] as const) {
    if (!(k in b)) continue;
    if (f[k] === undefined) {
      if (k === "name") return bad("Name is required.");
      $unset[k] = 1;
    } else $set[k] = f[k];
  }
  if (typeof b.order === "number") $set.order = b.order;
  if (typeof b.isActive === "boolean") $set.isActive = b.isActive;

  const current = await Master.findOne({ _id: params.id, workspaceId }).select("type parentId").lean();
  if (!current) return bad("Not found.", 404);
  if (typeof $set.name === "string") {
    const clash = await Master.exists({
      workspaceId,
      type: current.type,
      parentId: current.parentId ?? null,
      _id: { $ne: current._id },
      name: { $regex: `^${($set.name as string).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
    if (clash) return bad("That name already exists in this list.", 409);
  }

  const item = await Master.findOneAndUpdate(
    { _id: params.id, workspaceId },
    { ...(Object.keys($set).length ? { $set } : {}), ...(Object.keys($unset).length ? { $unset } : {}) },
    { new: true },
  ).lean();
  return ok({ item });
});

/** Deletes the entry and anything nested under it (sub-types, unit types, …). */
export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  const r = await Master.deleteOne({ _id: id, workspaceId });
  if (!r.deletedCount) return bad("Not found.", 404);
  await Master.deleteMany({ workspaceId, parentId: id });
  return ok({ ok: true });
});
