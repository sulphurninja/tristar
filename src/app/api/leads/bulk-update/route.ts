import mongoose from "mongoose";
import Lead from "@/models/Lead";
import User from "@/models/User";
import Project from "@/models/Project";
import { loadStageCatalog } from "@/lib/lead-stages";
import LeadActivity from "@/models/LeadActivity";
import { withAuth, ok, bad } from "@/lib/api";

/**
 * Tiny CSV parser that handles quoted strings (incl. commas inside quotes).
 * Returns an array of row objects keyed by the header row.
 */
function parseCsv(text: string): Array<Record<string, string>> {
  const rows: string[][] = [];
  let cur: string[] = [];
  let buf = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        buf += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        buf += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") {
        cur.push(buf);
        buf = "";
      } else if (ch === "\n") {
        cur.push(buf);
        rows.push(cur);
        cur = [];
        buf = "";
      } else if (ch === "\r") {
        // ignore
      } else {
        buf += ch;
      }
    }
  }
  if (buf.length || cur.length) {
    cur.push(buf);
    rows.push(cur);
  }
  if (rows.length === 0) return [];
  const headers = rows[0].map((h) => h.trim());
  const out: Array<Record<string, string>> = [];
  for (let r = 1; r < rows.length; r++) {
    if (rows[r].every((c) => c.trim() === "")) continue;
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => {
      obj[h] = (rows[r][i] ?? "").trim();
    });
    out.push(obj);
  }
  return out;
}

/** Valid stage keys for the current request (loaded from the pipeline in POST). */
const STAGE_MAP = new Map<string, string>();
/** lower-cased id / e-mail / name -> user id, and id / code / name -> project id. */
const USER_MAP = new Map<string, mongoose.Types.ObjectId>();
const PROJECT_MAP = new Map<string, mongoose.Types.ObjectId>();

