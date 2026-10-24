import mongoose from "mongoose";
import Source from "@/models/Source";
import { withAuth, ok } from "@/lib/api";
import { scopeIds } from "@/lib/report-utils";
import { activityCompleted, dailyMetrics, eod, leadBreakdown, parseDay, sod } from "@/lib/lead-analysis";

const NICE: Record<string, string> = {
  walkin: "Walkin",
  channel_partner: "Channel Partner",
  telecalling: "Tele-calling",
  whatsapp_bot: "WhatsApp",
  google_ads: "Google Ads",
  housing: "Housing.com",
  api: "API",
};
const pretty = (k: string) =>
  NICE[k] ?? k.replace(/[_-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

/**
 * Report -> Lead Analysis.
 *   ?day=YYYY-MM-DD            headline cards + trailing 7-day charts
 *   ?from&to                   "Date Range": lead breakdown + (default) activity window
 *   ?dfrom&dto                 "Details From": Activity Completed Time window
 *   ?team / ?agent             Team / Sales Agent filter
 */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const scope = await scopeIds(url, workspaceId);
  const ctx = { workspaceId, scope };

  const day = parseDay(url.searchParams.get("day"));
  const from = parseDay(url.searchParams.get("from"), new Date());
  const to = parseDay(url.searchParams.get("to"), new Date());
  const dfrom = url.searchParams.get("dfrom") ? parseDay(url.searchParams.get("dfrom")) : from;
  const dto = url.searchParams.get("dto") ? parseDay(url.searchParams.get("dto")) : to;
  const [rs, re] = from <= to ? [sod(from), eod(to)] : [sod(to), eod(from)];
  const [ds, de] = dfrom <= dto ? [sod(dfrom), eod(dto)] : [sod(dto), eod(dfrom)];

  const [cards, activity, breakdown, sources] = await Promise.all([
    dailyMetrics(ctx, day),
    activityCompleted(ctx, ds, de),
    leadBreakdown(ctx, rs, re),
    Source.find({ workspaceId }).select("key label").lean(),
  ]);
  const labels = new Map(sources.map((s) => [s.key, s.label]));

  return ok({
    cards,
    activity,
    leads: {
      total: breakdown.total,
      sources: breakdown.sources.map((s) => ({ ...s, label: labels.get(s.key) ?? pretty(s.key) })),
      stages: breakdown.stages,
    },
  });
});
