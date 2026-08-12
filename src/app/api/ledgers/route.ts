import mongoose from "mongoose";
import Ledger from "@/models/Ledger";
import { withAuth, ok, bad } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim() ?? "";
  const filter: Record<string, unknown> = {
    workspaceId: new mongoose.Types.ObjectId(session.workspaceId),
  };
  if (q) {
    filter.$or = [
      { name: { $regex: q, $options: "i" } },
      { mobile: { $regex: q, $options: "i" } },
      { email: { $regex: q, $options: "i" } },
    ];
  }

  const ledgers = await Ledger.find(filter).sort({ name: 1 }).lean();
  return ok({ ledgers, total: ledgers.length });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  if (!body.name || typeof body.name !== "string") return bad("Name is required.");

  const ledger = await Ledger.create({
    workspaceId: new mongoose.Types.ObjectId(session.workspaceId),
    name: body.name,
    email: body.email,
    mobile: body.mobile,
    openingBalance: Number(body.openingBalance ?? 0),
    type: body.type ?? "customer",
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });

  return ok({ ledger }, { status: 201 });
});
