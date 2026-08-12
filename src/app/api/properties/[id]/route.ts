import mongoose from "mongoose";
import Property from "@/models/Property";
import { withAuth, ok, bad } from "@/lib/api";

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

  const property = await Property.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  });
  if (!property) return bad("Property not found", 404);

  const allowed = [
    "title",
    "status",
    "inventoryType",
    "location",
    "city",
    "visibility",
    "availableFor",
    "floor",
    "configuration",
    "area",
    "price",
    "ownerName",
    "ownerEmail",
    "ownerMobile",
    "notes",
    "images",
  ];
  for (const k of allowed) {
    if (body[k] !== undefined) {
      // @ts-expect-error dynamic
      property[k] = body[k];
    }
  }

  await property.save();

  if (typeof body.remark === "string" && body.remark.trim()) {
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
                createdByName: (body.actorName as string) || "Team",
              },
            ],
            $position: 0,
          },
        },
      },
    );
  }

  if (typeof body.imageUrl === "string" && body.imageUrl.trim()) {
    await Property.updateOne(
      { _id: property._id },
      {
        $push: {
          images: {
            url: body.imageUrl.trim(),
            caption: (body.imageCaption as string) || "",
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
