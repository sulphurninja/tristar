import mongoose from "mongoose";
import Ledger from "@/models/Ledger";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const type = url.searchParams.get("type") ?? "";
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const filter: Record<string, unknown> = { workspaceId };
  if (type && type !== "all") filter.type = type;
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
      { mobile: { $regex: q, $options: "i" } },
      { gstNo: { $regex: q, $options: "i" } },
    ];
  }
  const ledgers = await Ledger.find(filter).sort({ name: 1 }).limit(200).lean();
  return ok({ ledgers, total: ledgers.length });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.name || typeof body.name !== "string") return bad("Name is required.");

  const ledger = await Ledger.create({
    workspaceId: new mongoose.Types.ObjectId(session.workspaceId),
    name: body.name.trim(),
    email: typeof body.email === "string" ? body.email.trim() || undefined : undefined,
    mobile: typeof body.mobile === "string" ? body.mobile.trim() || undefined : undefined,
    gstNo: typeof body.gstNo === "string" ? body.gstNo.trim() || undefined : undefined,
    openingBalance: Number(body.openingBalance ?? 0),
    type: body.type ?? "customer",
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });

  return ok({ ledger }, { status: 201 });
});
