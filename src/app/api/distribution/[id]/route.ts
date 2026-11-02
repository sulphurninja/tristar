import mongoose from "mongoose";
import DistributionRule from "@/models/DistributionRule";
import { withAuth, ok, bad } from "@/lib/api";
import { ruleFields } from "@/lib/distribution-input";

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id.");
  const b = (await req.json()) as Record<string, unknown>;
  const f = ruleFields(b);
  if ("name" in b && !f.name) return bad("Give the rule a name.");
  if ("agentIds" in b && !f.agentIds?.length) return bad("Add at least one agent.");
  const $set: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) if (k in b && v !== undefined) $set[k] = v;
  if (typeof b.order === "number") $set.order = b.order;
  const rule = await DistributionRule.findOneAndUpdate(
    { _id: params.id, workspaceId: session.workspaceId },
    { $set },
    { new: true },
  ).lean();
  if (!rule) return bad("Rule not found.", 404);
  return ok({ rule });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id.");
  const r = await DistributionRule.deleteOne({ _id: params.id, workspaceId: session.workspaceId });
  if (!r.deletedCount) return bad("Rule not found.", 404);
  return ok({ ok: true });
});
