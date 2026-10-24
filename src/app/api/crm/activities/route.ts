import mongoose from "mongoose";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok } from "@/lib/api";
import { buildActivityFilter, pageParams } from "@/lib/crm-activity-filter";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const types = url.searchParams.get("types")?.split(",").filter(Boolean) ?? [];
  const { limit, skip } = pageParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const filter = await buildActivityFilter(url, workspaceId, types);
  // The summary report ignores the type filter so the numbers stay comparable.
  const reportFilter = await buildActivityFilter(url, workspaceId, []);

  const [activities, total, byType] = await Promise.all([
    LeadActivity.find(filter)
      .sort({ occurredAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "leadId", select: "contact leadNumber stage source" })
      .lean(),
    LeadActivity.countDocuments(filter),
    LeadActivity.aggregate<{ _id: string; n: number }>([
      { $match: reportFilter },
      { $group: { _id: "$type", n: { $sum: 1 } } },
    ]),
  ]);

  const c: Record<string, number> = {};
  for (const r of byType) c[r._id] = r.n;
  const sum = (...k: string[]) => k.reduce((a, t) => a + (c[t] ?? 0), 0);

  return ok({
    activities,
    total,
    report: {
      stageChanges: sum("stage_changed"),
      meetings: sum("meeting_logged"),
      siteVisitScheduled: sum("site_visit_scheduled"),
      siteVisitCompleted: sum("site_visit_completed"),
      callsMade: sum("call_made"),
      callsMissed: sum("call_missed"),
      whatsapp: sum("whatsapp_sent", "whatsapp_received"),
      emails: sum("email_sent", "email_received"),
      sms: sum("sms_sent", "sms_received"),
      followups: sum("followup_set"),
      comments: sum("comment_added"),
      total: Object.values(c).reduce((a, b) => a + b, 0),
    },
  });
});
