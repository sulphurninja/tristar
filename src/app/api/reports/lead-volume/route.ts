import mongoose from "mongoose";
import Lead from "@/models/Lead";
import SiteVisit from "@/models/SiteVisit";
import { withAuth, ok } from "@/lib/api";
import { parseRange, rangeBounds } from "@/lib/report-utils";

/**
 * Lead volume time-series — buckets by day for the requested range.
 * Returns: leads generated, visits done, conversions (booked) per day.
 */
export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const range = parseRange(url.searchParams.get("range"));
  const { start, end } = rangeBounds(range);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const dayBucket = {
    $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
  };

  const [leadsAgg, visitsAgg, conversionsAgg] = await Promise.all([
    Lead.aggregate<{ _id: string; count: number }>([
      { $match: { workspaceId, createdAt: { $gte: start, $lte: end } } },
      { $group: { _id: dayBucket, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    SiteVisit.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          workspaceId,
          completedAt: { $gte: start, $lte: end },
          status: "done",
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$completedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
    Lead.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          workspaceId,
          isBooked: true,
          convertedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$convertedAt" } },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]),
  ]);

  const days: Array<{ date: string; leads: number; visits: number; conversions: number }> = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    days.push({
      date: key,
      leads: leadsAgg.find((d) => d._id === key)?.count ?? 0,
      visits: visitsAgg.find((d) => d._id === key)?.count ?? 0,
      conversions: conversionsAgg.find((d) => d._id === key)?.count ?? 0,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const totals = {
    leads: days.reduce((a, b) => a + b.leads, 0),
    visits: days.reduce((a, b) => a + b.visits, 0),
    conversions: days.reduce((a, b) => a + b.conversions, 0),
  };

  return ok({ range, days, totals });
});
