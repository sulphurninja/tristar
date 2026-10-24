import mongoose from "mongoose";
import Property from "@/models/Property";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole } from "@/lib/auth";
import { sanitizeProperty } from "@/lib/property-input";

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const property = await Property.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  })
    .populate({ path: "projectId", select: "name code location" })
    .lean();
  if (!property) return bad("Property not found", 404);
  return ok({ property });
});

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Record<string, unknown>;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const property = await Property.findOne({ _id: params.id, workspaceId });
  if (!property) return bad("Property not found", 404);

  const clean = await sanitizeProperty(body, workspaceId, true);
  if ("error" in clean) return bad(clean.error);
  property.set(clean.data);
  await property.save();

  if (typeof body.remark === "string" && body.remark.trim()) {
    const actor = await User.findById(session.userId).select("name").lean();
    await Property.updateOne(
      { _id: property._id },
      {
        $push: {
          timeline: {
            $each: [
              {
                text: body.remark.trim(),
                createdAt: new Date(),
                createdBy: new mongoose.Types.ObjectId(session.userId),
                createdByName: actor?.name || "Team",
              },
            ],
            $position: 0,
          },
        },
      },
    );
  }

  if (typeof body.imageUrl === "string" && /^(https?:\/\/|\/|data:image\/)/.test(body.imageUrl.trim())) {
    await Property.updateOne(
      { _id: property._id },
      {
        $push: {
          images: {
            url: body.imageUrl.trim(),
            caption: typeof body.imageCaption === "string" ? body.imageCaption : "",
            uploadedAt: new Date(),
          },
        },
      },
    );
  }

  const populated = await Property.findById(property._id)
    .populate({ path: "projectId", select: "name code location" })
    .lean();
  return ok({ property: populated });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  if (!hasRole(session.role, "manager")) return bad("Only managers and above can delete properties.", 403);
  const r = await Property.findOneAndDelete({ _id: params.id, workspaceId: session.workspaceId });
  if (!r) return bad("Property not found", 404);
  return ok({ ok: true });
});
