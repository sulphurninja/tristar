import mongoose from "mongoose";
import Lead from "@/models/Lead";
import Task from "@/models/Task";
import Pipeline, { ensureDefaultPipeline } from "@/models/Pipeline";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok, bad } from "@/lib/api";
import { buildLeadFilter } from "@/lib/lead-filters";
import { loadStageCatalog } from "@/lib/lead-stages";

const SORTS: Record<string, string> = {
  createdAt: "createdAt",
  assignedAt: "assignedAt",
  name: "contact.name",
  phone: "contact.primaryPhone",
  stage: "stage",
  source: "source.primary",
  nextActionAt: "nextActionAt",
  lastContactedAt: "lastContactedAt",
  updatedAt: "updatedAt",
};

const DAY = 86_400_000;

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const p = url.searchParams;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  /* Back-compat for other pages that still send assignedTo / projectId singles. */
  const limit = Math.min(Math.max(parseInt(p.get("limit") ?? "20", 10) || 20, 1), 500);
  const skip = Math.max(parseInt(p.get("skip") ?? "0", 10) || 0, 0);
  const sortField = SORTS[p.get("sort") ?? "createdAt"] ?? "createdAt";
  const dir = p.get("dir") === "asc" ? 1 : -1;

  const { filter, lost } = await buildLeadFilter(workspaceId, p, session.userId);

  const [items, total] = await Promise.all([
    Lead.find(filter)
      .select("-documents -score.factors -customFields")
      .sort({ [sortField]: dir, _id: -1 })
      .skip(skip)
      .limit(limit)
      .populate({ path: "primaryProjectId", select: "name code" })
      .populate({ path: "assignedTo", select: "name email avatarUrl" })
      .populate({ path: "brokerId", select: "name firmName" })
      .lean(),
    Lead.countDocuments(filter),
  ]);

  /* One extra query for the whole page: oldest overdue pending task per lead. */
  const now = new Date();
  const ids = items.map((l) => l._id);
  const overdueTasks = ids.length
    ? await Task.aggregate<{ _id: mongoose.Types.ObjectId; oldest: Date }>([
        {
          $match: {
            workspaceId,
            leadId: { $in: ids },
            status: { $in: ["pending", "upcoming"] },
            scheduleAt: { $lt: now },
          },
        },
        { $group: { _id: "$leadId", oldest: { $min: "$scheduleAt" } } },
      ])
    : [];
  const oldestByLead = new Map(overdueTasks.map((t) => [String(t._id), t.oldest]));

  const leads = items.map((l) => {
    const closed = l.isBooked || l.isInactive || l.stage === "booked" || lost.includes(l.stage);
    let delayDays: number | null = null;
    if (!closed) {
      const cands: number[] = [];
      if (l.nextActionAt && new Date(l.nextActionAt) < now) cands.push(new Date(l.nextActionAt).getTime());
      const t = oldestByLead.get(String(l._id));
      if (t) cands.push(new Date(t).getTime());
      if (cands.length) delayDays = Math.max(1, Math.floor((now.getTime() - Math.min(...cands)) / DAY));
    }
    const returning = !!(l.isReturning || (l.tags ?? []).includes("returning"));
    return { ...l, delayDays, returning };
  });

  return ok({ leads, total });
});

function str(v: unknown, max = 200) {
  return typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined;
}
function oidOrUndef(v: unknown) {
  return typeof v === "string" && mongoose.isValidObjectId(v) ? new mongoose.Types.ObjectId(v) : undefined;
}

