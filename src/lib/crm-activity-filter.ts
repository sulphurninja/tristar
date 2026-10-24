import mongoose from "mongoose";
import Lead from "@/models/Lead";
import { rangeBounds, resolveAgentScope, scopeParams } from "@/lib/scope";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Shared filter builder for CRM → Activities and CRM → Logs:
 * date range, team/agent (actor), activity types and a free-text search that
 * matches the description, the actor, or the lead's name / mobile / number.
 */
export async function buildActivityFilter(url: URL, workspaceId: mongoose.Types.ObjectId, types: string[]) {
  const sp = url.searchParams;
  const filter: Record<string, unknown> = { workspaceId };

  const range = sp.get("range") ?? "today";
  const bounds = range === "all" ? null : rangeBounds(range, sp.get("from"), sp.get("to"));
  if (bounds) filter.occurredAt = { $gte: bounds[0], $lte: bounds[1] };

  const { team, agent } = scopeParams(url);
  const scope = await resolveAgentScope(workspaceId, team, agent);
  if (scope) filter.actorId = { $in: scope };

  if (types.length) filter.type = { $in: types };

  const q = sp.get("q")?.trim() ?? "";
  if (q) {
    const re = escapeRe(q);
    const leads = await Lead.find({
      workspaceId,
      $or: [
        { "contact.name": { $regex: re, $options: "i" } },
        { "contact.primaryPhone": { $regex: re, $options: "i" } },
        { leadNumber: { $regex: re, $options: "i" } },
      ],
    })
      .select("_id")
      .limit(500)
      .lean();
    filter.$or = [
      { description: { $regex: re, $options: "i" } },
      { actorName: { $regex: re, $options: "i" } },
      ...(leads.length ? [{ leadId: { $in: leads.map((l) => l._id) } }] : []),
    ];
  }
  return filter;
}

export function pageParams(url: URL, def = 20) {
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") ?? String(def), 10) || def, 1), 1000);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10) || 0, 0);
  return { limit, skip };
}
