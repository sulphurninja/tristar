import mongoose from "mongoose";
import SavedLeadFilter from "@/models/SavedLeadFilter";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth(async ({ session }) => {
  const filters = await SavedLeadFilter.find({
    workspaceId: session.workspaceId,
    userId: session.userId,
  })
    .sort({ name: 1 })
    .lean();
  return ok({ filters });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as { name?: string; params?: Record<string, unknown> };
  const name = body.name?.trim().slice(0, 80);
  if (!name) return bad("Filter name is required.");
  /* Only keep flat string params. */
  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.params ?? {})) {
    if (typeof v === "string" && v !== "" && /^[A-Za-z]{1,30}$/.test(k)) params[k] = v.slice(0, 500);
  }
  if (!Object.keys(params).length) return bad("Nothing to save - apply some filters first.");
  const filter = await SavedLeadFilter.findOneAndUpdate(
    {
      workspaceId: new mongoose.Types.ObjectId(session.workspaceId),
      userId: new mongoose.Types.ObjectId(session.userId),
      name,
    },
    { $set: { params } },
    { upsert: true, new: true },
  );
  return ok({ filter }, { status: 201 });
});