function dateOrUndef(v: unknown) {
  if (typeof v !== "string" || !v) return undefined;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;

  const contact = body.contact as
    | {
        name?: string;
        firstName?: string;
        lastName?: string;
        primaryPhone?: string;
        altPhone?: string;
        email?: string;
        whatsappOptIn?: boolean;
      }
    | undefined;

  const name =
    str(contact?.name) ?? str([contact?.firstName, contact?.lastName].filter(Boolean).join(" "));
  const phone = str(contact?.primaryPhone, 30);
  if (!name || !phone) return bad("Name and phone are required.");

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  /* Resolve which pipeline this lead lives in. Falls back to the default. */
  let pipelineDoc;
  if (body.pipelineId && mongoose.isValidObjectId(body.pipelineId as string)) {
    pipelineDoc = await Pipeline.findOne({ _id: body.pipelineId as string, workspaceId });
    if (!pipelineDoc) return bad("Pipeline not found.");
  } else {
    pipelineDoc =
      (await Pipeline.findOne({ workspaceId, isDefault: true })) ??
      (await ensureDefaultPipeline(workspaceId, userId));
  }

  /* Validate stage against the pipeline (plus the extra Buildesk stage vocabulary). */
  const catalog = await loadStageCatalog(workspaceId, session.userId);
  const stageInput = (body.stage as string) ?? pipelineDoc.stages?.[0]?.key ?? "new";
  if (!catalog.some((s) => s.key === stageInput)) {
    return bad(`Stage "${stageInput}" is not a valid stage of pipeline "${pipelineDoc.name}".`);
  }

  const priority = ["low", "medium", "high", "vip"].includes(body.priority as string)
    ? (body.priority as string)
    : "medium";

  const yr = new Date().getFullYear();
  const count = await Lead.countDocuments({ workspaceId });
  const leadNumber = `TS-${yr}-${String(count + 1).padStart(5, "0")}`;

  /* A known number coming back in is a "returning" lead. */
  const existing = await Lead.exists({ workspaceId, "contact.primaryPhone": phone });

  const projectId = oidOrUndef(body.primaryProjectId);
  const brokerId = oidOrUndef(body.brokerId);
  const lead = await Lead.create({
    workspaceId,
    leadNumber,
    pipelineId: pipelineDoc._id,
    contact: {
      name,
      firstName: str(contact?.firstName) ?? name.split(" ")[0],
      lastName: str(contact?.lastName) ?? name.split(" ").slice(1).join(" "),
      primaryPhone: phone,
      altPhone: str(contact?.altPhone, 30),
      email: str(contact?.email)?.toLowerCase(),
      whatsappOptIn: contact?.whatsappOptIn ?? true,
      emailOptIn: true,
      smsOptIn: true,
      language: "en",
    },
    primaryProjectId: projectId,
    interestedProjects: projectId ? [projectId] : [],
    preferences: typeof body.preferences === "object" && body.preferences ? body.preferences : {},
    stage: stageInput,
    priority,
    source: { primary: str(body.source, 60) ?? "other", capturedAt: new Date() },
    description: str(body.description, 2000),
    category: str(body.category, 60),
    tags: Array.isArray(body.tags) ? (body.tags as unknown[]).filter((t): t is string => typeof t === "string").slice(0, 30) : [],
    score: { value: 0, label: "cold", closeProbability: 0 },
    brokerId,
    brokerName: undefined,
    cpTaggedAt: brokerId ? new Date() : undefined,
    preSalesAgentId: oidOrUndef(body.preSalesAgentId),
    country: str(body.country, 60),
    alternateNumbers: Array.isArray(body.alternateNumbers)
      ? (body.alternateNumbers as unknown[]).filter((t): t is string => typeof t === "string" && !!t.trim()).map((t) => t.trim().slice(0, 30)).slice(0, 10)
      : [],
    visitorType: str(body.visitorType, 60),
    address: str(body.address, 500),
    dateOfBirth: dateOrUndef(body.dateOfBirth),
    dateOfAnniversary: dateOrUndef(body.dateOfAnniversary),
    isRelatedSource: body.isRelatedSource === true,
    sourcingManagerId: oidOrUndef(body.sourcingManagerId),
    coOwners: Array.isArray(body.coOwners)
      ? (body.coOwners as unknown[]).map(oidOrUndef).filter((x): x is mongoose.Types.ObjectId => !!x)
      : [],
    createdAt: dateOrUndef(body.date),
    isReturning: !!existing,
    assignedTo: oidOrUndef(body.assignedTo) ?? userId,
    assignedAt: new Date(),
    createdBy: userId,
  });

  await LeadActivity.create({
    workspaceId,
    leadId: lead._id,
    actorId: userId,
    actorType: "user",
    type: "lead_created",
    description: `Lead ${leadNumber} created - ${lead.contact.name}.${existing ? " Returning enquiry (number already on file)." : ""}`,
    occurredAt: new Date(),
  });

  return ok({ lead }, { status: 201 });
});
