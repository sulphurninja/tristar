import mongoose from "mongoose";
import Booking from "@/models/Booking";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const booking = await Booking.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  })
    .populate({ path: "leadId", select: "contact leadNumber" })
    .populate({ path: "projectId", select: "name code" })
    .populate({ path: "brokerId", select: "name firmName" })
    .lean();
  if (!booking) return bad("Booking not found", 404);
  return ok({ booking });
});

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Record<string, unknown>;
  const allowed = [
    "customerName",
    "amount",
    "stage",
    "approvalStatus",
    "source",
    "notes",
    "bookedAt",
    "leadId",
    "projectId",
    "brokerId",
  ];
  const $set: Record<string, unknown> = {};
  for (const k of allowed) {
    if (body[k] === undefined) continue;
    if ((k === "leadId" || k === "projectId" || k === "brokerId") && body[k]) {
      if (!mongoose.isValidObjectId(body[k] as string)) continue;
      $set[k] = new mongoose.Types.ObjectId(body[k] as string);
    } else if (k === "bookedAt") {
      $set[k] = new Date(body[k] as string);
    } else if (k === "amount") {
      $set[k] = Number(body[k]);
    } else {
      $set[k] = body[k];
    }
  }
  const booking = await Booking.findOneAndUpdate(
    { _id: params.id, workspaceId: session.workspaceId },
    { $set },
    { new: true },
  )
    .populate({ path: "leadId", select: "contact leadNumber" })
    .populate({ path: "projectId", select: "name code" })
    .populate({ path: "brokerId", select: "name firmName" })
    .lean();
  if (!booking) return bad("Booking not found", 404);
  return ok({ booking });
});
