import mongoose from "mongoose";
import Project from "@/models/Project";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const propertyType = url.searchParams.get("propertyType") ?? "";
  const saleStage = url.searchParams.get("saleStage") ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 500);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10), 0);

  const filter: Record<string, unknown> = {
    workspaceId: new mongoose.Types.ObjectId(session.workspaceId),
    archived: { $ne: true },
  };

  if (propertyType && propertyType !== "all") filter.propertyType = propertyType;
  if (saleStage && saleStage !== "all") filter.saleStage = saleStage;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { code: { $regex: q, $options: "i" } },
      { builderName: { $regex: q, $options: "i" } },
      { "location.city": { $regex: q, $options: "i" } },
      { "location.locality": { $regex: q, $options: "i" } },
    ];
  }

  const [items, total] = await Promise.all([
    Project.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Project.countDocuments(filter),
  ]);

  return ok({ projects: items, total });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.name || !body.code) return bad("Project name and code are required.");

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const dup = await Project.findOne({ workspaceId, code: body.code });
  if (dup) return bad("A project with this code already exists.");

  const project = await Project.create({
    workspaceId,
    code: (body.code as string).trim(),
    name: (body.name as string).trim(),
    builderName: body.builderName,
    propertyType: body.propertyType ?? "residential_apartment",
    configurations: body.configurations ?? [],
    saleStage: body.saleStage ?? "under_construction",
    possessionDate: body.possessionDate ? new Date(body.possessionDate as string) : undefined,
    rera: body.rera ?? {},
    location: body.location ?? {},
    priceRange: body.priceRange ?? {},
    totalUnits: body.totalUnits,
    availableUnits: body.availableUnits,
    amenities: body.amenities ?? [],
    highlights: body.highlights ?? [],
    description: body.description,
    tags: body.tags ?? [],
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });

  return ok({ project }, { status: 201 });
});
