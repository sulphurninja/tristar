import mongoose from "mongoose";
import SavedLeadFilter from "@/models/SavedLeadFilter";
import { withAuth, ok, bad } from "@/lib/api";

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const r = await SavedLeadFilter.deleteOne({
    _id: params.id,
    workspaceId: session.workspaceId,
    userId: session.userId,
  });
  if (!r.deletedCount) return bad("Filter not found", 404);
  return ok({ ok: true });
});
