import mongoose from "mongoose";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import Pipeline from "@/models/Pipeline";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");

  const lead = await Lead.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  })
    .populate({ path: "primaryProjectId", select: "name code location" })
    .populate({ path: "interestedProjects", select: "name code" })
    .populate({ path: "assignedTo", select: "name email avatarUrl" })
    .populate({ path: "brokerId", select: "name firmName phone" })
    .lean();

  if (!lead) return bad("Lead not found", 404);

  const activities = await LeadActivity.find({
    leadId: lead._id,
    workspaceId: lead.workspaceId,
  })
    .sort({ occurredAt: -1 })
    .limit(50)
    .lean();

  return ok({ lead, activities });
});

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Record<string, unknown>;

  const lead = await Lead.findOne({
    _id: params.id,
    workspaceId: session.workspaceId,
  });
  if (!lead) return bad("Lead not found", 404);

  const fromStage = lead.stage;
  const fromPipelineId = lead.pipelineId ? String(lead.pipelineId) : null;
  const fromPriority = lead.priority;

  /* If pipeline is changing or stage is changing, validate the target stage
     belongs to the (new) pipeline. */
  let nextPipelineId: mongoose.Types.ObjectId | undefined;
  if (body.pipelineId !== undefined) {
    if (!mongoose.isValidObjectId(body.pipelineId as string)) {
      return bad("Invalid pipelineId");
    }
    nextPipelineId = new mongoose.Types.ObjectId(body.pipelineId as string);
  }

  const targetPipelineId = nextPipelineId ?? lead.pipelineId;
  if (body.stage !== undefined || body.pipelineId !== undefined) {
    const pipeline = targetPipelineId
      ? await Pipeline.findOne({
          _id: targetPipelineId,
          workspaceId: session.workspaceId,
        })
      : null;
    if (pipeline) {
      const validKeys = new Set((pipeline.stages ?? []).map((s) => s.key));
      const targetStage = (body.stage as string | undefined) ?? lead.stage;
      if (!validKeys.has(targetStage as string)) {
        /* When the pipeline changed, default to the first stage of the new pipeline. */
        if (body.pipelineId !== undefined) {
          body.stage = pipeline.stages?.[0]?.key ?? "new";
        } else {
          return bad(
            `Stage "${targetStage}" is not part of pipeline "${pipeline.name}".`,
          );
        }
      }
    }
  }

  const updatable: Array<keyof typeof body> = [
    "stage",
    "pipelineId",
    "priority",
    "tags",
    "description",
    "primaryProjectId",
    "interestedProjects",
    "preferences",
    "nextActionAt",
    "nextActionType",
    "nextActionNote",
    "assignedTo",
    "documents",
  ];

  for (const k of updatable) {
    if (body[k] !== undefined) {
      // @ts-expect-error dynamic assignment
      lead[k] = body[k];
    }
  }

  if (body.contact) {
    Object.assign(lead.contact, body.contact);
  }

  await lead.save();

  const userId = new mongoose.Types.ObjectId(session.userId);

  if (body.stage && body.stage !== fromStage) {
    await LeadActivity.create({
      workspaceId: lead.workspaceId,
      leadId: lead._id,
      actorId: userId,
      actorType: "user",
      type: "stage_changed",
      description: `Stage changed from ${fromStage} to ${body.stage}.`,
      fromValue: fromStage,
      toValue: body.stage,
      occurredAt: new Date(),
    });
  }

  if (body.priority && body.priority !== fromPriority) {
    await LeadActivity.create({
      workspaceId: lead.workspaceId,
      leadId: lead._id,
      actorId: userId,
      actorType: "user",
      type: "priority_changed",
      description: `Priority changed from ${fromPriority} to ${body.priority}.`,
      fromValue: fromPriority,
      toValue: body.priority,
      occurredAt: new Date(),
    });
  }

  const newPipelineId = lead.pipelineId ? String(lead.pipelineId) : null;
  if (fromPipelineId !== newPipelineId) {
    await LeadActivity.create({
      workspaceId: lead.workspaceId,
      leadId: lead._id,
      actorId: userId,
      actorType: "user",
      type: "pipeline_changed",
      description: `Pipeline changed.`,
      fromValue: fromPipelineId ?? "",
      toValue: newPipelineId ?? "",
      occurredAt: new Date(),
    });
  }

  return ok({ lead });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const lead = await Lead.findOneAndDelete({
    _id: params.id,
    workspaceId: session.workspaceId,
  });
  if (!lead) return bad("Lead not found", 404);
  await LeadActivity.deleteMany({ leadId: lead._id });
  return ok({ ok: true });
});
