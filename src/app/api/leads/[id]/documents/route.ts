import { mkdir, writeFile } from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok, bad } from "@/lib/api";

export const POST = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");

  const lead = await Lead.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  });
  if (!lead) return bad("Lead not found", 404);

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return bad("file is required");
  if (file.size > 8 * 1024 * 1024) return bad("Max file size is 8MB");

  const bytes = Buffer.from(await file.arrayBuffer());
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  const dir = path.join(process.cwd(), "public", "uploads", session.workspaceId, params.id);
  await mkdir(dir, { recursive: true });
  const filename = `${Date.now()}-${safeName}`;
  await writeFile(path.join(dir, filename), bytes);

  const url = `/uploads/${session.workspaceId}/${params.id}/${filename}`;
  const doc = {
    name: file.name,
    url,
    mimeType: file.type || "application/octet-stream",
    size: file.size,
    uploadedAt: new Date(),
    uploadedBy: new mongoose.Types.ObjectId(session.userId),
  };

  await Lead.updateOne({ _id: lead._id }, { $push: { documents: doc } });

  await LeadActivity.create({
    workspaceId: lead.workspaceId,
    leadId: lead._id,
    actorId: new mongoose.Types.ObjectId(session.userId),
    type: "document_uploaded",
    description: `Uploaded ${file.name}`,
    metadata: { url, name: file.name, size: file.size },
    occurredAt: new Date(),
  });

  const updated = await Lead.findById(lead._id).select("documents").lean();
  return ok({ document: doc, documents: updated?.documents ?? [] }, { status: 201 });
});

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const lead = await Lead.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  })
    .select("documents")
    .lean();
  if (!lead) return bad("Lead not found", 404);
  return ok({ documents: lead.documents ?? [] });
});
