import mongoose from "mongoose";
import Lead from "@/models/Lead";
import { withAuth, ok } from "@/lib/api";
import { boundsFromSearchParams, PIPELINE_COLUMNS } from "@/lib/report-utils";

const SOURCE_LABEL: Record<string, string> = {
  walkin: "Walkin",
  channel_partner: "Channel Partner",
  telecalling: "Tele-calling",
  website: "Website",
  whatsapp_bot: "WhatsApp",
  facebook: "Facebook",
  instagram: "Instagram",
  google_ads: "Google Ads",
  magicbricks: "Magicbricks",
  "99acres": "99acres",
  housing: "Housing.com",
  newspaper: "Newspaper",
  hoarding: "Hoarding",
  referral: "Referral",
  exhibition: "Exhibition",
  import: "Import",
  api: "API",
  other: "Other",
};

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const { start, end, range } = boundsFromSearchParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const agg = await Lead.aggregate<{
    _id: { source: string; stage: string };
    count: number;
  }>([
    { $match: { workspaceId, createdAt: { $gte: start, $lte: end } } },
    {
      $group: {
        _id: { source: "$source.primary", stage: "$stage" },
        count: { $sum: 1 },
      },
    },
  ]);

  const indexed: Record<string, Record<string, number>> = {};
  for (const r of agg) {
    const src = r._id.source ?? "other";
    indexed[src] = indexed[src] ?? {};
    indexed[src][r._id.stage] = r.count;
  }

  const rows = Object.entries(indexed).map(([source, stages]) => {
    const total = Object.values(stages).reduce((a, b) => a + b, 0);
    const cells: Record<string, number> = {};
    for (const c of PIPELINE_COLUMNS) cells[c.key] = stages[c.key] ?? 0;
    return {
      source,
      label: SOURCE_LABEL[source] ?? source,
      total,
      stages: cells,
    };
  });

  rows.sort((a, b) => b.total - a.total);

  const totalsRow = {
    label: "Total",
    total: rows.reduce((a, b) => a + b.total, 0),
    stages: PIPELINE_COLUMNS.reduce<Record<string, number>>((acc, c) => {
      acc[c.key] = rows.reduce((a, b) => a + (b.stages[c.key] ?? 0), 0);
      return acc;
    }, {}),
  };

  return ok({ range, columns: PIPELINE_COLUMNS, rows, totalsRow });
});
