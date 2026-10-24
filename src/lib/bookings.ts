import mongoose from "mongoose";
import Payment from "@/models/Payment";

type Oid = mongoose.Types.ObjectId;

/** Net money received against bookings: receipts minus refunds (after TDS). */
export async function paidByBooking(workspaceId: Oid, bookingIds: Oid[]) {
  if (!bookingIds.length) return new Map<string, number>();
  const rows = await Payment.aggregate<{ _id: Oid; net: number }>([
    { $match: { workspaceId, bookingId: { $in: bookingIds } } },
    {
      $group: {
        _id: "$bookingId",
        net: { $sum: { $cond: [{ $eq: ["$type", "refund"] }, { $multiply: ["$finalAmount", -1] }, "$finalAmount"] } },
      },
    },
  ]);
  return new Map(rows.map((r) => [String(r._id), r.net]));
}
