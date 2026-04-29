import mongoose from "mongoose";
import RequestModel, { REQUEST_TYPES, type RequestType } from "@/models/Request";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "all";
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const filter: Record<string, unknown> = { workspaceId };
  if (status !== "all") filter.status = status;

  const items = await RequestModel.find(filter)
    .sort({ createdAt: -1 })
    .populate({ path: "raisedBy", select: "name email" })
    .populate({ path: "assignedTo", select: "name email" })
    .lean();

  return ok({ requests: items });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const type = body.type as RequestType;
  if (!REQUEST_TYPES.includes(type)) return bad("Invalid request type.");

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title) return bad("Title is required.");

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  const created = await RequestModel.create({
    workspaceId,
    type,
    title,
    description: typeof body.description === "string" ? body.description : undefined,
    raisedBy: userId,
    assignedTo: typeof body.assignedTo === "string"
      ? new mongoose.Types.ObjectId(body.assignedTo)
      : undefined,
    leadId: typeof body.leadId === "string"
      ? new mongoose.Types.ObjectId(body.leadId)
      : undefined,
    projectId: typeof body.projectId === "string"
      ? new mongoose.Types.ObjectId(body.projectId)
      : undefined,
    payload: body.payload,
    status: "pending",
  });
  return ok({ request: created }, { status: 201 });
});
