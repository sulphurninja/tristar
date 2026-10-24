import mongoose from "mongoose";
import Voucher from "@/models/Voucher";
import { str } from "@/lib/cp";

type Oid = mongoose.Types.ObjectId;

export const LEDGER_GROUPS = [
  "customer",
  "vendor",
  "broker",
  "bank",
  "cash",
  "direct_income",
  "direct_expense",
  "indirect_income",
  "indirect_expense",
  "other",
];

/** Total debit (voucher "To") and credit (voucher "From") per ledger. */
export async function ledgerMovement(workspaceId: Oid, ledgerIds: Oid[]) {
  const val = { $ifNull: ["$totalAmount", "$amount"] };
  const [dr, cr] = await Promise.all([
    Voucher.aggregate<{ _id: Oid; t: number }>([
      { $match: { workspaceId, toLedgerId: { $in: ledgerIds } } },
      { $group: { _id: "$toLedgerId", t: { $sum: val } } },
    ]),
    Voucher.aggregate<{ _id: Oid; t: number }>([
      { $match: { workspaceId, fromLedgerId: { $in: ledgerIds } } },
      { $group: { _id: "$fromLedgerId", t: { $sum: val } } },
    ]),
  ]);
  const m = new Map<string, { debit: number; credit: number }>();
  for (const r of dr) m.set(String(r._id), { debit: r.t, credit: 0 });
  for (const r of cr) {
    const cur = m.get(String(r._id)) ?? { debit: 0, credit: 0 };
    cur.credit = r.t;
    m.set(String(r._id), cur);
  }
  return m;
}

export function parseLedgerBody(body: Record<string, unknown>, partial: boolean) {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  let error: string | null = null;
  if (body.name !== undefined || !partial) {
    const n = str(body.name);
    if (!n) error = "Ledger name is required.";
    else $set.name = n;
  }
  for (const k of ["email", "mobile", "gstNo"] as const) {
    if (body[k] === undefined) continue;
    const v = str(body[k]);
    if (v) $set[k] = v;
    else $unset[k] = 1;
  }
  if ($set.email && !/^\S+@\S+\.\S+$/.test($set.email as string)) error = "Enter a valid email.";
  if (body.type !== undefined) {
    if (!LEDGER_GROUPS.includes(String(body.type))) error = "Invalid group.";
    else $set.type = body.type;
  }
  if (body.openingBalance !== undefined) {
    const ob = Number(body.openingBalance);
    if (Number.isNaN(ob)) error = "Opening balance must be a number.";
    else $set.openingBalance = ob;
  }
  return { $set, $unset, error };
}
