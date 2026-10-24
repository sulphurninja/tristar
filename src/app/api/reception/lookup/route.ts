import mongoose from "mongoose";
import { withAuth, ok } from "@/lib/api";
import { findLeadByPhone } from "@/lib/reception-lead";

/** GET /api/reception/lookup?phone=… → the existing lead with that mobile, if any. */
export const GET = withAuth(async ({ req, session }) => {
  const phone = new URL(req.url).searchParams.get("phone") ?? "";
  const lead = await findLeadByPhone(new mongoose.Types.ObjectId(session.workspaceId), phone);
  return ok({ lead });
});
