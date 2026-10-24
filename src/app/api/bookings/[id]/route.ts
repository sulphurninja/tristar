import mongoose from "mongoose";
import Booking from "@/models/Booking";
import Payment from "@/models/Payment";
import Lead from "@/models/Lead";
import Project from "@/models/Project";
import Broker from "@/models/Broker";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { oid, str } from "@/lib/cp";
import { paidByBooking } from "@/lib/bookings";

const POP = [
  { path: "leadId", select: "contact leadNumber" },
  { path: "projectId", select: "name code" },
  { path: "salesAgentId", select: "name" },
  { path: "brokerId", select: "name firmName" },
];

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const booking = await Booking.findOne({ _id: params.id, workspaceId }).populate(POP).lean();
  if (!booking) return bad("Booking not found", 404);
  const payments = await Payment.find({ workspaceId, bookingId: booking._id }).sort({ date: -1 }).lean();
  const paid = (await paidByBooking(workspaceId, [booking._id])).get(String(booking._id)) ?? 0;
  return ok({ booking: { ...booking, paidAmount: paid, balanceAmount: (booking.amount ?? 0) - paid }, payments });
});

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Record<string, unknown>;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};

  if (body.customerName !== undefined) {
    const n = str(body.customerName);
    if (!n) return bad("Customer name is required.");
    $set.customerName = n;
  }
  if (body.amount !== undefined) {
    const a = Number(body.amount);
    if (!(a >= 0)) return bad("Enter a valid amount.");
    $set.amount = a;
  }
  if (body.stage !== undefined) {
    const s = str(body.stage);
    if (s) $set.stage = s;
  }
  if (body.approvalStatus !== undefined) {
    if (!["pending", "approved", "rejected"].includes(String(body.approvalStatus))) return bad("Invalid approval status.");
    $set.approvalStatus = body.approvalStatus;
  }
  for (const k of ["source", "notes"] as const) {
    if (body[k] === undefined) continue;
    const v = str(body[k]);
    if (v) $set[k] = v;
    else $unset[k] = 1;
  }
  if (body.bookedAt !== undefined) {
    const d = new Date(body.bookedAt as string);
    if (Number.isNaN(d.getTime())) return bad("Invalid booking date.");
    $set.bookedAt = d;
  }
  const refs: Array<[string, { exists: (q: object) => PromiseLike<unknown> }, string]> = [
    ["leadId", Lead, "lead"],
    ["projectId", Project, "project"],
    ["brokerId", Broker, "channel partner"],
    ["salesAgentId", User, "sales agent"],
  ];
  for (const [k, model, label] of refs) {
    if (body[k] === undefined) continue;
    if (!body[k]) {
      $unset[k] = 1;
      continue;
    }
    const id = oid(body[k]);
    if (!id || !(await model.exists({ _id: id, workspaceId }))) return bad(`Selected ${label} not found.`);
    $set[k] = id;
  }

  const update: Record<string, unknown> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  if (!Object.keys(update).length) return bad("Nothing to update.");

  const booking = await Booking.findOneAndUpdate({ _id: params.id, workspaceId }, update, { new: true })
    .populate(POP)
    .lean();
  if (!booking) return bad("Booking not found", 404);
  return ok({ booking });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const n = await Payment.countDocuments({ workspaceId, bookingId: params.id });
  if (n > 0) return bad(`Cannot delete: ${n} payment${n === 1 ? "" : "s"} recorded against this booking. Delete them first.`);
  const r = await Booking.deleteOne({ _id: params.id, workspaceId });
  if (!r.deletedCount) return bad("Booking not found", 404);
  return ok({ ok: true });
});
