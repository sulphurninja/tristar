import mongoose from "mongoose";
import Broker from "@/models/Broker";
import User from "@/models/User";
import Lead from "@/models/Lead";
import Task from "@/models/Task";
import Booking from "@/models/Booking";
import { withAuth, ok, bad } from "@/lib/api";
import { oid, str } from "@/lib/cp";

/** Bulk actions on selected channel partners: assign | stage | delete. */
export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as { ids?: string[]; action?: string; sourcingManagerId?: string; stage?: string };
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const ids = (body.ids ?? []).filter((i) => mongoose.isValidObjectId(i)).map((i) => new mongoose.Types.ObjectId(i));
  if (!ids.length) return bad("Select at least one channel partner.");
  const where = { workspaceId, _id: { $in: ids } };

  if (body.action === "assign") {
    const uid = oid(body.sourcingManagerId);
    const u = uid ? await User.findOne({ _id: uid, workspaceId }).select("name").lean() : null;
    if (!u) return bad("Select a sourcing manager.");
    const r = await Broker.updateMany(where, {
      $set: { sourcingManagerId: u._id, rmId: u._id, rmName: u.name, assignedAt: new Date() },
    });
    return ok({ modified: r.modifiedCount });
  }
  if (body.action === "stage") {
    const stage = str(body.stage);
    if (!stage) return bad("Select a stage.");
    const r = await Broker.updateMany(where, { $set: { stage } });
    return ok({ modified: r.modifiedCount });
  }
  if (body.action === "delete") {
    const withBookings = await Booking.distinct("brokerId", { workspaceId, brokerId: { $in: ids } });
    const blocked = new Set(withBookings.map(String));
    const deletable = ids.filter((i) => !blocked.has(String(i)));
    if (deletable.length) {
      await Broker.deleteMany({ workspaceId, _id: { $in: deletable } });
      await Promise.all([
        Lead.updateMany({ workspaceId, brokerId: { $in: deletable } }, { $unset: { brokerId: 1 } }),
        Task.deleteMany({ workspaceId, brokerId: { $in: deletable }, leadId: { $exists: false } }),
      ]);
    }
    return ok({ deleted: deletable.length, skipped: ids.length - deletable.length });
  }
  return bad("Unknown action.");
});
