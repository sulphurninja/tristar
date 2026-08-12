import mongoose from "mongoose";
import Payment from "@/models/Payment";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const type = url.searchParams.get("type") ?? "";
  const paymentType = url.searchParams.get("paymentType") ?? "";
  const dateFrom = url.searchParams.get("dateFrom") ?? "";
  const dateTo = url.searchParams.get("dateTo") ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10), 0);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const filter: Record<string, unknown> = { workspaceId };
  if (type && type !== "all") filter.type = type;
  if (paymentType && paymentType !== "all") filter.paymentType = paymentType;
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
      { customerName: { $regex: q, $options: "i" } },
      { paymentFor: { $regex: q, $options: "i" } },
      { bankDetails: { $regex: q, $options: "i" } },
    ];
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "bookingId", select: "bookingNumber customerName" })
      .lean(),
    Payment.countDocuments(filter),
  ]);

  return ok({ payments, total });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const net = Number(body.netAmount ?? 0);
  const tds = Number(body.tds ?? 0);
  const tax = Number(body.taxAmount ?? 0);
  const total = Number(body.totalAmount ?? net + tax);
  const final = Number(body.finalAmount ?? total - tds);

  const payment = await Payment.create({
    workspaceId,
    type: body.type ?? "receipt",
    paymentFor: body.paymentFor,
    date: body.date ? new Date(body.date as string) : new Date(),
    customerName: body.customerName,
    ledgerAccount: body.ledgerAccount,
    paymentType: body.paymentType ?? "neft",
    bankDetails: body.bankDetails,
    netAmount: net,
    tds,
    taxAmount: tax,
    totalAmount: total,
    finalAmount: final,
    bookingId:
      body.bookingId && mongoose.isValidObjectId(body.bookingId as string)
        ? new mongoose.Types.ObjectId(body.bookingId as string)
        : undefined,
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });

  return ok({ payment }, { status: 201 });
});
