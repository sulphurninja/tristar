import mongoose from "mongoose";
import Ledger from "@/models/Ledger";
import Voucher from "@/models/Voucher";
import { withAuth, ok, bad } from "@/lib/api";

type Pop = { _id: mongoose.Types.ObjectId; name: string } | null;

/** Ledger statement: opening balance rolled to dateFrom, then dated entries with a running balance (Dr positive). */
export const GET = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const ledger = await Ledger.findOne({ _id: params.id, workspaceId }).lean();
  if (!ledger) return bad("Ledger not found", 404);
  const sp = new URL(req.url).searchParams;
  const from = sp.get("dateFrom") ? new Date(sp.get("dateFrom") as string) : null;
  const to = sp.get("dateTo") ? new Date(sp.get("dateTo") as string) : null;
  if (from) from.setHours(0, 0, 0, 0);
  if (to) to.setHours(23, 59, 59, 999);

  const lid = ledger._id;
  const vouchers = await Voucher.find({
    workspaceId,
    $or: [{ fromLedgerId: lid }, { toLedgerId: lid }, { ledgerId: lid }],
  })
    .sort({ date: 1, createdAt: 1 })
    .populate({ path: "fromLedgerId", select: "name" })
    .populate({ path: "toLedgerId", select: "name" })
    .lean();

  let running = ledger.openingBalance ?? 0;
  let opening = running;
  let totalDebit = 0;
  let totalCredit = 0;
  const entries: Array<Record<string, unknown>> = [];
  for (const v of vouchers) {
    const f = v.fromLedgerId as unknown as Pop;
    const t = v.toLedgerId as unknown as Pop;
    const amt = v.totalAmount ?? v.amount ?? 0;
    const isDebit = !!t && String(t._id) === String(lid);
    const isCredit = !!f && String(f._id) === String(lid);
    if (!isDebit && !isCredit) continue;
    const debit = isDebit ? amt : 0;
    const credit = isCredit ? amt : 0;
    if (from && v.date < from) {
      running += debit - credit;
      opening = running;
      continue;
    }
    if (to && v.date > to) continue;
    running += debit - credit;
    totalDebit += debit;
    totalCredit += credit;
    entries.push({
      _id: v._id,
      date: v.date,
      voucherNumber: v.voucherNumber,
      type: v.type,
      particulars: isDebit ? (f?.name ?? "-") : (t?.name ?? "-"),
      narration: v.narration,
      debit,
      credit,
      balance: running,
    });
  }
  return ok({
    ledger: { _id: ledger._id, name: ledger.name, type: ledger.type, openingBalance: ledger.openingBalance ?? 0 },
    opening,
    entries,
    totalDebit,
    totalCredit,
    closing: running,
  });
});
