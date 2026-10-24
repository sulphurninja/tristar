import mongoose from "mongoose";
import Ledger from "@/models/Ledger";
import { oid, str } from "@/lib/cp";

export const VOUCHER_TYPES = ["receipt", "payment", "journal", "contra"];
export const PAYMENT_MODES = ["cash", "cheque", "neft", "rtgs", "upi", "card", "other"];
export const TAX_RATES: Record<string, number> = {
  none: 0,
  gst_5: 5,
  gst_12: 12,
  gst_18: 18,
  gst_28: 28,
  igst_18: 18,
};

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Validate a voucher body and derive TDS / tax / total server-side. */
export async function buildVoucherFields(workspaceId: mongoose.Types.ObjectId, body: Record<string, unknown>) {
  const type = String(body.type ?? "receipt");
  if (!VOUCHER_TYPES.includes(type)) return { error: "Invalid voucher type." as const };
  const amount = Number(body.amount ?? 0);
  if (!(amount > 0)) return { error: "Amount must be greater than 0." as const };
  const narration = str(body.narration);
  if (!narration) return { error: "Narration is required." as const };
  const paymentMode = String(body.paymentMode ?? "neft");
  if (!PAYMENT_MODES.includes(paymentMode)) return { error: "Invalid payment mode." as const };
  const fromLedgerId = oid(body.fromLedgerId) ?? oid(body.ledgerId);
  const toLedgerId = oid(body.toLedgerId);
  if (!fromLedgerId) return { error: "Select From account." as const };
  if (!toLedgerId) return { error: "Select To account." as const };
  if (String(fromLedgerId) === String(toLedgerId)) return { error: "From and To accounts must be different." as const };
  const found = await Ledger.countDocuments({ workspaceId, _id: { $in: [fromLedgerId, toLedgerId] } });
  if (found !== 2) return { error: "Selected account not found." as const };
  const date = body.date ? new Date(body.date as string) : new Date();
  if (Number.isNaN(date.getTime())) return { error: "Invalid date." as const };

  const tdsPercent = Number(body.tdsPercent ?? 0);
  if (!(tdsPercent >= 0 && tdsPercent <= 100)) return { error: "TDS % must be between 0 and 100." as const };
  const taxType = String(body.taxType ?? "none");
  if (!(taxType in TAX_RATES)) return { error: "Invalid tax type." as const };
  const tdsAmount = round2((amount * tdsPercent) / 100);
  const taxAmount = round2((amount * TAX_RATES[taxType]) / 100);
  return {
    fields: {
      type,
      date,
      paymentMode,
      ledgerId: fromLedgerId,
      fromLedgerId,
      toLedgerId,
      amount,
      tdsPercent,
      tdsAmount,
      taxType,
      taxAmount,
      totalAmount: round2(amount - tdsAmount + taxAmount),
      narration,
    },
  };
}
