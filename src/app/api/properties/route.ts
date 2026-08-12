import mongoose from "mongoose";
import Property from "@/models/Property";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10), 0);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const filter: Record<string, unknown> = { workspaceId };
  if (status && status !== "all") filter.status = status;
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { location: { $regex: q, $options: "i" } },
      { propertyNumber: { $regex: q, $options: "i" } },
      { ownerName: { $regex: q, $options: "i" } },
    ];
  }

  const [properties, total] = await Promise.all([
    Property.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "projectId", select: "name code" })
      .lean(),
    Property.countDocuments(filter),
  ]);

  return ok({ properties, total });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.title || typeof body.title !== "string") return bad("Title is required.");

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const count = await Property.countDocuments({ workspaceId });
  const propertyNumber = `PR-${String(count + 1).padStart(5, "0")}`;

  const property = await Property.create({
    workspaceId,
    propertyNumber,
    title: body.title,
    inventoryType: body.inventoryType ?? "residential",
    location: body.location,
    city: body.city,
    visibility: body.visibility ?? "internal",
    availableFor: body.availableFor ?? "sale",
    floor: body.floor,
    configuration: body.configuration,
    area: body.area ? Number(body.area) : undefined,
    price: body.price ? Number(body.price) : undefined,
    status: body.status ?? "available",
    ownerName: body.ownerName,
    ownerEmail: body.ownerEmail,
    ownerMobile: body.ownerMobile,
    projectId:
      body.projectId && mongoose.isValidObjectId(body.projectId as string)
        ? new mongoose.Types.ObjectId(body.projectId as string)
        : undefined,
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });

  return ok({ property }, { status: 201 });
});
