import mongoose from "mongoose";
import Task from "@/models/Task";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";
  const type = url.searchParams.get("type") ?? "";
  const assignedTo = url.searchParams.get("assignedTo") ?? "";
  const leadId = url.searchParams.get("leadId") ?? "";
  const brokerId = url.searchParams.get("brokerId") ?? "";
  const range = url.searchParams.get("range") ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10), 0);

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const filter: Record<string, unknown> = { workspaceId };

  if (status && status !== "all") filter.status = status;
  if (type && type !== "all") filter.type = type;
  if (assignedTo && mongoose.isValidObjectId(assignedTo)) {
    filter.assignedTo = new mongoose.Types.ObjectId(assignedTo);
  }
  if (leadId && mongoose.isValidObjectId(leadId)) {
    filter.leadId = new mongoose.Types.ObjectId(leadId);
  }
  if (brokerId && mongoose.isValidObjectId(brokerId)) {
    filter.brokerId = new mongoose.Types.ObjectId(brokerId);
  }
  if (q) {
    filter.$or = [
      { title: { $regex: q, $options: "i" } },
      { remark: { $regex: q, $options: "i" } },
    ];
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(now);
  endOfDay.setHours(23, 59, 59, 999);

  if (range === "today") {
    filter.scheduleAt = { $gte: startOfDay, $lte: endOfDay };
  } else if (range === "upcoming") {
    filter.scheduleAt = { $gt: endOfDay };
    filter.status = { $in: ["pending", "upcoming"] };
  }

  const [items, total, today, upcoming, pending, completed] = await Promise.all([
    Task.find(filter)
      .sort({ scheduleAt: 1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "leadId", select: "contact leadNumber" })
      .populate({ path: "assignedTo", select: "name email" })
      .populate({ path: "assignedBy", select: "name" })
      .lean(),
    Task.countDocuments(filter),
    Task.countDocuments({
      workspaceId,
      scheduleAt: { $gte: startOfDay, $lte: endOfDay },
    }),
    Task.countDocuments({
      workspaceId,
      scheduleAt: { $gt: endOfDay },
      status: { $in: ["pending", "upcoming"] },
    }),
    Task.countDocuments({ workspaceId, status: "pending" }),
    Task.countDocuments({ workspaceId, status: "completed" }),
  ]);

  return ok({
    tasks: items,
    total,
    stats: { today, upcoming, pending, completed },
  });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.title || typeof body.title !== "string") return bad("Title is required.");

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  const completed = body.completed === true || body.status === "completed";
  const task = await Task.create({
    workspaceId,
    title: body.title,
    type: body.type ?? "call",
    status: completed ? "completed" : (body.status ?? "pending"),
    scheduleAt: body.scheduleAt ? new Date(body.scheduleAt as string) : undefined,
    completedAt: completed ? new Date() : undefined,
    remindMe: body.remindMe !== false,
    reminderMinutes:
      typeof body.reminderMinutes === "number" ? body.reminderMinutes : 15,
    remark: body.remark,
    entityType: body.entityType ?? "lead",
    leadId:
      body.leadId && mongoose.isValidObjectId(body.leadId as string)
        ? new mongoose.Types.ObjectId(body.leadId as string)
        : undefined,
    brokerId:
      body.brokerId && mongoose.isValidObjectId(body.brokerId as string)
        ? new mongoose.Types.ObjectId(body.brokerId as string)
        : undefined,
    assignedTo:
      body.assignedTo && mongoose.isValidObjectId(body.assignedTo as string)
        ? new mongoose.Types.ObjectId(body.assignedTo as string)
        : userId,
    assignedBy: userId,
    createdBy: userId,
  });

  return ok({ task }, { status: 201 });
});
