import mongoose from "mongoose";
import Broker from "@/models/Broker";
import CpCompany from "@/models/CpCompany";
import User from "@/models/User";
import Lead from "@/models/Lead";
import Task from "@/models/Task";
import Booking from "@/models/Booking";
import { withAuth, ok, bad } from "@/lib/api";
import { oid, str } from "@/lib/cp";

const STATUSES = ["active", "blacklisted", "inactive", "pending_kyc"];

const POPULATE = [
  { path: "companyId", select: "companyId name category reraNumber mobile" },
  { path: "sourcingManagerId", select: "name" },
];

export const GET = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const broker = await Broker.findOne({ _id: params.id, workspaceId: session.workspaceId })
    .populate(POPULATE)
    .lean();
  if (!broker) return bad("Broker not found", 404);
  return ok({ broker });
});

export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Record<string, unknown>;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};

  const text = (key: string, path = key) => {
    if (body[key] === undefined) return;
    const v = str(body[key]);
    if (v) $set[path] = v;
    else $unset[path] = 1;
  };

  if (body.name !== undefined) {
    const n = str(body.name);
    if (!n) return bad("Contact person is required.");
    $set.name = n;
  }
  if (body.phone !== undefined) {
    const p = str(body.phone);
    if (!p) return bad("Mobile is required.");
    const dup = await Broker.exists({ workspaceId, phone: p, _id: { $ne: params.id } });
    if (dup) return bad("A channel partner with this mobile already exists.");
    $set.phone = p;
  }
  if (body.email !== undefined) {
    const e = str(body.email);
    if (e && !/^\S+@\S+\.\S+$/.test(e)) return bad("Enter a valid email.");
    if (e) $set.email = e.toLowerCase();
    else $unset.email = 1;
  }
  text("altPhone");
  text("notes");
  text("panNumber");
  text("gstNumber");
  text("stage");
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !STATUSES.includes(body.status)) return bad("Invalid status.");
    $set.status = body.status;
  }
  if (body.rating !== undefined) {
    const r = Number(body.rating);
    if (!(r >= 0 && r <= 5)) return bad("Rating must be between 0 and 5.");
    $set.rating = r;
  }

  const rera = body.rera as Record<string, unknown> | undefined;
  if (rera && typeof rera === "object") {
    for (const k of ["number", "state"]) {
      if (rera[k] === undefined) continue;
      const v = str(rera[k]);
      if (v) $set[`rera.${k}`] = v;
      else $unset[`rera.${k}`] = 1;
    }
  }
  const loc = body.location as Record<string, unknown> | undefined;
  if (loc && typeof loc === "object") {
    for (const k of ["addressLine", "locality", "city", "state", "pincode"]) {
      if (loc[k] === undefined) continue;
      const v = str(loc[k]);
      if (v) $set[`location.${k}`] = v;
      else $unset[`location.${k}`] = 1;
    }
  }
  const bank = body.bankAccount as Record<string, unknown> | undefined;
  if (bank && typeof bank === "object") {
    for (const k of ["accountHolder", "accountNumber", "ifsc", "bankName"]) {
      if (bank[k] === undefined) continue;
      const v = str(bank[k]);
      if (v) $set[`bankAccount.${k}`] = v;
      else $unset[`bankAccount.${k}`] = 1;
    }
  }

  if (body.companyId !== undefined) {
    if (!body.companyId) {
      $unset.companyId = 1;
      $unset.firmName = 1;
    } else {
      const id = oid(body.companyId);
      const c = id ? await CpCompany.findOne({ _id: id, workspaceId }).lean() : null;
      if (!c) return bad("Selected company not found.");
      $set.companyId = c._id;
      $set.firmName = c.name;
    }
  }
  if (body.sourcingManagerId !== undefined) {
    if (!body.sourcingManagerId) {
      $unset.sourcingManagerId = 1;
      $unset.assignedAt = 1;
      $unset.rmId = 1;
    } else {
      const id = oid(body.sourcingManagerId);
      const u = id ? await User.findOne({ _id: id, workspaceId }).select("name").lean() : null;
      if (!u) return bad("Selected sourcing manager not found.");
      $set.sourcingManagerId = u._id;
      $set.rmId = u._id;
      $set.rmName = u.name;
      $set.assignedAt = new Date();
    }
  }
  // Marks the partner as contacted (used by the Call quick action).
  if (body.touch === true) $set.lastContactedAt = new Date();

  const update: Record<string, unknown> = {};
  if (Object.keys($set).length) update.$set = $set;
  if (Object.keys($unset).length) update.$unset = $unset;
  if (!Object.keys(update).length) return bad("Nothing to update.");

  const broker = await Broker.findOneAndUpdate({ _id: params.id, workspaceId }, update, { new: true })
    .populate(POPULATE)
    .lean();
  if (!broker) return bad("Broker not found", 404);
  return ok({ broker });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const bookings = await Booking.countDocuments({ workspaceId, brokerId: params.id });
  if (bookings > 0) return bad(`Cannot delete: ${bookings} booking${bookings === 1 ? "" : "s"} reference this channel partner.`);
  const r = await Broker.deleteOne({ _id: params.id, workspaceId });
  if (!r.deletedCount) return bad("Broker not found", 404);
  await Promise.all([
    Lead.updateMany({ workspaceId, brokerId: params.id }, { $unset: { brokerId: 1 } }),
    Task.deleteMany({ workspaceId, brokerId: params.id, leadId: { $exists: false } }),
  ]);
  return ok({ ok: true });
});
