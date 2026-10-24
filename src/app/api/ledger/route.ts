import mongoose from "mongoose";
import Ledger from "@/models/Ledger";
import { withAuth, ok, bad } from "@/lib/api";
import { escapeRegex } from "@/lib/cp";
import { ledgerMovement, parseLedgerBody } from "@/lib/ledger";

export const GET = withAuth(async ({ req, session }) => {
  const sp = new URL(req.url).searchParams;
  const q = sp.get("q")?.trim() ?? "";
  const type = sp.get("type") ?? "";
  const exportAll = sp.get("export") === "1";
  const limit = exportAll ? 10000 : Math.min(parseInt(sp.get("limit") ?? "500", 10) || 500, 1000);
  const skip = Math.max(parseInt(sp.get("skip") ?? "0", 10) || 0, 0);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const filter: Record<string, unknown> = { workspaceId };
  if (type && type !== "all") filter.type = type;
  if (q) {
    const rx = { $regex: escapeRegex(q), $options: "i" };
    filter.$or = [{ name: rx }, { email: rx }, { mobile: rx }, { gstNo: rx }];
  }
  const [ledgers, total] = await Promise.all([
    Ledger.find(filter).collation({ locale: "en", strength: 2 }).sort({ name: 1 }).skip(skip).limit(limit).lean(),
    Ledger.countDocuments(filter),
  ]);
  const mv = await ledgerMovement(workspaceId, ledgers.map((l) => l._id));
  const rows = ledgers.map((l) => {
    const m = mv.get(String(l._id)) ?? { debit: 0, credit: 0 };
    return { ...l, debit: m.debit, credit: m.credit, balance: (l.openingBalance ?? 0) + m.debit - m.credit };
  });
  return ok({ ledgers: rows, total });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const { $set, error } = parseLedgerBody(body, false);
  if (error) return bad(error);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const dup = await Ledger.exists({ workspaceId, name: new RegExp(`^${escapeRegex($set.name as string)}$`, "i") });
  if (dup) return bad("A ledger with this name already exists.");
  const ledger = await Ledger.create({ ...$set, workspaceId, createdBy: new mongoose.Types.ObjectId(session.userId) });
  return ok({ ledger }, { status: 201 });
});
