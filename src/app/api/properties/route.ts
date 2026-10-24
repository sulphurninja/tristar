import mongoose from "mongoose";
import Property from "@/models/Property";
import { withAuth, ok, bad } from "@/lib/api";
import { sanitizeProperty } from "@/lib/property-input";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";
  const projectId = url.searchParams.get("projectId") ?? "";
  const inventoryType = url.searchParams.get("inventoryType") ?? "";
  const availableFor = url.searchParams.get("availableFor") ?? "";
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 1), 1000);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10), 0);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const filter: Record<string, unknown> = { workspaceId };
  if (status && status !== "all") filter.status = status;
  if (projectId && mongoose.isValidObjectId(projectId)) filter.projectId = new mongoose.Types.ObjectId(projectId);
  if (inventoryType && inventoryType !== "all") filter.inventoryType = inventoryType;
  if (availableFor && availableFor !== "all") filter.availableFor = availableFor;
  if (q) {
    filter.$or = [
      { title: { $regex: escapeRe(q), $options: "i" } },
      { location: { $regex: escapeRe(q), $options: "i" } },
      { propertyNumber: { $regex: escapeRe(q), $options: "i" } },
      { ownerName: { $regex: escapeRe(q), $options: "i" } },
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
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const clean = await sanitizeProperty(body, workspaceId, false);
  if ("error" in clean) return bad(clean.error);

  const count = await Property.countDocuments({ workspaceId });
  const propertyNumber = `PR-${String(count + 1).padStart(5, "0")}`;

  const property = await Property.create({
    inventoryType: "residential",
    visibility: "internal",
    availableFor: "sale",
    status: "available",
    ...clean.data,
    workspaceId,
    propertyNumber,
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });

  return ok({ property }, { status: 201 });
});
