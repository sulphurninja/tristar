import mongoose from "mongoose";
import Lead from "@/models/Lead";
import User from "@/models/User";
import Project from "@/models/Project";
import Pipeline, { ensureDefaultPipeline } from "@/models/Pipeline";
import LeadActivity from "@/models/LeadActivity";
import { loadStageCatalog } from "@/lib/lead-stages";
import { pickAgent } from "@/lib/distribution";
import { withAuth, ok, bad } from "@/lib/api";

type Oid = mongoose.Types.ObjectId;
type Row = Record<string, string>;

/** CSV parser that handles quoted strings (incl. commas and newlines inside quotes). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let buf = "";
  let inQuotes = false;
  const src = text.replace(/^﻿/, "");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"' && src[i + 1] === '"') {
        buf += '"';
        i += 1;
      } else if (ch === '"') inQuotes = false;
      else buf += ch;
    } else if (ch === '"') inQuotes = true;
    else if (ch === ",") {
      cur.push(buf);
      buf = "";
    } else if (ch === "\n") {
      cur.push(buf);
      rows.push(cur);
      cur = [];
      buf = "";
    } else if (ch !== "\r") buf += ch;
  }
  if (buf.length || cur.length) {
    cur.push(buf);
    rows.push(cur);
  }
  return rows;
}

/**
 * Friendly header → canonical key. Matching ignores case, spaces and punctuation,
 * so "Assigned To", "assigned_to" and "AssignedTo" all work.
 */
const ALIASES: Record<string, string[]> = {
  leadNumber: ["leadnumber", "leadno", "leadid"],
  name: ["name", "fullname", "leadname", "customername", "contactname"],
  firstName: ["firstname", "first"],
  lastName: ["lastname", "last", "surname"],
  phone: ["phone", "mobile", "mobileno", "mobilenumber", "phonenumber", "primaryphone", "contactprimaryphone", "contact", "number"],
  altPhone: ["altphone", "secondaryphone", "alternatephone", "alternatenumber"],
  email: ["email", "emailid", "mail"],
  username: ["username", "user", "assignedto", "assignee", "agent", "salesagent", "owner", "assignedusername", "salesagentusername"],
  preSales: ["presales", "presalesagent", "presalesusername"],
  stage: ["stage", "leadstage", "status"],
  stageReason: ["stagereason"],
  priority: ["priority"],
  category: ["category", "leadcategory"],
  source: ["source", "leadsource"],
  subSource: ["subsource", "leadsubsource"],
  project: ["project", "projectname", "primaryproject", "primaryprojectid", "projectcode"],
  tags: ["tags", "tag"],
  description: ["description", "remark", "remarks", "notes", "note", "comment"],
  city: ["city"],
  residentialAddress: ["residentialaddress", "address"],
  occupation: ["occupation"],
  configuration: ["configuration", "config", "unittype", "bhk"],
  budgetRange: ["budgetrange", "budget"],
};
const HEADER_KEY = new Map<string, string>();
for (const [key, list] of Object.entries(ALIASES)) for (const a of list) HEADER_KEY.set(a, key);
const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9]/g, "");

function toRows(grid: string[][]): { rows: Row[]; unknown: string[] } {
  if (!grid.length) return { rows: [], unknown: [] };
  const headers = grid[0].map((h) => HEADER_KEY.get(norm(h)) ?? "");
  const unknown = grid[0].filter((h, i) => h.trim() && !headers[i]);
  const rows: Row[] = [];
  for (let r = 1; r < grid.length; r++) {
    if (grid[r].every((c) => !c.trim())) continue;
    const o: Row = {};
    headers.forEach((k, i) => {
      if (k && !o[k]) o[k] = (grid[r][i] ?? "").trim();
    });
    rows.push(o);
  }
  return { rows, unknown };
}

function parseMoney(s: string): number | undefined {
  if (!s) return undefined;
  const m = s.replace(/,/g, "").match(/^([\d.]+)\s*(L|Lac|Lakh|Cr|Crore|K)?/i);
  if (!m) return undefined;
  const n = parseFloat(m[1]);
  const u = (m[2] ?? "").toLowerCase();
  if (u.startsWith("l")) return Math.round(n * 1e5);
  if (u.startsWith("c")) return Math.round(n * 1e7);
  if (u === "k") return Math.round(n * 1e3);
  return Math.round(n);
}

const digits = (p: string) => p.replace(/\D/g, "");
const slug = (v: string) => v.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");

/**
 * POST { csv, createMissing?: boolean (default true) }
 * Rows that match an existing lead (by leadNumber or mobile) are updated; other
 * rows with a name and mobile become new leads. A `username` / `assigned to`
 * column assigns the lead to that user; rows without one go through Users →
 * Distribution, else stay with the importer.
 */
