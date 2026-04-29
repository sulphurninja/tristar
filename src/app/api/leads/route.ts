import mongoose from "mongoose";
import Lead from "@/models/Lead";
import Pipeline, { ensureDefaultPipeline } from "@/models/Pipeline";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim().toLowerCase() ?? "";
  const stage = url.searchParams.get("stage") ?? "";
  const priority = url.searchParams.get("priority") ?? "";
  const projectId = url.searchParams.get("projectId") ?? "";
  const assignedTo = url.searchParams.get("assignedTo") ?? "";
  const pipelineId = url.searchParams.get("pipelineId") ?? "";
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "100", 10), 500);
  const skip = Math.max(parseInt(url.searchParams.get("skip") ?? "0", 10), 0);

  const filter: Record<string, unknown> = {
    workspaceId: new mongoose.Types.ObjectId(session.workspaceId),
  };

  if (stage && stage !== "all") filter.stage = stage;
  if (priority && priority !== "all") filter.priority = priority;
  if (projectId) filter.primaryProjectId = new mongoose.Types.ObjectId(projectId);
  if (assignedTo) filter.assignedTo = new mongoose.Types.ObjectId(assignedTo);
  if (pipelineId && mongoose.isValidObjectId(pipelineId)) {
    filter.pipelineId = new mongoose.Types.ObjectId(pipelineId);
  }

  if (q) {
    filter.$or = [
      { "contact.name": { $regex: q, $options: "i" } },
      { "contact.primaryPhone": { $regex: q, $options: "i" } },
      { "contact.email": { $regex: q, $options: "i" } },
      { leadNumber: { $regex: q, $options: "i" } },
      { tags: { $in: [q] } },
    ];
  }

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "primaryProjectId", select: "name code" })
      .populate({ path: "assignedTo", select: "name email avatarUrl" })
      .lean(),
    Lead.countDocuments(filter),
  ]);

  return ok({ leads: items, total });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;

  const contact = body.contact as
    | { name?: string; primaryPhone?: string; email?: string; whatsappOptIn?: boolean }
    | undefined;

  if (!contact?.name || !contact?.primaryPhone) {
    return bad("Name and phone are required.");
  }

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  /* Resolve which pipeline this lead lives in. Falls back to the default. */
  let pipelineDoc;
  if (body.pipelineId && mongoose.isValidObjectId(body.pipelineId as string)) {
    pipelineDoc = await Pipeline.findOne({
      _id: body.pipelineId as string,
      workspaceId,
    });
    if (!pipelineDoc) return bad("Pipeline not found.");
  } else {
    pipelineDoc =
      (await Pipeline.findOne({ workspaceId, isDefault: true })) ??
      (await ensureDefaultPipeline(workspaceId, userId));
  }

  /* Validate stage against the pipeline's defined stages. */
  const stageInput = (body.stage as string) ?? pipelineDoc.stages?.[0]?.key ?? "new";
  const validStageKeys = new Set((pipelineDoc.stages ?? []).map((s) => s.key));
  if (!validStageKeys.has(stageInput)) {
    return bad(
      `Stage "${stageInput}" is not a valid stage of pipeline "${pipelineDoc.name}".`,
    );
  }

  /* Generate a friendly lead number */
  const yr = new Date().getFullYear();
  const count = await Lead.countDocuments({ workspaceId });
  const leadNumber = `TS-${yr}-${String(count + 1).padStart(5, "0")}`;

  const lead = await Lead.create({
    workspaceId,
    leadNumber,
    pipelineId: pipelineDoc._id,
    contact: {
      name: contact.name,
      firstName: contact.name?.split(" ")[0],
      lastName: contact.name?.split(" ").slice(1).join(" "),
      primaryPhone: contact.primaryPhone,
      email: (contact.email as string | undefined)?.toLowerCase(),
      whatsappOptIn: contact.whatsappOptIn ?? true,
      emailOptIn: true,
      smsOptIn: true,
      language: "en",
    },
    primaryProjectId: body.primaryProjectId
      ? new mongoose.Types.ObjectId(body.primaryProjectId as string)
      : undefined,
    interestedProjects: body.primaryProjectId
      ? [new mongoose.Types.ObjectId(body.primaryProjectId as string)]
      : [],
    preferences: body.preferences ?? {},
    stage: stageInput,
    priority: (body.priority as string) ?? "medium",
    source: { primary: (body.source as string) ?? "other", capturedAt: new Date() },
    description: body.description as string | undefined,
    tags: (body.tags as string[]) ?? [],
    score: { value: 0, label: "cold", closeProbability: 0 },
    assignedTo: body.assignedTo
      ? new mongoose.Types.ObjectId(body.assignedTo as string)
      : userId,
    assignedAt: new Date(),
    createdBy: userId,
  });

  await LeadActivity.create({
    workspaceId,
    leadId: lead._id,
    actorId: userId,
    actorType: "user",
    type: "lead_created",
    description: `Lead ${leadNumber} created — ${lead.contact.name}.`,
    occurredAt: new Date(),
  });

  return ok({ lead }, { status: 201 });
});
