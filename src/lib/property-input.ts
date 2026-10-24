import mongoose from "mongoose";
import Project from "@/models/Project";

const STATUSES = ["available", "held", "booked", "sold", "unavailable"];
const VISIBILITY = ["public", "private", "internal"];
const AVAILABLE_FOR = ["sale", "rent", "both"];
const STRING_FIELDS = ["title", "inventoryType", "location", "city", "floor", "configuration", "ownerName", "ownerEmail", "ownerMobile", "notes"] as const;
const NUMBER_FIELDS = ["area", "price"] as const;

/** Validate + whitelist a property payload. Returns the clean field set or an error string. */
export async function sanitizeProperty(
  body: Record<string, unknown>,
  workspaceId: mongoose.Types.ObjectId,
  partial: boolean,
): Promise<{ data: Record<string, unknown> } | { error: string }> {
  const data: Record<string, unknown> = {};
  for (const k of STRING_FIELDS) {
    if (body[k] === undefined) continue;
    if (typeof body[k] !== "string") return { error: `Invalid ${k}.` };
    const v = (body[k] as string).trim();
    if (k === "title" && !v) return { error: "Title is required." };
    data[k] = v === "" && k !== "title" ? undefined : v;
  }
  if (!partial && !data.title) return { error: "Title is required." };
  if (typeof data.ownerEmail === "string" && !/^\S+@\S+\.\S+$/.test(data.ownerEmail)) return { error: "Enter a valid owner email." };
  for (const k of NUMBER_FIELDS) {
    if (body[k] === undefined || body[k] === null || body[k] === "") {
      if (body[k] !== undefined) data[k] = undefined;
      continue;
    }
    const n = Number(body[k]);
    if (!Number.isFinite(n) || n < 0) return { error: `${k} must be a positive number.` };
    data[k] = n;
  }
  const enums: Array<[string, string[]]> = [
    ["status", STATUSES],
    ["visibility", VISIBILITY],
    ["availableFor", AVAILABLE_FOR],
  ];
  for (const [k, allowed] of enums) {
    if (body[k] === undefined) continue;
    if (!allowed.includes(body[k] as string)) return { error: `Invalid ${k}.` };
    data[k] = body[k];
  }
  if (body.projectId !== undefined) {
    if (body.projectId === "" || body.projectId === null) data.projectId = undefined;
    else if (typeof body.projectId === "string" && mongoose.isValidObjectId(body.projectId)) {
      const p = await Project.findOne({ _id: body.projectId, workspaceId }).select("_id").lean();
      if (!p) return { error: "Project not found." };
      data.projectId = p._id;
    } else return { error: "Invalid project." };
  }
  return { data };
}
