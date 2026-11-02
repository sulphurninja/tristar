import mongoose from "mongoose";
import DistributionRule from "@/models/DistributionRule";
import { withAuth, ok, bad } from "@/lib/api";
import { ruleFields } from "@/lib/distribution-input";

export const GET = withAuth(async ({ session }) => {
  const rules = await DistributionRule.find({ workspaceId: session.workspaceId }).sort({ order: 1, createdAt: 1 }).lean();
  return ok({ rules });
});

export const POST = withAuth(async ({ req, session }) => {
  const f = ruleFields((await req.json()) as Record<string, unknown>);
  if (!f.name) return bad("Give the rule a name.");
  if (!f.agentIds?.length) return bad("Add at least one agent.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const last = await DistributionRule.findOne({ workspaceId }).sort({ order: -1 }).select("order").lean();
  const rule = await DistributionRule.create({
    ...f,
    workspaceId,
    order: (last?.order ?? 0) + 1,
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });
  return ok({ rule }, { status: 201 });
});
