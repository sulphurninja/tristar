import mongoose from "mongoose";
import Campaign from "@/models/Campaign";
import Lead from "@/models/Lead";
import Booking from "@/models/Booking";
import { withAuth, ok, bad } from "@/lib/api";
import { escapeRegex } from "@/lib/cp";
import { parseCampaignBody } from "@/lib/campaigns";


/** Attribute leads (and their bookings) to campaigns via utm campaign / campaign name. */
async function campaignStats(workspaceId: mongoose.Types.ObjectId, campaigns: Array<{ _id: mongoose.Types.ObjectId; name: string; utmCampaign?: string | null }>) {
  const out = new Map<string, { leads: number; bookings: number }>();
  await Promise.all(
    campaigns.map(async (c) => {
      const keys = [c.utmCampaign, c.name].filter((k): k is string => !!k && !!k.trim());
      const rx = keys.map((k) => new RegExp(`^${escapeRegex(k.trim())}$`, "i"));
      const match = { workspaceId, $or: [{ "source.utm.campaign": { $in: rx } }, { "source.campaign": { $in: rx } }] };
      const ids = await Lead.find(match).select("_id").lean();
      const bookings = ids.length ? await Booking.countDocuments({ workspaceId, leadId: { $in: ids.map((i) => i._id) } }) : 0;
      out.set(String(c._id), { leads: ids.length, bookings });
    }),
  );
  return out;
}

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";
  const channel = url.searchParams.get("channel") ?? "";
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const filter: Record<string, unknown> = { workspaceId };
  if (status && status !== "all") filter.status = status;
  if (channel && channel !== "all") filter.channel = channel;
  if (q) filter.name = { $regex: escapeRegex(q), $options: "i" };

  const campaigns = await Campaign.find(filter).sort({ createdAt: -1 }).limit(500).lean();
  const stats = await campaignStats(workspaceId, campaigns);
  const rows = campaigns.map((c) => {
    const s = stats.get(String(c._id)) ?? { leads: 0, bookings: 0 };
    return { ...c, leads: s.leads, bookings: s.bookings };
  });
  const all = await Campaign.aggregate<{ _id: string; n: number; budget: number }>([
    { $match: { workspaceId } },
    { $group: { _id: "$status", n: { $sum: 1 }, budget: { $sum: { $ifNull: ["$budget", 0] } } } },
  ]);
  return ok({
    campaigns: rows,
    total: rows.length,
    summary: {
      active: all.find((a) => a._id === "active")?.n ?? 0,
      paused: all.find((a) => a._id === "paused")?.n ?? 0,
      completed: all.find((a) => a._id === "completed")?.n ?? 0,
      draft: all.find((a) => a._id === "draft")?.n ?? 0,
      budget: all.reduce((s, a) => s + a.budget, 0),
    },
  });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const { $set, error } = parseCampaignBody(body, false);
  if (error) return bad(error);
  const campaign = await Campaign.create({
    ...$set,
    workspaceId: new mongoose.Types.ObjectId(session.workspaceId),
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });
  return ok({ campaign }, { status: 201 });
});
