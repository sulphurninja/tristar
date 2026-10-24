import mongoose from "mongoose";
import Campaign from "@/models/Campaign";
import { withAuth, ok, bad } from "@/lib/api";
import { parseCampaignBody } from "@/lib/campaigns";

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const campaign = await Campaign.findOne({ _id: params.id, workspaceId: session.workspaceId }).lean();
  if (!campaign) return bad("Campaign not found", 404);
  return ok({ campaign });
});

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Record<string, unknown>;
  const { $set, $unset, error } = parseCampaignBody(body, true);
  if (error) return bad(error);
  const update: Record<string, unknown> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  if (!Object.keys(update).length) return bad("Nothing to update.");
  const campaign = await Campaign.findOneAndUpdate({ _id: params.id, workspaceId: session.workspaceId }, update, { new: true }).lean();
  if (!campaign) return bad("Campaign not found", 404);
  return ok({ campaign });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const r = await Campaign.deleteOne({ _id: params.id, workspaceId: session.workspaceId });
  if (!r.deletedCount) return bad("Campaign not found", 404);
  return ok({ ok: true });
});
