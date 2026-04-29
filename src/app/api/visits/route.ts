import mongoose from "mongoose";
import SiteVisit from "@/models/SiteVisit";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "";
  const range = url.searchParams.get("range") ?? "upcoming"; // upcoming|today|past|all
  const projectId = url.searchParams.get("projectId") ?? "";

  const filter: Record<string, unknown> = {
    workspaceId: new mongoose.Types.ObjectId(session.workspaceId),
  };
  if (status && status !== "all") filter.status = status;
  if (projectId) filter.projectId = new mongoose.Types.ObjectId(projectId);

  const now = new Date();
  if (range === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    filter.scheduledAt = { $gte: start, $lte: end };
  } else if (range === "upcoming") {
    filter.scheduledAt = { $gte: now };
  } else if (range === "past") {
    filter.scheduledAt = { $lt: now };
  }

  const visits = await SiteVisit.find(filter)
    .sort({ scheduledAt: range === "past" ? -1 : 1 })
    .limit(200)
    .populate({ path: "leadId", select: "contact stage leadNumber" })
    .populate({ path: "projectId", select: "name code location" })
    .populate({ path: "assignedTo", select: "name email" })
    .lean();

  return ok({ visits });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.leadId || !body.projectId || !body.scheduledAt) {
    return bad("Lead, project and scheduled time are required.");
  }

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  const visit = await SiteVisit.create({
    workspaceId,
    leadId: new mongoose.Types.ObjectId(body.leadId as string),
    projectId: new mongoose.Types.ObjectId(body.projectId as string),
    scheduledAt: new Date(body.scheduledAt as string),
    durationMinutes: (body.durationMinutes as number) ?? 60,
    mode: (body.mode as string) ?? "in_person",
    virtualLink: body.virtualLink,
    assignedTo: body.assignedTo
      ? new mongoose.Types.ObjectId(body.assignedTo as string)
      : userId,
    status: "planned",
    createdBy: userId,
  });

  /* Bump lead stage to site_visit_scheduled */
  await Lead.updateOne(
    { _id: visit.leadId, workspaceId },
    { $set: { stage: "site_visit_scheduled" } },
  );

  await LeadActivity.create({
    workspaceId,
    leadId: visit.leadId,
    actorId: userId,
    actorType: "user",
    type: "site_visit_scheduled",
    description: `Site visit scheduled for ${new Date(visit.scheduledAt).toLocaleString("en-IN")}.`,
    occurredAt: new Date(),
  });

  return ok({ visit }, { status: 201 });
});
