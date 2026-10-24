import mongoose from "mongoose";
import Payment from "@/models/Payment";
import Booking from "@/models/Booking";
import { withAuth, ok, bad } from "@/lib/api";
import { str } from "@/lib/cp";
import { paidByBooking } from "@/lib/bookings";

const MODES = ["cash", "cheque", "neft", "rtgs", "upi", "card", "other"];

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const payment = await Payment.findOne({ _id: params.id, workspaceId: session.workspaceId })
    .populate({ path: "bookingId", select: "bookingNumber customerName amount projectId" })
    .lean();
  if (!payment) return bad("Payment not found", 404);
  return ok({ payment });
});

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Record<string, unknown>;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const cur = await Payment.findOne({ _id: params.id, workspaceId });
  if (!cur) return bad("Payment not found", 404);

  const net = body.netAmount !== undefined ? Number(body.netAmount) : cur.netAmount;
  const tax = body.taxAmount !== undefined ? Number(body.taxAmount) : cur.taxAmount;
  const tds = body.tds !== undefined ? Number(body.tds) : cur.tds;
  if (!(net > 0)) return bad("Net amount must be greater than 0.");
  if (!(tax >= 0) || !(tds >= 0)) return bad("Tax and TDS cannot be negative.");
  const total = net + tax;
  const final = total - tds;
  if (final < 0) return bad("TDS cannot exceed the total amount.");

  if (cur.bookingId && cur.type === "receipt") {
    const booking = await Booking.findOne({ _id: cur.bookingId, workspaceId }).lean();
    if (booking?.amount) {
      const paid = (await paidByBooking(workspaceId, [booking._id])).get(String(booking._id)) ?? 0;
      if (paid - cur.finalAmount + final > booking.amount + 0.001) return bad("Amount exceeds the booking balance.");
    }
  }

  if (body.customerName !== undefined) {
    const n = str(body.customerName);
    if (!n) return bad("Customer name is required.");
    cur.customerName = n;
  }
  if (body.paymentType !== undefined) {
    if (!MODES.includes(String(body.paymentType))) return bad("Invalid payment type.");
    cur.paymentType = body.paymentType as typeof cur.paymentType;
  }
  if (body.date !== undefined) {
    const d = new Date(body.date as string);
    if (Number.isNaN(d.getTime())) return bad("Invalid date.");
    cur.date = d;
  }
  for (const k of ["paymentFor", "bankDetails", "ledgerAccount"] as const) {
    if (body[k] !== undefined) cur[k] = str(body[k]) || undefined;
  }
  if (body.bookingId !== undefined && String(cur.bookingId ?? "") !== String(body.bookingId ?? "")) {
    return bad("The booking of a payment cannot be changed. Delete and re-record it instead.");
  }
  cur.netAmount = net;
  cur.taxAmount = tax;
  cur.tds = tds;
  cur.totalAmount = total;
  cur.finalAmount = final;
  await cur.save();
  return ok({ payment: cur });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const r = await Payment.deleteOne({ _id: params.id, workspaceId: session.workspaceId });
  if (!r.deletedCount) return bad("Payment not found", 404);
  return ok({ ok: true });
});
