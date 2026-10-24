import mongoose from "mongoose";
import Voucher from "@/models/Voucher";
import { withAuth, ok, bad } from "@/lib/api";
import { escapeRegex, oid } from "@/lib/cp";
import { buildVoucherFields } from "@/lib/vouchers";

export const GET = withAuth(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const exportAll = sp.get("export") === "1";
  const limit = exportAll ? 10000 : Math.min(parseInt(sp.get("limit") ?? "50", 10) || 50, 500);
  const skip = Math.max(parseInt(sp.get("skip") ?? "0", 10) || 0, 0);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const filter: Record<string, unknown> = { workspaceId };
  const type = sp.get("type");
  if (type && type !== "all") filter.type = type;
  const paymentMode = sp.get("paymentMode");
  if (paymentMode && paymentMode !== "all") filter.paymentMode = paymentMode;
  const ledger = oid(sp.get("ledgerId"));
  if (ledger) filter.$or = [{ fromLedgerId: ledger }, { toLedgerId: ledger }, { ledgerId: ledger }];
  const dateFrom = sp.get("dateFrom");
  const dateTo = sp.get("dateTo");
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
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$and = [{ $or: [{ voucherNumber: rx }, { narration: rx }] }];
  }
  const [vouchers, total, sums] = await Promise.all([
    Voucher.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "fromLedgerId", select: "name" })
      .populate({ path: "toLedgerId", select: "name" })
      .lean(),
    Voucher.countDocuments(filter),
    Voucher.aggregate<{ _id: string; n: number; total: number }>([
      { $match: filter },
      { $group: { _id: "$type", n: { $sum: 1 }, total: { $sum: { $ifNull: ["$totalAmount", "$amount"] } } } },
    ]),
  ]);
  return ok({ vouchers, total, summary: sums });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const built = await buildVoucherFields(workspaceId, body);
  if ("error" in built) return bad(built.error as string);

  for (let attempt = 0; attempt < 3; attempt++) {
    const last = await Voucher.findOne({ workspaceId, voucherNumber: /^VCH-/ }).sort({ voucherNumber: -1 }).select("voucherNumber").lean();
    const seq = last?.voucherNumber ? parseInt(last.voucherNumber.slice(4), 10) || 0 : 0;
    const voucher = await Voucher.create({
      ...built.fields,
      workspaceId,
      voucherNumber: `VCH-${String(seq + 1).padStart(5, "0")}`,
      createdBy: new mongoose.Types.ObjectId(session.userId),
    });
    return ok({ voucher }, { status: 201 });
  }
  return bad("Could not create voucher", 500);
});
