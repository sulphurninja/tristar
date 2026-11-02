import mongoose from "mongoose";
import DistributionRule from "@/models/DistributionRule";
import User from "@/models/User";

type Oid = mongoose.Types.ObjectId;

/** Users who can take leads right now (active, not on an unexpired holiday). */
async function availableAgents(workspaceId: Oid, ids: Oid[]) {
  if (!ids.length) return new Set<string>();
  const now = new Date();
  const users = await User.find({
    _id: { $in: ids },
    workspaceId,
    status: "active",
    $or: [{ onHoliday: { $ne: true } }, { holidayUntil: { $lt: now } }],
  })
    .select("_id")
    .lean();
  return new Set(users.map((u) => String(u._id)));
}

/**
 * Pick the agent for a new unassigned lead, advancing the matching rule's
 * round-robin pointer atomically. Returns null when no rule matches or nobody
 * in the rule is available.
 */
export async function pickAgent(
  workspaceId: Oid,
  lead: { source?: string | null; projectId?: Oid | string | null },
): Promise<Oid | null> {
  const source = (lead.source ?? "").toLowerCase();
  const projectId = lead.projectId ? String(lead.projectId) : "";
  const rules = await DistributionRule.find({ workspaceId, active: true, "agentIds.0": { $exists: true } })
    .sort({ order: 1, createdAt: 1 })
    .lean();

  for (const r of rules) {
    const srcOk = !r.sources?.length || (!!source && r.sources.map((x) => x.toLowerCase()).includes(source));
    const projOk = !r.projectIds?.length || (!!projectId && r.projectIds.map(String).includes(projectId));
    if (!srcOk || !projOk) continue;

    const agents = r.agentIds as Oid[];
    const free = await availableAgents(workspaceId, agents);
    if (!free.size) continue;

    /* Claim the next slot until we land on an available agent. */
    for (let tries = 0; tries < agents.length; tries++) {
      const claimed = await DistributionRule.findOneAndUpdate(
        { _id: r._id },
        { $inc: { pointer: 1 } },
        { new: false, projection: { pointer: 1, agentIds: 1 } },
      ).lean();
      if (!claimed) break;
      const list = claimed.agentIds as Oid[];
      const pick = list[(claimed.pointer ?? 0) % list.length];
      if (pick && free.has(String(pick))) {
        await DistributionRule.updateOne({ _id: r._id }, { $inc: { assignedCount: 1 }, $set: { lastAssignedAt: new Date() } });
        return pick;
      }
    }
  }
  return null;
}
