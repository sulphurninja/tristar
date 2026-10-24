import mongoose from "mongoose";
import Lead from "@/models/Lead";
import { withAuth, ok } from "@/lib/api";
import { RETURNING_FILTER } from "@/lib/scope";
import { buildLeadFilter, noFutureFollowup, overdueClause, VIEWS } from "@/lib/lead-filters";
import { loadStageCatalog } from "@/lib/lead-stages";

/**
 * Overview numbers for the Leads page: total + per-stage breakdown (driven by
 * the workspace pipeline) and the five insight-card counts. Respects the
 * stage-view select and team/agent scope (`view`, `team`, `agent`).
 */
export const GET = withAuth(async ({ session, req }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const p = new URL(req.url).searchParams;
  // back-compat with callers that send ?assignedTo=
  if (!p.get("agent") && p.get("assignedTo")) p.set("agent", p.get("assignedTo") as string);

  const [{ base, sets, lost }, catalog] = await Promise.all([
    buildLeadFilter(workspaceId, p, session.userId),
    loadStageCatalog(workspaceId, session.userId),
  ]);

  const and = (...c: Record<string, unknown>[]) => ({ $and: [base, ...c] });
  const activeOnly = { isBooked: { $ne: true }, isInactive: { $ne: true }, stage: { $nin: ["booked", ...lost] } };

  const [byStage, untouched, noFollowups, returning, returningNoFollowup, overdue] = await Promise.all([
    Lead.aggregate<{ _id: string; count: number }>([
      { $match: base },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]),
    Lead.countDocuments(and(activeOnly, { lastContactedAt: null })),
    Lead.countDocuments(and(activeOnly, { lastContactedAt: { $ne: null } }, noFutureFollowup(sets))),
    Lead.countDocuments(and(RETURNING_FILTER)),
    Lead.countDocuments(and(activeOnly, RETURNING_FILTER, noFutureFollowup(sets))),
    Lead.countDocuments(and(activeOnly, overdueClause(sets))),
  ]);

  const counts = new Map(byStage.map((r) => [r._id, r.count]));
  const total = byStage.reduce((n, r) => n + r.count, 0);
  const known = new Set(catalog.map((s) => s.key));
  const stages = catalog.map((s) => ({
    key: s.key,
    label: s.label,
    color: s.color,
    count: counts.get(s.key) ?? 0,
    pct: total ? ((counts.get(s.key) ?? 0) / total) * 100 : 0,
  }));
  /* Stage keys present on leads but not in the pipeline (legacy values). */
  for (const [key, count] of counts) {
    if (known.has(key) || !key) continue;
    stages.push({ key, label: key.replace(/_/g, " "), color: "#9a9ca6", count, pct: total ? (count / total) * 100 : 0 });
  }

  return ok({
    total,
    stages,
    /** Same rows under the legacy name used by <LeadStageAnalysis>. */
    buckets: stages,
    catalog,
    views: VIEWS,
    kpis: {
      untouchedLeads: untouched,
      noFollowupsLeads: noFollowups,
      returningLeads: returning,
      returningNoFollowupLeads: returningNoFollowup,
      overdueTaskLeads: overdue,
    },
  });
});
