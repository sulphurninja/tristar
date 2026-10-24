import mongoose from "mongoose";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import Task from "@/models/Task";
import SiteVisit from "@/models/SiteVisit";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole } from "@/lib/auth";
import { loadStageCatalog } from "@/lib/lead-stages";

/**
 * Bulk actions for the selection bar on the Leads table.
 * body: { ids: string[], action: "transfer"|"stage"|"addTag"|"removeTag"|"delete", ... }
 */
export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as {
    ids?: string[];
    action?: string;
    assignedTo?: string;
    stage?: string;
    tag?: string;
  };
  const ids = (body.ids ?? []).filter((i) => mongoose.isValidObjectId(i)).slice(0, 1000);
  if (!ids.length) return bad("Select at least one lead.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);
  const objIds = ids.map((i) => new mongoose.Types.ObjectId(i));
  const scope = { _id: { $in: objIds }, workspaceId };
  const now = new Date();

  const log = (type: string, description: string, extra: Record<string, unknown> = {}) =>
    LeadActivity.insertMany(
      objIds.map((leadId) => ({
        workspaceId,
        leadId,
        actorId: userId,
        actorType: "user",
        type,
        description,
        occurredAt: now,
        ...extra,
      })),
    );

  switch (body.action) {
    case "transfer": {
      if (!body.assignedTo || !mongoose.isValidObjectId(body.assignedTo)) return bad("Choose an agent.");
      const u = await User.findOne({ _id: body.assignedTo, workspaceId }).select("name").lean();
      if (!u) return bad("User not found.");
      const r = await Lead.updateMany(scope, {
        $set: { assignedTo: u._id, assignedAt: now },
        $pull: { coOwners: u._id },
      });
      await log("lead_assigned", `Lead transferred to ${u.name}.`, { toValue: String(u._id) });
      return ok({ modified: r.modifiedCount });
    }
    case "stage": {
      const catalog = await loadStageCatalog(workspaceId, session.userId);
      const st = catalog.find((s) => s.key === body.stage);
      if (!st) return bad("Invalid stage.");
      const r = await Lead.updateMany(scope, {
        $set: { stage: st.key, isBooked: st.key === "booked", isHot: st.key === "hot" },
      });
      await log("stage_changed", `Stage changed to ${st.label}.`, { toValue: st.key });
      return ok({ modified: r.modifiedCount });
    }
    case "addTag":
    case "removeTag": {
      const tag = (body.tag ?? "").trim().slice(0, 60);
      if (!tag) return bad("Tag is required.");
      const r = await Lead.updateMany(
        scope,
        body.action === "addTag" ? { $addToSet: { tags: tag } } : { $pull: { tags: tag } },
      );
      await log(
        body.action === "addTag" ? "tag_added" : "tag_removed",
        `Tag "${tag}" ${body.action === "addTag" ? "added" : "removed"}.`,
      );
      return ok({ modified: r.modifiedCount });
    }
    case "delete": {
      if (!hasRole(session.role, "manager")) return bad("You need manager access to delete leads.", 403);
      const found = await Lead.find(scope).select("_id").lean();
      const real = found.map((l) => l._id);
      await Promise.all([
        Lead.deleteMany({ _id: { $in: real }, workspaceId }),
        LeadActivity.deleteMany({ leadId: { $in: real }, workspaceId }),
        Task.deleteMany({ leadId: { $in: real }, workspaceId, status: { $in: ["pending", "upcoming"] } }),
        SiteVisit.deleteMany({ leadId: { $in: real }, workspaceId, status: { $in: ["planned", "confirmed"] } }),
      ]);
      return ok({ deleted: real.length });
    }
    default:
      return bad("Unknown action.");
  }
});
