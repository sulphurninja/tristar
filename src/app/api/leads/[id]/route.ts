import mongoose from "mongoose";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import Task from "@/models/Task";
import SiteVisit from "@/models/SiteVisit";
import User from "@/models/User";
import Broker from "@/models/Broker";
import Pipeline from "@/models/Pipeline";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole } from "@/lib/auth";
import { loadLeadDetail, logActivity, oidOf } from "@/lib/lead-detail";
import { loadStageCatalog } from "@/lib/lead-stages";

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const detail = await loadLeadDetail(params.id, session.workspaceId);
  if (!detail) return bad("Lead not found", 404);
  return ok(detail);
});

type Rec = Record<string, unknown>;
const isRec = (v: unknown): v is Rec => typeof v === "object" && v !== null && !Array.isArray(v);
const text = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : undefined);
const num = (v: unknown) => {
  if (v === null || v === "") return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : undefined;
};
const strArr = (v: unknown, max = 30) =>
  Array.isArray(v)
    ? (v as unknown[])
        .filter((x): x is string => typeof x === "string" && !!x.trim())
        .map((x) => x.trim().slice(0, 60))
        .slice(0, max)
    : undefined;

/** Set a dotted path from a whitelist of string/number fields in `src`. */
function pickInto(
  set: Rec,
  unset: Rec,
  prefix: string,
  src: unknown,
  fields: Record<string, "s" | "n" | "a">,
) {
  if (!isRec(src)) return;
  for (const [k, kind] of Object.entries(fields)) {
    if (!(k in src)) continue;
    const raw = src[k];
    let val: unknown;
    if (kind === "n") val = num(raw);
    else if (kind === "a") val = strArr(raw);
    else val = text(raw, 500);
    if (val === undefined) continue;
    if (val === null || val === "") unset[`${prefix}.${k}`] = "";
    else set[`${prefix}.${k}`] = val;
  }
}

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Rec;

  const lead = await Lead.findOne({ _id: params.id, workspaceId: session.workspaceId });
  if (!lead) return bad("Lead not found", 404);

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const set: Rec = {};
  const unset: Rec = {};
  const addToSet: Rec = {};
  const pull: Rec = {};
  const activities: Array<Parameters<typeof logActivity>[2]> = [];
  const now = new Date();

  /* ---- pipeline / stage ---- */
  if (body.pipelineId !== undefined) {
    const pid = oidOf(body.pipelineId);
    if (!pid) return bad("Invalid pipelineId");
    const pipeline = await Pipeline.findOne({ _id: pid, workspaceId }).lean();
    if (!pipeline) return bad("Pipeline not found.");
    set.pipelineId = pid;
    if (body.stage === undefined && !pipeline.stages?.some((s) => s.key === lead.stage)) {
      set.stage = pipeline.stages?.[0]?.key ?? "new";
    }
    activities.push({ type: "pipeline_changed", description: "Pipeline changed.", fromValue: String(lead.pipelineId ?? ""), toValue: String(pid) });
  }
  if (body.stage !== undefined) {
    const stage = text(body.stage, 60) ?? "";
    const catalog = await loadStageCatalog(workspaceId, session.userId);
    if (!catalog.some((s) => s.key === stage)) return bad(`Stage "${stage}" is not a valid stage.`);
    if (stage !== lead.stage) {
      const from = catalog.find((s) => s.key === lead.stage)?.label ?? lead.stage;
      const to = catalog.find((s) => s.key === stage)?.label ?? stage;
      set.stage = stage;
      set.isBooked = stage === "booked";
      set.isHot = stage === "hot";
      if (stage === "booked") set.convertedAt = now;
      if (catalog.find((s) => s.key === stage)?.type === "lost" || ["junk", "duplicate"].includes(stage)) {
        set.lostAt = now;
      }
      activities.push({ type: "stage_changed", description: `Stage changed from ${from} to ${to}.`, fromValue: lead.stage, toValue: stage });
    }
  }
  if (body.stageReason !== undefined) {
    const v = text(body.stageReason, 300);
    if (v) set.stageReason = v;
    else unset.stageReason = "";
  }
  if (body.priority !== undefined) {
    const v = text(body.priority, 20) ?? "";
    if (!["low", "medium", "high", "vip"].includes(v)) return bad("Invalid priority");
    if (v !== lead.priority) {
      set.priority = v;
      activities.push({ type: "priority_changed", description: `Priority changed from ${lead.priority} to ${v}.`, fromValue: lead.priority, toValue: v });
    }
  }

  /* ---- simple fields ---- */
  if (body.tags !== undefined) {
    const tags = strArr(body.tags);
    if (!tags) return bad("tags must be an array of strings");
    set.tags = Array.from(new Set(tags));
  }
  for (const k of ["description", "category", "country", "nextActionNote"] as const) {
    if (body[k] === undefined) continue;
    const v = text(body[k], k === "description" ? 4000 : 300);
    if (v) set[k] = v;
    else unset[k] = "";
  }
  if (body.nextActionType !== undefined) {
    const v = text(body.nextActionType, 20) ?? "";
    if (["call", "whatsapp", "email", "sms", "site_visit", "meeting"].includes(v)) set.nextActionType = v;
  }
  if (body.nextActionAt !== undefined) {
    if (body.nextActionAt === null || body.nextActionAt === "") unset.nextActionAt = "";
    else {
      const d = new Date(body.nextActionAt as string);
      if (Number.isNaN(d.getTime())) return bad("Invalid nextActionAt");
      set.nextActionAt = d;
    }
  }
  if (body.primaryProjectId !== undefined) {
    const pid = oidOf(body.primaryProjectId);
    if (pid) {
      set.primaryProjectId = pid;
      addToSet.interestedProjects = pid;
    } else unset.primaryProjectId = "";
  }
  if (isRec(body.source) && body.source.primary !== undefined) {
    const v = text(body.source.primary, 60);
    if (v) set["source.primary"] = v;
  }
  if (typeof body.isHot === "boolean") set.isHot = body.isHot;

  /* ---- contact ---- */
  if (isRec(body.contact)) {
    const c = body.contact;
    const name = text(c.name, 120);
    if (c.name !== undefined) {
      if (!name) return bad("Name cannot be empty.");
      set["contact.name"] = name;
      set["contact.firstName"] = name.split(" ")[0];
      set["contact.lastName"] = name.split(" ").slice(1).join(" ");
    }
    if (c.primaryPhone !== undefined) {
      const ph = text(c.primaryPhone, 30);
      if (!ph) return bad("Phone cannot be empty.");
      set["contact.primaryPhone"] = ph;
    }
    if (c.email !== undefined) {
      const em = text(c.email, 200)?.toLowerCase();
      if (em) set["contact.email"] = em;
      else unset["contact.email"] = "";
    }
    if (c.altPhone !== undefined) {
      const v = text(c.altPhone, 30);
      if (v) set["contact.altPhone"] = v;
      else unset["contact.altPhone"] = "";
    }
    for (const k of ["whatsappOptIn", "emailOptIn", "smsOptIn"] as const) {
      if (typeof c[k] === "boolean") set[`contact.${k}`] = c[k];
    }
  }

  /* ---- structured sections ---- */
  pickInto(set, unset, "employment", body.employment, { company: "s", type: "s", designation: "s", income: "n" });
  if (isRec(body.otherDetails)) {
    const od = body.otherDetails;
    if (od.loan !== undefined) set["otherDetails.loan"] = od.loan === "Yes" ? "Yes" : "No";
    if (od.ethnicity !== undefined) {
      const v = text(od.ethnicity, 100);
      if (v) set["otherDetails.ethnicity"] = v;
      else unset["otherDetails.ethnicity"] = "";
    }
  }
  if (body.requirement !== undefined) {
    pickInto(set, unset, "requirement", body.requirement, {
      budgetMin: "n",
      budgetMax: "n",
      areaMin: "n",
      areaMax: "n",
      requirementType: "s",
      propertyType: "s",
      subType: "s",
      unitTypes: "a",
      searchLocation: "s",
      streetAddress: "s",
      location: "s",
      subLocation: "s",
    });
    if (isRec(body.requirement)) {
      /* Mirror the budget into the legacy preferences block other reports read. */
      const r = body.requirement;
      const lo = num(r.budgetMin);
      const hi = num(r.budgetMax);
      if (lo !== undefined) (lo === null ? unset : set)["preferences.minBudget"] = lo ?? "";
      if (hi !== undefined) (hi === null ? unset : set)["preferences.maxBudget"] = hi ?? "";
    }
    activities.push({ type: "requirement_updated", description: "Requirements updated." });
  }

  /* ---- people ---- */
  if (body.assignedTo !== undefined) {
    const uid = body.assignedTo ? oidOf(body.assignedTo) : null;
    if (body.assignedTo && !uid) return bad("Invalid assignedTo");
    if (uid) {
      const u = await User.findOne({ _id: uid, workspaceId }).select("name").lean();
      if (!u) return bad("User not found.");
      if (String(lead.assignedTo ?? "") !== String(uid)) {
        set.assignedTo = uid;
        set.assignedAt = now;
        pull.coOwners = uid;
        activities.push({ type: "lead_assigned", description: `Lead transferred to ${u.name}.`, toValue: String(uid), fromValue: String(lead.assignedTo ?? "") });
      }
    } else if (lead.assignedTo) {
      unset.assignedTo = "";
      activities.push({ type: "lead_unassigned", description: "Lead owner removed.", fromValue: String(lead.assignedTo) });
    }
  }
  if (body.preSalesAgentId !== undefined) {
    const uid = body.preSalesAgentId ? oidOf(body.preSalesAgentId) : null;
    if (body.preSalesAgentId && !uid) return bad("Invalid preSalesAgentId");
    if (uid) {
      if (!(await User.exists({ _id: uid, workspaceId }))) return bad("User not found.");
      set.preSalesAgentId = uid;
    } else unset.preSalesAgentId = "";
  }
  if (typeof body.addCoOwner === "string") {
    const uid = oidOf(body.addCoOwner);
    const u = uid ? await User.findOne({ _id: uid, workspaceId }).select("name").lean() : null;
    if (!uid || !u) return bad("User not found.");
    if (String(lead.assignedTo ?? "") === String(uid)) return bad(`${u.name} is already the lead owner.`);
    addToSet.coOwners = uid;
    activities.push({ type: "owner_added", description: `${u.name} added as lead owner.`, toValue: String(uid) });
  }
  if (typeof body.removeOwner === "string") {
    const uid = oidOf(body.removeOwner);
    if (!uid) return bad("Invalid owner id");
    const u = await User.findOne({ _id: uid, workspaceId }).select("name").lean();
    if (String(lead.assignedTo ?? "") === String(uid)) {
      /* Promote the first co-owner, or leave the lead unassigned. */
      const next = (lead.coOwners ?? []).find((c) => String(c) !== String(uid));
      if (next) {
        set.assignedTo = next;
        pull.coOwners = next;
      } else unset.assignedTo = "";
    } else {
      pull.coOwners = uid;
    }
    activities.push({ type: "owner_removed", description: `${u?.name ?? "Owner"} removed from lead owners.`, fromValue: String(uid) });
  }

  /* ---- channel partner ---- */
  if (body.brokerId !== undefined) {
    const bid = body.brokerId ? oidOf(body.brokerId) : null;
    if (body.brokerId && !bid) return bad("Invalid brokerId");
    if (bid) {
      const b = await Broker.findOne({ _id: bid, workspaceId }).select("name firmName").lean();
      if (!b) return bad("Channel partner not found.");
      set.brokerId = bid;
      set.brokerName = b.firmName ? `${b.name} (${b.firmName})` : b.name;
      set.cpTaggedAt = now;
      activities.push({ type: "cp_linked", description: `Channel partner ${b.name} linked.`, toValue: String(bid) });
    } else if (lead.brokerId) {
      unset.brokerId = "";
      unset.brokerName = "";
      unset.cpTaggedAt = "";
      activities.push({ type: "cp_unlinked", description: "Channel partner removed.", fromValue: String(lead.brokerId) });
    }
  }

  /* ---- interests ---- */
  const pidAdd = oidOf(body.addInterestedProject);
  if (pidAdd) {
    addToSet.interestedProjects = pidAdd;
    activities.push({ type: "interest_added", description: "Project added to interests.", toValue: String(pidAdd) });
  }
  const pidDel = oidOf(body.removeInterestedProject);
  if (pidDel) {
    pull.interestedProjects = pidDel;
    activities.push({ type: "interest_removed", description: "Project removed from interests.", fromValue: String(pidDel) });
  }
  const propAdd = oidOf(body.addInterestedProperty);
  if (propAdd) {
    addToSet.interestedProperties = propAdd;
    activities.push({ type: "interest_added", description: "Property added to interests.", toValue: String(propAdd) });
  }
  const propDel = oidOf(body.removeInterestedProperty);
  if (propDel) {
    pull.interestedProperties = propDel;
    activities.push({ type: "interest_removed", description: "Property removed from interests.", fromValue: String(propDel) });
  }

  /* ---- convert to contact ---- */
  if (body.convertToContact === true) {
    set.isContact = true;
    set.contactStatus = "lead";
    set.convertedToContactAt = now;
    activities.push({ type: "contact_converted", description: "Lead converted to contact." });
  }

  /* Don't let the same key sit in both $addToSet and $pull on one path. */
  if (addToSet.coOwners && pull.coOwners) delete pull.coOwners;
  if (addToSet.interestedProjects && pull.interestedProjects) delete pull.interestedProjects;

  const update: Rec = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;
  if (Object.keys(addToSet).length) update.$addToSet = addToSet;
  if (Object.keys(pull).length) update.$pull = pull;
  if (!Object.keys(update).length) return bad("Nothing to update.");

  await Lead.updateOne({ _id: lead._id, workspaceId }, update, { runValidators: true });
  for (const a of activities) await logActivity(session, lead, a);

  const detail = await loadLeadDetail(params.id, session.workspaceId);
  return ok(detail);
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  if (!hasRole(session.role, "manager")) return bad("You need manager access to delete leads.", 403);
  const lead = await Lead.findOneAndDelete({ _id: params.id, workspaceId: session.workspaceId });
  if (!lead) return bad("Lead not found", 404);
  await Promise.all([
    LeadActivity.deleteMany({ leadId: lead._id }),
    Task.deleteMany({ leadId: lead._id, workspaceId: lead.workspaceId, status: { $in: ["pending", "upcoming"] } }),
    SiteVisit.deleteMany({ leadId: lead._id, workspaceId: lead.workspaceId, status: { $in: ["planned", "confirmed"] } }),
  ]);
  return ok({ ok: true });
});
