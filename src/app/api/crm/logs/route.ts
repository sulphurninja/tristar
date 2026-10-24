import mongoose from "mongoose";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok } from "@/lib/api";
import { buildActivityFilter, pageParams } from "@/lib/crm-activity-filter";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const type = url.searchParams.get("type") ?? "";
  const { limit, skip } = pageParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const filter = await buildActivityFilter(url, workspaceId, type && type !== "all" ? [type] : []);
  const reportFilter = await buildActivityFilter(url, workspaceId, []);

  const [logs, total, byType] = await Promise.all([
    LeadActivity.find(filter)
      .sort({ occurredAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "leadId", select: "contact leadNumber stage source primaryProjectId" })
      .lean(),
    LeadActivity.countDocuments(filter),
    LeadActivity.aggregate<{ _id: string; count: number }>([
      { $match: reportFilter },
      { $group: { _id: "$type", count: { $sum: 1 } } },
    ]),
  ]);

  const report: Record<string, number> = {};
  for (const row of byType) report[row._id] = row.count;

  return ok({ logs, total, report });
});
