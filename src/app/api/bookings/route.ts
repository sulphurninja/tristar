import mongoose from "mongoose";
import Booking from "@/models/Booking";
import Lead from "@/models/Lead";
import Project from "@/models/Project";
import Broker from "@/models/Broker";
import { withAuth, ok, bad } from "@/lib/api";
import { resolveAgentScope, scopeParams } from "@/lib/scope";
import { escapeRegex, oid, str } from "@/lib/cp";
import { paidByBooking } from "@/lib/bookings";

type Oid = mongoose.Types.ObjectId;

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const sp = url.searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const exportAll = sp.get("export") === "1";
  const limit = exportAll ? 10000 : Math.min(parseInt(sp.get("limit") ?? "50", 10) || 50, 200);
  const skip = Math.max(parseInt(sp.get("skip") ?? "0", 10) || 0, 0);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const filter: Record<string, unknown> = { workspaceId };
  const approvalStatus = sp.get("approvalStatus") ?? "";
  if (approvalStatus && approvalStatus !== "all") filter.approvalStatus = approvalStatus;
  const stage = sp.get("stage") ?? "";
  if (stage && stage !== "all") filter.stage = stage;
  for (const k of ["projectId", "leadId", "brokerId"] as const) {
    const v = oid(sp.get(k));
    if (v) filter[k] = v;
  }

  const { team, agent } = scopeParams(url);
  const legacyAgent = sp.get("salesAgentId");
  const scope = await resolveAgentScope(workspaceId, team, agent || legacyAgent);
  if (scope) filter.salesAgentId = { $in: scope };

  const bookedFrom = sp.get("bookedFrom");
  const bookedTo = sp.get("bookedTo");
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
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ customerName: rx }, { bookingNumber: rx }];
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

  const paid = await paidByBooking(workspaceId, bookings.map((b) => b._id));
  const rows = bookings.map((b) => {
    const p = paid.get(String(b._id)) ?? 0;
    return { ...b, paidAmount: p, balanceAmount: (b.amount ?? 0) - p };
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const [monthCount, monthSales, pendingCount, totals] = await Promise.all([
    Booking.countDocuments({ workspaceId, bookedAt: { $gte: monthStart } }),
    Booking.aggregate<{ total: number }>([
      { $match: { workspaceId, bookedAt: { $gte: monthStart } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Booking.countDocuments({ workspaceId, approvalStatus: "pending" }),
    Booking.aggregate<{ amount: number }>([
      { $match: filter },
      { $group: { _id: null, amount: { $sum: "$amount" } } },
    ]),
  ]);

  return ok({
    bookings: rows,
    total,
    overview: {
      monthBookings: monthCount,
      monthSales: monthSales[0]?.total ?? 0,
      pending: pendingCount,
      filteredAmount: totals[0]?.amount ?? 0,
    },
  });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  const leadId = oid(body.leadId);
  const projectId = oid(body.projectId);
  const brokerId = oid(body.brokerId);
  let customerName = str(body.customerName);

  if (leadId) {
    const lead = await Lead.findOne({ _id: leadId, workspaceId }).select("contact.name").lean();
    if (!lead) return bad("Selected lead not found.");
    customerName = customerName || lead.contact?.name;
  }
  if (!customerName) return bad("Customer name or lead is required.");
  const amount = Number(body.amount ?? 0);
  if (!(amount >= 0) || Number.isNaN(amount)) return bad("Enter a valid amount.");
  if (projectId && !(await Project.exists({ _id: projectId, workspaceId }))) return bad("Selected project not found.");
  if (brokerId && !(await Broker.exists({ _id: brokerId, workspaceId }))) return bad("Selected channel partner not found.");
  const bookedAt = body.bookedAt ? new Date(body.bookedAt as string) : new Date();
  if (Number.isNaN(bookedAt.getTime())) return bad("Invalid booking date.");

  // Sequential booking number: highest existing suffix + 1 (stable even after deletes).
  const year = bookedAt.getFullYear();
  const prefix = `BK-${year}-`;
  const last = await Booking.findOne({ workspaceId, bookingNumber: new RegExp(`^${prefix}`) })
    .sort({ bookingNumber: -1 })
    .select("bookingNumber")
    .lean();
  const seq = last?.bookingNumber ? parseInt(last.bookingNumber.slice(prefix.length), 10) || 0 : 0;

  const booking = await Booking.create({
    workspaceId,
    bookingNumber: `${prefix}${String(seq + 1).padStart(5, "0")}`,
    customerName,
    amount,
    stage: str(body.stage) || "booked",
    approvalStatus: ["pending", "approved", "rejected"].includes(String(body.approvalStatus)) ? body.approvalStatus : "pending",
    source: str(body.source) || undefined,
    notes: str(body.notes) || undefined,
    bookedAt,
    leadId,
    projectId,
    brokerId,
    salesAgentId: oid(body.salesAgentId) ?? userId,
    createdBy: userId,
  });

  return ok({ booking }, { status: 201 });
});
