import mongoose from "mongoose";
import Payment from "@/models/Payment";
import Booking from "@/models/Booking";
import { withAuth, ok, bad } from "@/lib/api";
import { escapeRegex, oid, str } from "@/lib/cp";
import { paidByBooking } from "@/lib/bookings";

const MODES = ["cash", "cheque", "neft", "rtgs", "upi", "card", "other"];

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const exportAll = sp.get("export") === "1";
  const limit = exportAll ? 10000 : Math.min(parseInt(sp.get("limit") ?? "50", 10) || 50, 200);
  const skip = Math.max(parseInt(sp.get("skip") ?? "0", 10) || 0, 0);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const filter: Record<string, unknown> = { workspaceId };
  const type = sp.get("type");
  if (type && type !== "all") filter.type = type;
  const paymentType = sp.get("paymentType");
  if (paymentType && paymentType !== "all") filter.paymentType = paymentType;
  const bookingId = oid(sp.get("bookingId"));
  if (bookingId) filter.bookingId = bookingId;
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
    filter.$or = [{ customerName: rx }, { paymentFor: rx }, { bankDetails: rx }, { receiptNumber: rx }, { ledgerAccount: rx }];
  }

  const [payments, total, sums] = await Promise.all([
    Payment.find(filter)
      .sort({ date: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "bookingId", select: "bookingNumber customerName" })
      .lean(),
    Payment.countDocuments(filter),
    Payment.aggregate<{ _id: string; final: number }>([
      { $match: filter },
      { $group: { _id: "$type", final: { $sum: "$finalAmount" } } },
    ]),
  ]);
  const received = sums.find((s) => s._id === "receipt")?.final ?? 0;
  const refunded = sums.find((s) => s._id === "refund")?.final ?? 0;
  return ok({ payments, total, totals: { received, refunded, net: received - refunded } });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const type = body.type === "refund" ? "refund" : "receipt";
  const net = Number(body.netAmount ?? 0);
  const tax = Number(body.taxAmount ?? 0);
  const tds = Number(body.tds ?? 0);
  if (!(net > 0)) return bad("Net amount must be greater than 0.");
  if (!(tax >= 0) || !(tds >= 0)) return bad("Tax and TDS cannot be negative.");
  const total = net + tax;
  const final = total - tds;
  if (final < 0) return bad("TDS cannot exceed the total amount.");
  const paymentType = MODES.includes(String(body.paymentType)) ? String(body.paymentType) : "neft";
  const date = body.date ? new Date(body.date as string) : new Date();
  if (Number.isNaN(date.getTime())) return bad("Invalid date.");

  let customerName = str(body.customerName);
  let bookingId: mongoose.Types.ObjectId | undefined;
  if (body.bookingId) {
    bookingId = oid(body.bookingId);
    const booking = bookingId ? await Booking.findOne({ _id: bookingId, workspaceId }).lean() : null;
    if (!booking) return bad("Selected booking not found.");
    customerName = customerName || booking.customerName || undefined;
    const paid = (await paidByBooking(workspaceId, [booking._id])).get(String(booking._id)) ?? 0;
    if (type === "receipt" && booking.amount && paid + final > booking.amount + 0.001) {
      return bad(`Amount exceeds the booking balance of ${(booking.amount - paid).toLocaleString("en-IN")}.`);
    }
    if (type === "refund" && final > paid + 0.001) return bad("Refund exceeds the amount received on this booking.");
  }
  if (!customerName) return bad("Customer name is required.");

  const prefix = type === "refund" ? "RFD-" : "RCT-";
  const last = await Payment.findOne({ workspaceId, receiptNumber: new RegExp(`^${prefix}`) })
    .sort({ receiptNumber: -1 })
    .select("receiptNumber")
    .lean();
  const seq = last?.receiptNumber ? parseInt(last.receiptNumber.slice(prefix.length), 10) || 0 : 0;

  const payment = await Payment.create({
    workspaceId,
    receiptNumber: `${prefix}${String(seq + 1).padStart(5, "0")}`,
    type,
    paymentFor: str(body.paymentFor) || undefined,
    date,
    customerName,
    ledgerAccount: str(body.ledgerAccount) || undefined,
    paymentType,
    bankDetails: str(body.bankDetails) || undefined,
    netAmount: net,
    taxAmount: tax,
    tds,
    totalAmount: total,
    finalAmount: final,
    bookingId,
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });

  return ok({ payment }, { status: 201 });
});
