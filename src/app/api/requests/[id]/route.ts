import mongoose from "mongoose";
import RequestModel from "@/models/Request";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole, type Role } from "@/lib/auth";

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  const body = (await req.json()) as Record<string, unknown>;

  const update: Record<string, unknown> = {};
  if (
    typeof body.status === "string" &&
    ["approved", "rejected", "cancelled", "pending"].includes(body.status)
  ) {
    if (
      ["approved", "rejected"].includes(body.status) &&
      !hasRole(session.role as Role, "manager")
    ) {
      return bad("Only managers and above can approve or reject requests.", 403);
    }
    update.status = body.status;
    update.decidedAt = new Date();
    update.decidedBy = new mongoose.Types.ObjectId(session.userId);
  }
  if (typeof body.decision === "string") update.decision = body.decision;

  const updated = await RequestModel.findOneAndUpdate(
    { _id: id, workspaceId },
    update,
    { new: true },
  );
  if (!updated) return bad("Request not found.", 404);
  return ok({ request: updated });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const id = new mongoose.Types.ObjectId(params.id);
  await RequestModel.findOneAndDelete({ _id: id, workspaceId });
  return ok({ ok: true });
});
