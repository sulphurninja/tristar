import mongoose from "mongoose";
import Voucher from "@/models/Voucher";
import { withAuth, ok, bad } from "@/lib/api";
import { buildVoucherFields } from "@/lib/vouchers";

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const voucher = await Voucher.findOne({ _id: params.id, workspaceId: session.workspaceId })
    .populate({ path: "fromLedgerId", select: "name" })
    .populate({ path: "toLedgerId", select: "name" })
    .lean();
  if (!voucher) return bad("Voucher not found", 404);
  return ok({ voucher });
});

/** Full replace of the editable voucher fields (the voucher number is kept). */
export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const body = (await req.json()) as Record<string, unknown>;
  const built = await buildVoucherFields(workspaceId, body);
  if ("error" in built) return bad(built.error as string);
  const voucher = await Voucher.findOneAndUpdate({ _id: params.id, workspaceId }, { $set: built.fields }, { new: true }).lean();
  if (!voucher) return bad("Voucher not found", 404);
  return ok({ voucher });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const r = await Voucher.deleteOne({ _id: params.id, workspaceId: session.workspaceId });
  if (!r.deletedCount) return bad("Voucher not found", 404);
  return ok({ ok: true });
});
