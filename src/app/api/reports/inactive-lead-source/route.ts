import mongoose from "mongoose";
import Lead from "@/models/Lead";
import { withAuth, ok } from "@/lib/api";

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

export const GET = withAuth(async ({ session }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const agg = await Lead.aggregate<{ _id: string; count: number }>([
    {
      $match: {
        workspaceId,
        isBooked: { $ne: true },
        $or: [{ isInactive: true }, { lastContactedAt: { $lt: cutoff } }],
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

  return ok({ rows, total: rows.reduce((a, b) => a + b.count, 0) });
});
