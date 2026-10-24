import mongoose from "mongoose";
import CpCompany from "@/models/CpCompany";
import Broker from "@/models/Broker";
import { withAuth, ok, bad } from "@/lib/api";
import { str } from "@/lib/cp";

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const company = await CpCompany.findOne({ _id: params.id, workspaceId: session.workspaceId }).lean();
  if (!company) return bad("Company not found", 404);
  return ok({ company });
});

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Record<string, unknown>;
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  for (const k of ["name", "owner", "mobile", "email", "category", "reraNumber", "address"] as const) {
    if (body[k] === undefined) continue;
    const v = str(body[k]);
    if (k === "name") {
      if (!v) return bad("Company name is required.");
      $set.name = v;
    } else if (v) $set[k] = v;
    else $unset[k] = 1;
  }
  const update: Record<string, unknown> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  if (!Object.keys(update).length) return bad("Nothing to update.");
  const company = await CpCompany.findOneAndUpdate(
    { _id: params.id, workspaceId: session.workspaceId },
    update,
    { new: true },
  ).lean();
  if (!company) return bad("Company not found", 404);
  // Keep the denormalised firm name on linked partners in sync.
  if ($set.name) {
    await Broker.updateMany(
      { workspaceId: session.workspaceId, companyId: company._id },
      { $set: { firmName: $set.name } },
    );
  }
  return ok({ company });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const n = await Broker.countDocuments({ workspaceId: session.workspaceId, companyId: params.id });
  if (n > 0) return bad(`This company has ${n} channel partner${n === 1 ? "" : "s"}. Remove or reassign them first.`);
  const r = await CpCompany.deleteOne({ _id: params.id, workspaceId: session.workspaceId });
  if (!r.deletedCount) return bad("Company not found", 404);
  return ok({ ok: true });
});
