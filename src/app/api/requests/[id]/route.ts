import mongoose from "mongoose";
import RequestModel from "@/models/Request";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole, type Role } from "@/lib/auth";

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid request id.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  const body = (await req.json()) as Record<string, unknown>;
  const isManager = hasRole(session.role as Role, "manager");

  const existing = await RequestModel.findOne({ _id: id, workspaceId }).select("raisedBy status");
  if (!existing) return bad("Request not found.", 404);
  const isOwnRequest = String(existing.raisedBy) === session.userId;

  const update: Record<string, unknown> = {};
  if (typeof body.status === "string" && ["approved", "rejected", "cancelled", "pending"].includes(body.status)) {
    if (["approved", "rejected"].includes(body.status) && !isManager) {
      return bad("Only managers and above can approve or reject requests.", 403);
    }
    if (["cancelled", "pending"].includes(body.status) && !isManager && !isOwnRequest) {
      return bad("You can only cancel your own requests.", 403);
    }
    update.status = body.status;
    update.decidedAt = body.status === "pending" ? null : new Date();
    update.decidedBy = body.status === "pending" ? null : new mongoose.Types.ObjectId(session.userId);
  }
  if (typeof body.decision === "string") {
    if (!isManager) return bad("Only managers and above can record a decision note.", 403);
    update.decision = body.decision;
  }
  if (Object.keys(update).length === 0) return bad("Nothing to update.");

  const updated = await RequestModel.findOneAndUpdate({ _id: id, workspaceId }, update, { new: true });
  if (!updated) return bad("Request not found.", 404);
  return ok({ request: updated });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid request id.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  const existing = await RequestModel.findOne({ _id: id, workspaceId }).select("raisedBy");
  if (!existing) return bad("Request not found.", 404);
  if (!hasRole(session.role as Role, "manager") && String(existing.raisedBy) !== session.userId) {
    return bad("You can only delete your own requests.", 403);
  }
  await RequestModel.deleteOne({ _id: id, workspaceId });
  return ok({ ok: true });
});
