import mongoose from "mongoose";
import Project from "@/models/Project";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const project = await Project.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  }).lean();
  if (!project) return bad("Project not found", 404);
  return ok({ project });
});

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Record<string, unknown>;
  const project = await Project.findOneAndUpdate(
    { _id: params.id, workspaceId: session.workspaceId },
    { $set: body },
    { new: true },
  );
  if (!project) return bad("Project not found", 404);
  return ok({ project });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const project = await Project.findOneAndUpdate(
    { _id: params.id, workspaceId: session.workspaceId },
    { $set: { archived: true } },
    { new: true },
  );
  if (!project) return bad("Project not found", 404);
  return ok({ ok: true });
});
