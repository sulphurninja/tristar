import mongoose from "mongoose";
import ApiKey from "@/models/ApiKey";
import { withAuth, ok, bad } from "@/lib/api";

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  const body = (await req.json()) as Record<string, unknown>;

  const update: Record<string, unknown> = {};
  if (typeof body.isActive === "boolean") update.isActive = body.isActive;

  const updated = await ApiKey.findOneAndUpdate({ _id: id, workspaceId }, update, {
    new: true,
  });
  if (!updated) return bad("API key not found.", 404);
  return ok({ apiKey: updated });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  await ApiKey.findOneAndDelete({ _id: id, workspaceId });
  return ok({ ok: true });
});
