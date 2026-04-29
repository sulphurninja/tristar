import mongoose from "mongoose";
import Broker from "@/models/Broker";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const broker = await Broker.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  }).lean();
  if (!broker) return bad("Broker not found", 404);
  return ok({ broker });
});

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Record<string, unknown>;
  const broker = await Broker.findOneAndUpdate(
    { _id: params.id, workspaceId: session.workspaceId },
    { $set: body },
    { new: true },
  );
  if (!broker) return bad("Broker not found", 404);
  return ok({ broker });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  await Broker.deleteOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  });
  return ok({ ok: true });
});
