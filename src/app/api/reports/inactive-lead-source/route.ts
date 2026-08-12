import mongoose from "mongoose";
import Lead from "@/models/Lead";
import { withAuth, ok } from "@/lib/api";
import { boundsFromSearchParams } from "@/lib/report-utils";

const SOURCE_LABEL: Record<string, string> = {
  walkin: "Walkin",
  channel_partner: "Channel Partner",
  telecalling: "Tele-calling",
  website: "Website",
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
  const { end } = boundsFromSearchParams(url);
  const asOfParam = url.searchParams.get("asOf");
  const asOf = asOfParam ? new Date(asOfParam) : end;
  asOf.setHours(23, 59, 59, 999);

  const cutoff = new Date(asOf);
  cutoff.setDate(cutoff.getDate() - 30);

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const agg = await Lead.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        workspaceId,
        isBooked: { $ne: true },
        createdAt: { $lte: asOf },
        $or: [
          { isInactive: true },
          { lastContactedAt: { $lt: cutoff } },
          { lastContactedAt: { $exists: false }, createdAt: { $lt: cutoff } },
        ],
      },
    },
    { $group: { _id: "$source.primary", count: { $sum: 1 } } },
  ]);

  const rows = agg
    .map((a) => ({
      source: a._id ?? "other",
      label: SOURCE_LABEL[a._id ?? "other"] ?? a._id ?? "Other",
      count: a.count,
    }))
    .sort((a, b) => b.count - a.count);

  return ok({ rows, total: rows.reduce((a, b) => a + b.count, 0), asOf: asOf.toISOString() });
});
