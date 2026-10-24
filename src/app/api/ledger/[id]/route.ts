import mongoose from "mongoose";
import Ledger from "@/models/Ledger";
import Voucher from "@/models/Voucher";
import { withAuth, ok, bad } from "@/lib/api";
import { escapeRegex } from "@/lib/cp";
import { parseLedgerBody } from "@/lib/ledger";

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const ledger = await Ledger.findOne({ _id: params.id, workspaceId: session.workspaceId }).lean();
  if (!ledger) return bad("Ledger not found", 404);
  return ok({ ledger });
});

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Record<string, unknown>;
  const { $set, $unset, error } = parseLedgerBody(body, true);
  if (error) return bad(error);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  if ($set.name) {
    const dup = await Ledger.exists({
      workspaceId,
      _id: { $ne: params.id },
      name: new RegExp(`^${escapeRegex($set.name as string)}$`, "i"),
    });
    if (dup) return bad("A ledger with this name already exists.");
  }
  const update: Record<string, unknown> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  if (!Object.keys(update).length) return bad("Nothing to update.");
  const ledger = await Ledger.findOneAndUpdate({ _id: params.id, workspaceId }, update, { new: true }).lean();
  if (!ledger) return bad("Ledger not found", 404);
  return ok({ ledger });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const n = await Voucher.countDocuments({
    workspaceId,
    $or: [{ fromLedgerId: params.id }, { toLedgerId: params.id }, { ledgerId: params.id }],
  });
  if (n > 0) return bad(`Cannot delete: ${n} voucher${n === 1 ? "" : "s"} are posted to this ledger.`);
  const r = await Ledger.deleteOne({ _id: params.id, workspaceId });
  if (!r.deletedCount) return bad("Ledger not found", 404);
  return ok({ ok: true });
});
