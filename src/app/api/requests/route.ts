import mongoose from "mongoose";
import RequestModel, { REQUEST_TYPES, type RequestType } from "@/models/Request";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole, type Role } from "@/lib/auth";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "all";
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const filter: Record<string, unknown> = { workspaceId };
  /* Only managers and above see everyone's requests. */
  if (!hasRole(session.role as Role, "manager")) {
    const me = new mongoose.Types.ObjectId(session.userId);
    filter.$or = [{ raisedBy: me }, { assignedTo: me }];
  }
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
  const oid = (v: unknown) =>
    typeof v === "string" && mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : undefined;

  const created = await RequestModel.create({
    workspaceId,
    type,
    title,
    description: typeof body.description === "string" ? body.description : undefined,
    raisedBy: userId,
    assignedTo: oid(body.assignedTo),
    leadId: oid(body.leadId),
    projectId: oid(body.projectId),
    payload: body.payload,
    status: "pending",
  });
  return ok({ request: created }, { status: 201 });
});