export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as { csv?: string; createMissing?: boolean };
  if (!body.csv || typeof body.csv !== "string") return bad("CSV body is required.");
  const createMissing = body.createMissing !== false;

  const { rows, unknown } = toRows(parseCsv(body.csv));
  if (rows.length === 0) return bad("The file has no data rows.");
  if (rows.length > 5000) return bad("Maximum 5,000 rows per upload.");

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  /* Per-request lookups */
  const stageMap = new Map<string, string>();
  for (const s of await loadStageCatalog(workspaceId, session.userId)) {
    stageMap.set(s.key.toLowerCase(), s.key);
    stageMap.set(s.label.toLowerCase(), s.key);
  }
  const userMap = new Map<string, { id: Oid; name: string }>();
  const users = await User.find({ workspaceId, status: { $ne: "deleted" } }).select("name email username").lean();
  for (const u of users) {
    const v = { id: u._id, name: u.name };
    userMap.set(String(u._id), v);
    userMap.set(u.email.toLowerCase(), v);
    userMap.set(u.name.toLowerCase(), v);
    if (u.username) userMap.set(u.username.toLowerCase(), v);
  }
  const findUser = (v: string) => userMap.get(v.trim().toLowerCase().replace(/^@/, ""));
  const projectMap = new Map<string, Oid>();
  for (const p of await Project.find({ workspaceId }).select("name code").lean()) {
    projectMap.set(String(p._id), p._id);
    projectMap.set(p.name.toLowerCase(), p._id);
    if (p.code) projectMap.set(p.code.toLowerCase(), p._id);
  }

  const pipeline =
    (await Pipeline.findOne({ workspaceId, isDefault: true })) ?? (await ensureDefaultPipeline(workspaceId, userId));
  const firstStage = pipeline.stages?.[0]?.key ?? "new";
  let seq = await Lead.countDocuments({ workspaceId });
  const yr = new Date().getFullYear();
  const actor = await User.findById(userId).select("name").lean();

  let created = 0;
  let updated = 0;
  let skipped = 0;
  const byAgent = new Map<string, number>();
  const errors: Array<{ row: number; reason: string }> = [];
  const warnings: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2;
    const phoneDigits = digits(row.phone ?? "");

    let lead = row.leadNumber ? await Lead.findOne({ workspaceId, leadNumber: row.leadNumber }) : null;
    if (!lead && phoneDigits.length >= 7) {
      lead = await Lead.findOne({ workspaceId, "contact.primaryPhone": { $regex: `${phoneDigits.slice(-10)}$` } });
    }

    /* Assignment by username / email / name */
    let assignee: { id: Oid; name: string } | undefined;
    if (row.username) {
      assignee = findUser(row.username);
      if (!assignee) warnings.push({ row: rowNum, reason: `No user with username "${row.username}" — used distribution instead.` });
    }
    const preSales = row.preSales ? findUser(row.preSales) : undefined;
    const projectId = row.project ? projectMap.get(row.project.toLowerCase()) : undefined;
    if (row.project && !projectId) warnings.push({ row: rowNum, reason: `Project "${row.project}" not found.` });
    const stage = row.stage ? stageMap.get(row.stage.toLowerCase()) : undefined;
    if (row.stage && !stage) warnings.push({ row: rowNum, reason: `Stage "${row.stage}" not recognised.` });

    const now = new Date();
    if (!lead) {
      if (!createMissing) {
        skipped += 1;
        errors.push({ row: rowNum, reason: "No existing lead with this lead number or mobile." });
        continue;
      }
      const name = row.name || [row.firstName, row.lastName].filter(Boolean).join(" ");
      if (!name || phoneDigits.length < 7) {
        skipped += 1;
        errors.push({ row: rowNum, reason: "New leads need a name and a mobile number." });
        continue;
      }
      const source = row.source ? slug(row.source) : "import";
      const owner = assignee?.id ?? (await pickAgent(workspaceId, { source, projectId })) ?? userId;
      const max = parseMoney((row.budgetRange ?? "").split(/[-–]/)[1] ?? row.budgetRange ?? "");
      const min = row.budgetRange?.match(/[-–]/) ? parseMoney(row.budgetRange.split(/[-–]/)[0]) : undefined;
      seq += 1;
      const doc = await Lead.create({
        workspaceId,
        leadNumber: `TS-${yr}-${String(seq).padStart(5, "0")}`,
        pipelineId: pipeline._id,
        contact: {
          name,
          firstName: row.firstName || name.split(" ")[0],
          lastName: row.lastName || name.split(" ").slice(1).join(" "),
          primaryPhone: row.phone.startsWith("+") ? row.phone : phoneDigits.length === 10 ? `+91${phoneDigits}` : `+${phoneDigits}`,
          altPhone: row.altPhone || undefined,
          email: row.email?.toLowerCase() || undefined,
        },
        stage: stage ?? firstStage,
        priority: ["low", "medium", "high", "vip"].includes(row.priority) ? row.priority : "medium",
        category: row.category || undefined,
        stageReason: row.stageReason || undefined,
        description: row.description || undefined,
        source: { primary: source, subSource: row.subSource || undefined, capturedAt: now },
        primaryProjectId: projectId,
        interestedProjects: projectId ? [projectId] : [],
        tags: row.tags ? row.tags.split(/[,;]/).map((t) => t.trim()).filter(Boolean) : [],
        preferences: {
          ...(row.occupation ? { occupation: row.occupation } : {}),
          ...(row.city ? { cities: [row.city] } : {}),
          ...(row.configuration ? { configurations: row.configuration.split(/[,;]/).map((x) => x.trim()).filter(Boolean) } : {}),
          ...(min != null ? { minBudget: min } : {}),
          ...(max != null ? { maxBudget: max } : {}),
        },
        customFields: row.residentialAddress ? { residentialAddress: row.residentialAddress } : undefined,
        preSalesAgentId: preSales?.id,
        assignedTo: owner,
        assignedAt: now,
        isHot: stage === "hot",
        isBooked: stage === "booked",
        score: { value: 0, label: "cold", closeProbability: 0 },
        createdBy: userId,
      });
      created += 1;
      const ownerName = userMap.get(String(owner))?.name ?? "you";
      byAgent.set(ownerName, (byAgent.get(ownerName) ?? 0) + 1);
      await LeadActivity.create({
        workspaceId,
        leadId: doc._id,
        actorId: userId,
        actorName: actor?.name,
        actorType: "user",
        type: "imported",
        description: `Imported from file (row ${rowNum})${assignee ? ` and assigned to ${assignee.name}` : ""}.`,
        occurredAt: now,
      });
      continue;
    }

    /* Update an existing lead with whatever the row provides */
    let touched = false;
    if (stage) {
      lead.stage = stage;
      lead.isBooked = stage === "booked";
      lead.isHot = stage === "hot";
      touched = true;
    }
    if (["low", "medium", "high", "vip"].includes(row.priority)) (lead.priority = row.priority as "low" | "medium" | "high" | "vip"), (touched = true);
    if (row.description) (lead.description = row.description), (touched = true);
    if (row.category) (lead.category = row.category), (touched = true);
    if (row.stageReason) (lead.stageReason = row.stageReason), (touched = true);
    if (row.source) {
      lead.set("source.primary", slug(row.source));
      touched = true;
    }
    if (assignee && String(lead.assignedTo ?? "") !== String(assignee.id)) {
      lead.assignedTo = assignee.id;
      lead.assignedAt = now;
      byAgent.set(assignee.name, (byAgent.get(assignee.name) ?? 0) + 1);
      touched = true;
    }
    if (preSales) (lead.preSalesAgentId = preSales.id), (touched = true);
    if (projectId) {
      lead.primaryProjectId = projectId;
      if (!lead.interestedProjects.map(String).includes(String(projectId))) lead.interestedProjects.push(projectId);
      touched = true;
    }
    if (row.tags) (lead.tags = row.tags.split(/[,;]/).map((t) => t.trim()).filter(Boolean)), (touched = true);
    if (row.occupation) (lead.set("preferences.occupation", row.occupation), (touched = true));
    if (row.configuration)
      (lead.set("preferences.configurations", row.configuration.split(/[,;]/).map((x) => x.trim()).filter(Boolean)), (touched = true));
    if (row.residentialAddress) (lead.set("customFields.residentialAddress", row.residentialAddress), (touched = true));
    if (row.budgetRange) {
      const parts = row.budgetRange.split(/[-–]/);
      const min = parts.length > 1 ? parseMoney(parts[0]) : undefined;
      const max = parseMoney(parts[parts.length - 1]);
      if (min != null) lead.set("preferences.minBudget", min);
      if (max != null) lead.set("preferences.maxBudget", max);
      touched = true;
    }
    if (!touched) {
      skipped += 1;
      errors.push({ row: rowNum, reason: "Matched a lead, but the row has nothing to update." });
      continue;
    }
    await lead.save();
    updated += 1;
    await LeadActivity.create({
      workspaceId,
      leadId: lead._id,
      actorId: userId,
      actorName: actor?.name,
      actorType: "user",
      type: "imported",
      description: `Updated from file (row ${rowNum}).`,
      metadata: { row },
      occurredAt: now,
    });
  }

  return ok({
    result: {
      total: rows.length,
      created,
      updated,
      matched: updated,
      skipped,
      assigned: [...byAgent.entries()].map(([name, count]) => ({ name, count })),
      ignoredColumns: unknown,
      errors,
      warnings,
    },
  });
});
