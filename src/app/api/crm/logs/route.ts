import mongoose from "mongoose";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const type = url.searchParams.get("type") ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10), 200);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10), 0);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const filter: Record<string, unknown> = { workspaceId };
  if (type && type !== "all") filter.type = type;
  if (q) {
    filter.$or = [
      { description: { $regex: q, $options: "i" } },
      { actorName: { $regex: q, $options: "i" } },
    ];
  }

  const [logs, total, byType] = await Promise.all([
    LeadActivity.find(filter)
      .sort({ occurredAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "leadId", select: "contact leadNumber stage source primaryProjectId" })
      .lean(),
    LeadActivity.countDocuments(filter),
    LeadActivity.aggregate<{ _id: string; count: number }>([
      { $match: { workspaceId } },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]),
  ]);

  const report: Record<string, number> = {
    lead_created: 0,
    lead_assigned: 0,
    stage_changed: 0,
    call_made: 0,
    whatsapp_sent: 0,
    site_visit_scheduled: 0,
    merged: 0,
  };
  for (const row of byType) {
    if (row._id in report) report[row._id] = row.count;
  }

  return ok({ logs, total, report });
});
