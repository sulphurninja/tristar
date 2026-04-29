import mongoose from "mongoose";
import SiteVisit from "@/models/SiteVisit";
import LeadActivity from "@/models/LeadActivity";
import Lead from "@/models/Lead";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const visit = await SiteVisit.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  })
    .populate({ path: "leadId", select: "contact stage leadNumber" })
    .populate({ path: "projectId", select: "name code location" })
    .lean();
  if (!visit) return bad("Visit not found", 404);
  return ok({ visit });
});

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Record<string, unknown>;

  const visit = await SiteVisit.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  });
  if (!visit) return bad("Visit not found", 404);

  const fromStatus = visit.status;
  Object.assign(visit, body);
  await visit.save();

  if (body.status && body.status !== fromStatus) {
    const userId = new mongoose.Types.ObjectId(session.userId);

    if (body.status === "done") {
      await Lead.updateOne({ _id: visit.leadId }, { $set: { stage: "site_visit_done" } });
      await LeadActivity.create({
        workspaceId: visit.workspaceId,
        leadId: visit.leadId,
        actorId: userId,
        actorType: "user",
        type: "site_visit_completed",
        description: "Site visit completed.",
        occurredAt: new Date(),
      });
    } else if (body.status === "cancelled") {
      await LeadActivity.create({
        workspaceId: visit.workspaceId,
        leadId: visit.leadId,
        actorId: userId,
        actorType: "user",
        type: "site_visit_cancelled",
        description: "Site visit cancelled.",
        occurredAt: new Date(),
      });
    }
  }

  return ok({ visit });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  await SiteVisit.deleteOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  });
  return ok({ ok: true });
});
