import mongoose from "mongoose";
import Lead from "@/models/Lead";
import Broker from "@/models/Broker";
import { withAuth, ok } from "@/lib/api";
import { boundsFromSearchParams } from "@/lib/report-utils";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const { start, end, range } = boundsFromSearchParams(url);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const agg = await Lead.aggregate<{
    _id: { broker: mongoose.Types.ObjectId | null };
    total: number;
    interested: number;
  }>([
    {
      $match: {
        workspaceId,
        createdAt: { $gte: start, $lte: end },
        "source.primary": "channel_partner",
      },
    },
    {
      $group: {
        _id: { broker: "$brokerId" },
        total: { $sum: 1 },
        interested: {
          $sum: { $cond: [{ $eq: ["$stage", "interested"] }, 1, 0] },
        },
      },
    },
  ]);

  const ids = agg.map((a) => a._id.broker).filter(Boolean) as mongoose.Types.ObjectId[];
  const brokers = await Broker.find({ workspaceId, _id: { $in: ids } })
    .select("name firmName")
    .lean();
  const brokerMap = new Map(brokers.map((b) => [String(b._id), b]));

  const rows = agg.map((a) => {
    const b = a._id.broker ? brokerMap.get(String(a._id.broker)) : null;
    return {
      brokerId: a._id.broker ? String(a._id.broker) : null,
      label: b ? `${b.name}${b.firmName ? ` - (${b.firmName})` : ""}` : "Unattributed",
      total: a.total,
      interested: a.interested,
    };
  });

  rows.sort((a, b) => b.total - a.total);

  const totalsRow = {
    label: "Total",
    total: rows.reduce((a, b) => a + b.total, 0),
    interested: rows.reduce((a, b) => a + b.interested, 0),
  };

  return ok({ range, rows, totalsRow });
});
