import mongoose from "mongoose";
import SiteVisit from "@/models/SiteVisit";
import LeadActivity from "@/models/LeadActivity";
import Lead from "@/models/Lead";
import User from "@/models/User";
import Broker from "@/models/Broker";
import { withAuth, ok, bad } from "@/lib/api";
import { mustSeeOwnOnly } from "@/lib/task-filters";

const STATUSES = ["planned", "confirmed", "in_progress", "done", "no_show", "cancelled", "rescheduled"];
const MODES = ["in_person", "virtual", "phygital"];
const VISIT_TYPES = ["site_visit", "revisit", "final_visit", "virtual"];
const INTEREST = ["very_high", "high", "medium", "low", "none"];

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
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  const visit = await SiteVisit.findOne({ _id: params.id, workspaceId });
  if (!visit) return bad("Visit not found", 404);
  if (mustSeeOwnOnly(session.role) && String(visit.assignedTo) !== session.userId) {
    return bad("You can only change your own visits.", 403);
  }

  const fromStatus = visit.status;
  const fromTime = visit.scheduledAt;

  if (typeof body.remark === "string") visit.remark = body.remark.trim();
  if (typeof body.mode === "string" && MODES.includes(body.mode)) visit.mode = body.mode as typeof visit.mode;
  if (typeof body.visitType === "string" && VISIT_TYPES.includes(body.visitType)) {
    visit.visitType = body.visitType as typeof visit.visitType;
  }
  if (typeof body.virtualLink === "string") visit.virtualLink = body.virtualLink.trim();
  if (typeof body.cancelReason === "string") visit.cancelReason = body.cancelReason.trim();
  if (typeof body.cpPresent === "boolean") visit.cpPresent = body.cpPresent;
  if (body.brokerId !== undefined) {
    if (!body.brokerId) {
      visit.brokerId = undefined;
    } else {
      if (!mongoose.isValidObjectId(body.brokerId as string)) return bad("Invalid channel partner.");
      if (!(await Broker.exists({ _id: body.brokerId as string, workspaceId }))) {
        return bad("Channel partner not found.", 404);
      }
      visit.brokerId = new mongoose.Types.ObjectId(body.brokerId as string);
      visit.cpPresent = true;
    }
  }
  if (typeof body.status === "string") {
    if (!STATUSES.includes(body.status)) return bad("Invalid status.");
    visit.status = body.status as typeof visit.status;
    const now = new Date();
    if (body.status === "done") visit.completedAt = now;
    if (body.status === "cancelled") visit.cancelledAt = now;
    if (body.status === "no_show") visit.noShowAt = now;
  }
  if (body.scheduledAt !== undefined) {
    const d = new Date(body.scheduledAt as string);
    if (!body.scheduledAt || Number.isNaN(d.getTime())) return bad("Invalid scheduled time.");
    if (d.getTime() !== visit.scheduledAt.getTime()) {
      visit.scheduledAt = d;
      visit.rescheduleCount = (visit.rescheduleCount ?? 0) + 1;
      if (body.status === undefined && ["no_show", "cancelled", "rescheduled"].includes(visit.status as string)) {
        visit.status = "planned";
      }
    }
  }
  if (body.assignedTo !== undefined) {
    if (!mongoose.isValidObjectId(body.assignedTo as string)) return bad("Invalid assignee.");
    if (mustSeeOwnOnly(session.role)) return bad("You cannot reassign visits.", 403);
    const u = await User.findOne({ _id: body.assignedTo as string, workspaceId }).select("name").lean();
    if (!u) return bad("Assignee not found.", 404);
    visit.assignedTo = new mongoose.Types.ObjectId(body.assignedTo as string);
    visit.assignedToName = u.name;
    visit.assignedBy = userId;
  }
  const fb = body.feedback as Record<string, unknown> | undefined;
  if (fb && typeof fb === "object") {
    if (typeof fb.interest === "string" && INTEREST.includes(fb.interest)) visit.set("feedback.interest", fb.interest);
    if (typeof fb.notes === "string") visit.set("feedback.notes", fb.notes.trim());
    if (typeof fb.pricingFeedback === "string") visit.set("feedback.pricingFeedback", fb.pricingFeedback.trim());
    if (typeof fb.followUpRequired === "boolean") visit.set("feedback.followUpRequired", fb.followUpRequired);
    if (fb.followUpAt) {
      const f = new Date(fb.followUpAt as string);
      if (!Number.isNaN(f.getTime())) visit.set("feedback.followUpAt", f);
    }
  }

  await visit.save();

  const log = (
    type: "site_visit_completed" | "site_visit_cancelled" | "site_visit_scheduled" | "other",
    description: string,
  ) =>
    LeadActivity.create({
      workspaceId,
      leadId: visit.leadId,
      actorId: userId,
      actorType: "user",
      type,
      description,
      metadata: { visitId: String(visit._id) },
      occurredAt: new Date(),
    });

  if (visit.status !== fromStatus) {
    if (visit.status === "done") {
      await Lead.updateOne(
        { _id: visit.leadId, workspaceId },
        { $set: { lastContactedAt: new Date(), lastContactChannel: "site_visit" } },
      );
      await Lead.updateOne(
        { _id: visit.leadId, workspaceId, isBooked: { $ne: true } },
        { $set: { stage: "site_visit_done" } },
      );
      const note = (fb?.notes as string | undefined)?.trim();
      await log("site_visit_completed", `Site visit completed.${note ? ` Feedback: ${note}` : ""}`);
    } else if (visit.status === "cancelled") {
      await log(
        "site_visit_cancelled",
        `Site visit cancelled.${visit.cancelReason ? ` Reason: ${visit.cancelReason}` : ""}`,
      );
    } else if (visit.status === "no_show") {
      await log("other", "Lead did not show up for the scheduled site visit (No Show).");
    }
  }
  if (visit.scheduledAt.getTime() !== fromTime.getTime()) {
    await log("site_visit_scheduled", `Site visit rescheduled to ${visit.scheduledAt.toLocaleString("en-IN")}.`);
  }

  return ok({ visit });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const filter: Record<string, unknown> = {
    _id: params.id,
    workspaceId: new mongoose.Types.ObjectId(session.workspaceId),
  };
  if (mustSeeOwnOnly(session.role)) filter.assignedTo = new mongoose.Types.ObjectId(session.userId);
  const r = await SiteVisit.deleteOne(filter);
  if (!r.deletedCount) return bad("Visit not found", 404);
  return ok({ ok: true });
});
