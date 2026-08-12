import mongoose from "mongoose";
import Campaign from "@/models/Campaign";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const status = url.searchParams.get("status") ?? "";
  const channel = url.searchParams.get("channel") ?? "";
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const filter: Record<string, unknown> = { workspaceId };
  if (status && status !== "all") filter.status = status;
  if (channel && channel !== "all") filter.channel = channel;
  if (q) filter.name = { $regex: q, $options: "i" };

  const campaigns = await Campaign.find(filter).sort({ createdAt: -1 }).limit(200).lean();
  return ok({ campaigns, total: campaigns.length });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.name || typeof body.name !== "string") return bad("Name is required.");

  const campaign = await Campaign.create({
    workspaceId: new mongoose.Types.ObjectId(session.workspaceId),
    name: body.name,
    channel: body.channel ?? "other",
    status: body.status ?? "draft",
    utmSource: body.utmSource,
    utmMedium: body.utmMedium,
    utmCampaign: body.utmCampaign,
    budget: body.budget ? Number(body.budget) : undefined,
    startDate: body.startDate ? new Date(body.startDate as string) : undefined,
    endDate: body.endDate ? new Date(body.endDate as string) : undefined,
    notes: body.notes,
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });

  return ok({ campaign }, { status: 201 });
});