/* Headers we know how to apply directly to a Lead document. */
const APPLY_FIELDS: Array<{
  header: string;
  apply: (lead: { [k: string]: unknown }, value: string) => void;
}> = [
  {
    header: "stage",
    apply: (lead, v) => {
      const key = STAGE_MAP.get(v.toLowerCase());
      if (key) {
        lead.stage = key;
        lead.isBooked = key === "booked";
        lead.isHot = key === "hot";
      }
    },
  },
  {
    header: "priority",
    apply: (lead, v) => {
      if (["low", "medium", "high", "vip"].includes(v)) lead.priority = v;
    },
  },
  { header: "description", apply: (lead, v) => (lead.description = v) },
  { header: "category", apply: (lead, v) => (lead.category = v) },
  { header: "stageReason", apply: (lead, v) => (lead.stageReason = v) },
  {
    header: "source",
    apply: (lead, v) => {
      lead.source = { ...((lead.source as object) ?? {}), primary: v.toLowerCase().replace(/[^a-z0-9]+/g, "_") };
    },
  },
  {
    header: "assignedTo",
    apply: (lead, v) => {
      const id = USER_MAP.get(v.toLowerCase());
      if (id && String(lead.assignedTo ?? "") !== String(id)) {
        lead.assignedTo = id;
        lead.assignedAt = new Date();
      }
    },
  },
  {
    header: "primaryProjectId",
    apply: (lead, v) => {
      const id = PROJECT_MAP.get(v.toLowerCase());
      if (id) {
        lead.primaryProjectId = id;
        const list = ((lead.interestedProjects as mongoose.Types.ObjectId[]) ?? []).map(String);
        if (!list.includes(String(id))) lead.interestedProjects = [...((lead.interestedProjects as mongoose.Types.ObjectId[]) ?? []), id];
      }
    },
  },
  {
    header: "tags",
    apply: (lead, v) => {
      if (v) lead.tags = v.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    },
  },
  {
    header: "residentialAddress",
    apply: (lead, v) => {
      const cf = (lead.customFields as Record<string, unknown>) ?? {};
      cf.residentialAddress = v;
      lead.customFields = cf;
    },
  },
  {
    header: "occupation",
    apply: (lead, v) => {
      lead.preferences = { ...(lead.preferences as object), occupation: v };
    },
  },
  {
    header: "configuration",
    apply: (lead, v) => {
      const arr = v.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      lead.preferences = {
        ...(lead.preferences as object),
        configurations: arr,
      };
    },
  },
  {
    header: "budgetRange",
    apply: (lead, v) => {
      // accepts "60L-90L" or "5000000-9000000"
      const parts = v.split(/[-–]/).map((s) => s.trim());
      const toNum = (s: string) => {
        if (!s) return undefined;
        const m = s.match(/^([\d.]+)\s*(L|Cr|K)?/i);
        if (!m) return Number.isFinite(+s) ? +s : undefined;
        const n = parseFloat(m[1]);
        const u = (m[2] ?? "").toUpperCase();
        if (u === "L") return Math.round(n * 100_000);
        if (u === "CR") return Math.round(n * 10_000_000);
        if (u === "K") return Math.round(n * 1_000);
        return Math.round(n);
      };
      const minBudget = toNum(parts[0]);
      const maxBudget = toNum(parts[1] ?? "");
      lead.preferences = {
        ...(lead.preferences as object),
        ...(minBudget != null ? { minBudget } : {}),
        ...(maxBudget != null ? { maxBudget } : {}),
      };
    },
  },
];

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as { csv?: string };
  if (!body.csv || typeof body.csv !== "string") {
    return bad("CSV body is required.");
  }

  const catalog = await loadStageCatalog(new mongoose.Types.ObjectId(session.workspaceId), session.userId);
  STAGE_MAP.clear();
  for (const s of catalog) {
    STAGE_MAP.set(s.key.toLowerCase(), s.key);
    STAGE_MAP.set(s.label.toLowerCase(), s.key);
  }
  const wsId = new mongoose.Types.ObjectId(session.workspaceId);
  USER_MAP.clear();
  for (const u of await User.find({ workspaceId: wsId }).select("name email").lean()) {
    USER_MAP.set(String(u._id).toLowerCase(), u._id);
    USER_MAP.set(u.email.toLowerCase(), u._id);
    USER_MAP.set(u.name.toLowerCase(), u._id);
  }
  PROJECT_MAP.clear();
  for (const p of await Project.find({ workspaceId: wsId }).select("name code").lean()) {
    PROJECT_MAP.set(String(p._id).toLowerCase(), p._id);
    PROJECT_MAP.set(p.name.toLowerCase(), p._id);
    PROJECT_MAP.set(p.code.toLowerCase(), p._id);
  }
  const rows = parseCsv(body.csv);
  if (rows.length > 5000) return bad("Maximum 5,000 rows per upload.");
  if (rows.length === 0) return bad("CSV is empty.");

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  let matched = 0;
  let updated = 0;
  let skipped = 0;
  const errors: Array<{ row: number; reason: string }> = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-based + header

    const leadNumber = row.leadNumber || row.lead_number;
    const phone = row.phone || row.primaryPhone || row["contact.primaryPhone"];

    let lead = null;
    if (leadNumber) {
      lead = await Lead.findOne({ workspaceId, leadNumber });
    }
    if (!lead && phone) {
      lead = await Lead.findOne({ workspaceId, "contact.primaryPhone": phone });
    }
    if (!lead) {
      skipped += 1;
      errors.push({ row: rowNum, reason: "No matching lead by leadNumber or phone." });
      continue;
    }
    matched += 1;

    let touched = false;
    for (const def of APPLY_FIELDS) {
      const value = row[def.header];
      if (value !== undefined && value !== "") {
        def.apply(lead as unknown as Record<string, unknown>, value);
        touched = true;
      }
    }

    if (!touched) {
      skipped += 1;
      errors.push({ row: rowNum, reason: "No updatable fields in this row." });
      continue;
    }

    await lead.save();
    updated += 1;

    await LeadActivity.create({
      workspaceId,
      leadId: lead._id,
      actorId: userId,
      actorType: "user",
      type: "imported",
      description: `Bulk update applied — row ${rowNum}.`,
      metadata: { row },
      occurredAt: new Date(),
    });
  }

  return ok({
    result: { total: rows.length, matched, updated, skipped, errors },
  });
});
