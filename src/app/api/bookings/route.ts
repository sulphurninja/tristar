import mongoose from "mongoose";
import Booking from "@/models/Booking";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const approvalStatus = url.searchParams.get("approvalStatus") ?? "";
  const stage = url.searchParams.get("stage") ?? "";
  const projectId = url.searchParams.get("projectId") ?? "";
  const salesAgentId = url.searchParams.get("salesAgentId") ?? "";
  const leadId = url.searchParams.get("leadId") ?? "";
  const brokerId = url.searchParams.get("brokerId") ?? "";
  const bookedFrom = url.searchParams.get("bookedFrom") ?? "";
  const bookedTo = url.searchParams.get("bookedTo") ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10), 0);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const filter: Record<string, unknown> = { workspaceId };
  if (approvalStatus && approvalStatus !== "all") filter.approvalStatus = approvalStatus;
  if (stage && stage !== "all") filter.stage = stage;
  if (projectId && mongoose.isValidObjectId(projectId)) {
    filter.projectId = new mongoose.Types.ObjectId(projectId);
  }
  if (salesAgentId && mongoose.isValidObjectId(salesAgentId)) {
    filter.salesAgentId = new mongoose.Types.ObjectId(salesAgentId);
  }
  if (leadId && mongoose.isValidObjectId(leadId)) {
    filter.leadId = new mongoose.Types.ObjectId(leadId);
  }
  if (brokerId && mongoose.isValidObjectId(brokerId)) {
    filter.brokerId = new mongoose.Types.ObjectId(brokerId);
  }
  if (bookedFrom || bookedTo) {
    const bookedAt: Record<string, Date> = {};
    if (bookedFrom) {
      const d = new Date(bookedFrom);
      d.setHours(0, 0, 0, 0);
      bookedAt.$gte = d;
    }
    if (bookedTo) {
      const d = new Date(bookedTo);
      d.setHours(23, 59, 59, 999);
      bookedAt.$lte = d;
    }
    filter.bookedAt = bookedAt;
  }
  if (q) {
    filter.$or = [
      { customerName: { $regex: q, $options: "i" } },
      { bookingNumber: { $regex: q, $options: "i" } },
    ];
  }

  const [bookings, total] = await Promise.all([
    Booking.find(filter)
      .sort({ bookedAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "leadId", select: "contact leadNumber" })
      .populate({ path: "projectId", select: "name code" })
      .populate({ path: "salesAgentId", select: "name" })
      .populate({ path: "brokerId", select: "name firmName" })
      .lean(),
    Booking.countDocuments(filter),
  ]);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [monthCount, monthSales] = await Promise.all([
    Booking.countDocuments({ workspaceId, bookedAt: { $gte: monthStart } }),
    Booking.aggregate<{ total: number }>([
      { $match: { workspaceId, bookedAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  return ok({
    bookings,
    total,
    overview: {
      monthBookings: monthCount,
      monthSales: monthSales[0]?.total ?? 0,
    },
  });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  if (!body.customerName && !body.leadId) return bad("Customer name or lead is required.");

  const count = await Booking.countDocuments({ workspaceId });
  const bookingNumber = `BK-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

  const booking = await Booking.create({
    workspaceId,
    bookingNumber,
    customerName: body.customerName,
    amount: Number(body.amount ?? 0),
    stage: body.stage ?? "booked",
    approvalStatus: body.approvalStatus ?? "pending",
    source: body.source,
    notes: body.notes,
    bookedAt: body.bookedAt ? new Date(body.bookedAt as string) : new Date(),
    leadId:
      body.leadId && mongoose.isValidObjectId(body.leadId as string)
        ? new mongoose.Types.ObjectId(body.leadId as string)
        : undefined,
    projectId:
      body.projectId && mongoose.isValidObjectId(body.projectId as string)
        ? new mongoose.Types.ObjectId(body.projectId as string)
        : undefined,
    brokerId:
      body.brokerId && mongoose.isValidObjectId(body.brokerId as string)
        ? new mongoose.Types.ObjectId(body.brokerId as string)
        : undefined,
    salesAgentId: userId,
    createdBy: userId,
  });

  return ok({ booking }, { status: 201 });
});
