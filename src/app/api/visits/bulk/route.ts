import mongoose from "mongoose";
import SiteVisit from "@/models/SiteVisit";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { mustSeeOwnOnly } from "@/lib/task-filters";

/** POST { action: "complete" | "cancel" | "reassign", ids: string[], assignedTo? } */
export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as { action?: string; ids?: unknown; assignedTo?: string };
  const ids = (Array.isArray(body.ids) ? body.ids : [])
    .filter((i): i is string => typeof i === "string" && mongoose.isValidObjectId(i))
    .slice(0, 1000);
  if (!ids.length) return bad("Select at least one site visit.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);
  const filter: Record<string, unknown> = { _id: { $in: ids }, workspaceId };
  if (mustSeeOwnOnly(session.role)) filter.assignedTo = userId;

  if (body.action === "complete" || body.action === "cancel") {
    const done = body.action === "complete";
    const rows = await SiteVisit.find({ ...filter, status: { $ne: done ? "done" : "cancelled" } });
    const now = new Date();
    for (const v of rows) {
      v.status = done ? "done" : "cancelled";
      if (done) v.completedAt = now;
      else v.cancelledAt = now;
      await v.save();
      if (done) {
        await Lead.updateOne(
          { _id: v.leadId, workspaceId },
          { $set: { lastContactedAt: now, lastContactChannel: "site_visit" } },
        );
      }
      await LeadActivity.create({
        workspaceId,
        leadId: v.leadId,
        actorId: userId,
        actorType: "user",
        type: done ? "site_visit_completed" : "site_visit_cancelled",
        description: done ? "Site visit completed." : "Site visit cancelled.",
        occurredAt: now,
      });
    }
    return ok({ ok: true, updated: rows.length });
  }
  if (body.action === "reassign") {
    if (mustSeeOwnOnly(session.role)) return bad("You cannot reassign visits.", 403);
    if (!body.assignedTo || !mongoose.isValidObjectId(body.assignedTo)) return bad("Choose an agent.");
    const u = await User.findOne({ _id: body.assignedTo, workspaceId }).select("name").lean();
    if (!u) return bad("Agent not found.", 404);
    const r = await SiteVisit.updateMany(filter, {
      $set: { assignedTo: u._id, assignedToName: u.name, assignedBy: userId },
    });
    return ok({ ok: true, updated: r.modifiedCount });
  }
  return bad("Unknown action.");
});
