import mongoose from "mongoose";
import Master from "@/models/Master";
import { withAuth, ok, bad } from "@/lib/api";
import { MASTER_TYPE_KEYS } from "@/lib/masters";
import { masterFields } from "@/lib/master-input";

type Body = Record<string, unknown>;

const str = (v: unknown, max = 200) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : undefined);

/**
 * GET /api/masters            → every entry in the workspace (lists are small)
 * GET /api/masters?type=a,b   → only those types
 * Readable by any signed-in user: forms across the app use these lists.
 */
export const GET = withAuth(async ({ req, session }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const types = (new URL(req.url).searchParams.get("type") ?? "").split(",").filter(Boolean);
  const filter: Record<string, unknown> = { workspaceId };
  if (types.length) filter.type = { $in: types };
  const items = await Master.find(filter).sort({ type: 1, order: 1, name: 1 }).lean();
  return ok({ items });
});

/**
 * POST { type, name, parentId?, code?, color?, min?, max?, url?, description? }
 * POST { type, parentId?, items: [{ name, … }] } — bulk add (suggested values).
 */
export const POST = withAuth(async ({ req, session }) => {
  const b = (await req.json()) as Body;
  const type = str(b.type, 40);
  if (!type || !MASTER_TYPE_KEYS.has(type)) return bad("Unknown list type.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const parentId =
    typeof b.parentId === "string" && mongoose.isValidObjectId(b.parentId)
      ? new mongoose.Types.ObjectId(b.parentId)
      : undefined;

  const rows = (Array.isArray(b.items) ? (b.items as Body[]) : [b]).map(masterFields).filter((r) => r.name);
  if (!rows.length) return bad("Name is required.");

  const existing = await Master.find({ workspaceId, type, parentId: parentId ?? null })
    .select("name order")
    .lean();
  const taken = new Set(existing.map((e) => e.name.toLowerCase()));
  let order = existing.reduce((m, e) => Math.max(m, e.order ?? 0), 0);
  const fresh = rows.filter((r) => !taken.has(r.name!.toLowerCase()));
  if (!fresh.length) return bad(rows.length === 1 ? "That name already exists in this list." : "All of these already exist.", 409);

  const created = await Master.insertMany(
    fresh.map((r) => ({
      ...r,
      workspaceId,
      type,
      parentId,
      order: ++order,
      createdBy: new mongoose.Types.ObjectId(session.userId),
    })),
  );
  return ok({ items: created, skipped: rows.length - fresh.length }, { status: 201 });
});
