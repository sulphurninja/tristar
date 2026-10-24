import mongoose from "mongoose";
import Source from "@/models/Source";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole, type Role } from "@/lib/auth";
import { slugify } from "@/lib/utils";

export const GET = withAuth(async ({ session }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const sources = await Source.find({ workspaceId })
    .sort({ sortOrder: 1, label: 1 })
    .lean();
  return ok({ sources });
});

export const POST = withAuth(async ({ req, session }) => {
  if (!hasRole(session.role as Role, "admin")) return bad("You need admin access to create sources.", 403);
  const body = (await req.json()) as Record<string, unknown>;
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) return bad("Label is required.");

  const key =
    typeof body.key === "string" && body.key.trim()
      ? slugify(body.key.trim())
      : slugify(label);

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const exists = await Source.findOne({ workspaceId, key });
  if (exists) return bad("A source with that key already exists.", 409);

  const created = await Source.create({
    workspaceId,
    key,
    label,
    description: typeof body.description === "string" ? body.description : undefined,
    color: typeof body.color === "string" ? body.color : "#0F8F60",
    isActive: typeof body.isActive === "boolean" ? body.isActive : true,
    sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });
  return ok({ source: created }, { status: 201 });
});
