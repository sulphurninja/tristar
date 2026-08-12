import mongoose from "mongoose";
import Voucher from "@/models/Voucher";
import { withAuth, ok, bad } from "@/lib/api";

function oid(v: unknown) {
  return typeof v === "string" && mongoose.isValidObjectId(v)
    ? new mongoose.Types.ObjectId(v)
    : undefined;
}

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const type = url.searchParams.get("type") ?? "";
  const paymentMode = url.searchParams.get("paymentMode") ?? "";
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const filter: Record<string, unknown> = { workspaceId };
  if (type && type !== "all") filter.type = type;
  if (paymentMode && paymentMode !== "all") filter.paymentMode = paymentMode;
  if (dateFrom || dateTo) {
    const date: Record<string, Date> = {};
    if (dateFrom) {
      const d = new Date(dateFrom);
      d.setHours(0, 0, 0, 0);
      date.$gte = d;
    }
    if (dateTo) {
      const d = new Date(dateTo);
      d.setHours(23, 59, 59, 999);
      date.$lte = d;
    }
    filter.date = date;
  }
  if (q) {
    filter.$or = [
      { voucherNumber: { $regex: q, $options: "i" } },
      { narration: { $regex: q, $options: "i" } },
    ];
  }
  const vouchers = await Voucher.find(filter)
    .sort({ date: -1 })
    .limit(200)
    .populate({ path: "ledgerId", select: "name" })
    .populate({ path: "fromLedgerId", select: "name" })
    .populate({ path: "toLedgerId", select: "name" })
    .lean();
  return ok({ vouchers, total: vouchers.length });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const amount = Number(body.amount ?? 0);
  if (!(amount > 0)) return bad("Amount must be greater than 0.");
  if (!body.narration || typeof body.narration !== "string" || !body.narration.trim()) {
    return bad("Narration is required.");
  }

  const fromLedgerId = oid(body.fromLedgerId) ?? oid(body.ledgerId);
  const toLedgerId = oid(body.toLedgerId);
  if (!fromLedgerId) return bad("Select From account.");
  if (!toLedgerId) return bad("Select To account.");

  const tdsPercent = Number(body.tdsPercent ?? 0);
  const tdsAmount = Number(body.tdsAmount ?? (amount * tdsPercent) / 100);
  const taxAmount = Number(body.taxAmount ?? 0);

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const count = await Voucher.countDocuments({ workspaceId });
  const voucherNumber = `VCH-${String(count + 1).padStart(5, "0")}`;

  const voucher = await Voucher.create({
    workspaceId,
    voucherNumber,
    type: body.type ?? "receipt",
    date: body.date ? new Date(body.date as string) : new Date(),
    paymentMode: body.paymentMode ?? "neft",
    ledgerId: fromLedgerId,
    fromLedgerId,
    toLedgerId,
    amount,
    tdsPercent,
    tdsAmount,
    taxType: body.taxType ?? "none",
    taxAmount,
    narration: (body.narration as string).trim(),
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });

  return ok({ voucher }, { status: 201 });
});
