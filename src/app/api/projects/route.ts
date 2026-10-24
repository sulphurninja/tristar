import mongoose from "mongoose";
import Project from "@/models/Project";
import { withAuth, ok, bad } from "@/lib/api";
import { sanitizeProject } from "@/lib/project-input";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const propertyType = url.searchParams.get("propertyType") ?? "";
  const saleStage = url.searchParams.get("saleStage") ?? "";
  const archived = url.searchParams.get("archived") === "1";
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? "100", 10) || 100, 1), 500);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10) || 0, 0);

  const filter: Record<string, unknown> = {
    workspaceId: new mongoose.Types.ObjectId(session.workspaceId),
    archived: archived ? true : { $ne: true },
  };

  if (propertyType && propertyType !== "all") filter.propertyType = propertyType;
  if (saleStage && saleStage !== "all") filter.saleStage = saleStage;
  if (q) {
    const re = escapeRe(q);
    filter.$or = [
      { name: { $regex: re, $options: "i" } },
      { code: { $regex: re, $options: "i" } },
      { builderName: { $regex: re, $options: "i" } },
      { "location.city": { $regex: re, $options: "i" } },
      { "location.locality": { $regex: re, $options: "i" } },
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
  if (typeof body.name !== "string" || typeof body.code !== "string" || !body.name.trim() || !body.code.trim()) {
    return bad("Project name and code are required.");
  }
  const clean = sanitizeProject(body);
  if ("error" in clean) return bad(clean.error);

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const dup = await Project.findOne({ workspaceId, code: clean.data.code });
  if (dup) return bad("A project with this code already exists.");

  // Expand dotted $set-style paths into nested objects for create().
  const doc: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(clean.data)) {
    if (k.includes(".")) {
      const [a, b] = k.split(".");
      doc[a] = { ...((doc[a] as object) ?? {}), [b]: v };
    } else doc[k] = v;
  }
  const project = await Project.create({
    propertyType: "residential_apartment",
    saleStage: "under_construction",
    ...doc,
    workspaceId,
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });

  return ok({ project }, { status: 201 });
});
