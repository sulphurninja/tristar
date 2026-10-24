import mongoose from "mongoose";
import Project from "@/models/Project";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole } from "@/lib/auth";
import { sanitizeProject } from "@/lib/project-input";

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
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const clean = sanitizeProject(body);
  if ("error" in clean) return bad(clean.error);
  const set: Record<string, unknown> = { ...clean.data };
  if (typeof body.archived === "boolean") set.archived = body.archived;
  if (typeof body.isActive === "boolean") set.isActive = body.isActive;

  if (typeof set.code === "string") {
    const dup = await Project.findOne({ workspaceId, code: set.code, _id: { $ne: params.id } })
      .select("_id")
      .lean();
    if (dup) return bad("A project with this code already exists.");
  }
  const project = await Project.findOneAndUpdate({ _id: params.id, workspaceId }, { $set: set }, { new: true });
  if (!project) return bad("Project not found", 404);
  return ok({ project });
});

/** Archive (soft delete) a project. */
export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  if (!hasRole(session.role, "manager")) return bad("Only managers and above can archive projects.", 403);
  const project = await Project.findOneAndUpdate(
    { _id: params.id, workspaceId: session.workspaceId },
    { $set: { archived: true } },
    { new: true },
  );
  if (!project) return bad("Project not found", 404);
  return ok({ ok: true });
});
