import mongoose from "mongoose";
import CpSavedFilter from "@/models/CpSavedFilter";
import { withAuth, ok, bad } from "@/lib/api";
import { str } from "@/lib/cp";

/** Saved "Advance Filters" of the current user for the Channel Partner list. */
export const GET = withAuth(async ({ session }) => {
  const filters = await CpSavedFilter.find({
    workspaceId: session.workspaceId,
    userId: session.userId,
  })
    .sort({ name: 1 })
    .lean();
  return ok({ filters });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as { name?: string; filters?: Record<string, unknown> };
  const name = str(body.name);
  if (!name) return bad("Filter name is required.");
  const clean: Record<string, string> = {};
  for (const [k, v] of Object.entries(body.filters ?? {})) {
    if (typeof v === "string" && v) clean[k] = v;
  }
  const filter = await CpSavedFilter.create({
    workspaceId: new mongoose.Types.ObjectId(session.workspaceId),
    userId: new mongoose.Types.ObjectId(session.userId),
    name,
    filters: clean,
  });
  return ok({ filter }, { status: 201 });
});
