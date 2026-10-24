import mongoose from "mongoose";
import Lead from "@/models/Lead";
import SiteVisit from "@/models/SiteVisit";
import Task from "@/models/Task";
import Booking from "@/models/Booking";
import User from "@/models/User";
import Pipeline from "@/models/Pipeline";

type Oid = mongoose.Types.ObjectId;

/** An "Ontime" task is completed no later than its schedule time + this grace. */
export const ONTIME_GRACE_MS = 5 * 60 * 1000;
export const UNQUALIFIED_STAGES = ["junk", "not_interested", "lost"];
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";

export function parseDay(s: string | null | undefined, fallback = new Date()): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    const dt = new Date(y, m - 1, d);
    if (!Number.isNaN(dt.getTime())) return dt;
  }
  const f = new Date(fallback);
  f.setHours(0, 0, 0, 0);
  return f;
}
const sod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const eod = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const key = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

interface Ctx {
  workspaceId: Oid;
  /** null = no Team/Agent filter */
  scope: Oid[] | null;
}

const sc = (ctx: Ctx, field = "assignedTo") => (ctx.scope ? { [field]: { $in: ctx.scope } } : {});

/** Per-day counts of the five headline metrics for the 7 days ending at `day` (newest first). */
export async function dailyMetrics(ctx: Ctx, day: Date) {
  const { workspaceId } = ctx;
  const winStart = sod(addDays(day, -6));
  const winEnd = eod(day);
  const byDay = (field: string) => ({
    $dateToString: { format: "%Y-%m-%d", date: field, timezone: TZ },
  });
  const group = (field: string) => [
    { $group: { _id: byDay(field), count: { $sum: 1 } } },
  ];

  const [leads, svSched, svDone, bookings, unq] = await Promise.all([
    Lead.aggregate<{ _id: string; count: number }>([
      { $match: { workspaceId, ...sc(ctx), createdAt: { $gte: winStart, $lte: winEnd } } },
      ...group("$createdAt"),
    ]),
    SiteVisit.aggregate<{ _id: string; count: number }>([
      { $match: { workspaceId, ...sc(ctx), scheduledAt: { $gte: winStart, $lte: winEnd } } },
      ...group("$scheduledAt"),
    ]),
    SiteVisit.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          workspaceId,
          ...sc(ctx),
          status: "done",
          $expr: {
            $and: [
              { $gte: [{ $ifNull: ["$completedAt", "$updatedAt"] }, winStart] },
              { $lte: [{ $ifNull: ["$completedAt", "$updatedAt"] }, winEnd] },
            ],
          },
        },
      },
      { $group: { _id: byDay({ $ifNull: ["$completedAt", "$updatedAt"] } as unknown as string), count: { $sum: 1 } } },
    ]),
    Booking.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          workspaceId,
          ...sc(ctx, "salesAgentId"),
          approvalStatus: { $ne: "rejected" },
          bookedAt: { $gte: winStart, $lte: winEnd },
        },
      },
      ...group("$bookedAt"),
    ]),
    Lead.aggregate<{ _id: string; count: number }>([
      {
        $match: {
          workspaceId,
          ...sc(ctx),
          stage: { $in: UNQUALIFIED_STAGES },
          updatedAt: { $gte: winStart, $lte: winEnd },
        },
      },
      ...group("$updatedAt"),
    ]),
  ]);

  const days: Date[] = [];
  for (let i = 0; i < 7; i++) days.push(addDays(day, -i));
  const series = (rows: Array<{ _id: string; count: number }>) => {
    const m = new Map(rows.map((r) => [r._id, r.count]));
    return days.map((d) => ({ date: key(d), day: String(d.getDate()), value: m.get(key(d)) ?? 0 }));
  };
  const mk = (rows: Array<{ _id: string; count: number }>) => {
    const s = series(rows);
    return { value: s[0].value, series: s };
  };
  return {
    todayLeads: mk(leads),
    siteVisitScheduled: mk(svSched),
    siteVisitCompleted: mk(svDone),
    booking: mk(bookings),
    leadUnqualified: mk(unq),
  };
}

export interface AgentActivity {
  userId: string;
  name: string;
  total: number;
  ontime: number;
  delayed: number;
}

/**
 * Activity Completed Time: tasks whose schedule time falls in [start, end].
 *  - Ontime  = completed at/before scheduleAt (+ grace)
 *  - Delayed = completed later, or still pending/upcoming and already past due
 * Cancelled and not-yet-due tasks are ignored.
 */
export async function activityCompleted(ctx: Ctx, start: Date, end: Date) {
  const { workspaceId } = ctx;
  const now = new Date();
  const rows = await Task.aggregate<{ _id: Oid | null; ontime: number; delayed: number }>([
    {
      $match: {
        workspaceId,
        ...sc(ctx),
        status: { $in: ["pending", "upcoming", "completed"] },
        scheduleAt: { $gte: start, $lte: end },
      },
    },
    {
      $project: {
        assignedTo: 1,
        state: {
          $switch: {
            branches: [
              {
                case: { $eq: ["$status", "completed"] },
                then: {
                  $cond: [
                    {
                      $lte: [
                        { $ifNull: ["$completedAt", "$updatedAt"] },
                        { $add: ["$scheduleAt", ONTIME_GRACE_MS] },
                      ],
                    },
                    "ontime",
                    "delayed",
                  ],
                },
              },
              { case: { $lt: ["$scheduleAt", now] }, then: "delayed" },
            ],
            default: "notdue",
          },
        },
      },
    },
    { $match: { state: { $in: ["ontime", "delayed"] } } },
    {
      $group: {
        _id: "$assignedTo",
        ontime: { $sum: { $cond: [{ $eq: ["$state", "ontime"] }, 1, 0] } },
        delayed: { $sum: { $cond: [{ $eq: ["$state", "delayed"] }, 1, 0] } },
      },
    },
  ]);
  const users = await User.find({ workspaceId }).select("name").lean();
  const names = new Map(users.map((u) => [String(u._id), u.name as string]));
  const byAgent: AgentActivity[] = rows
    .map((r) => ({
      userId: r._id ? String(r._id) : "_unassigned",
      name: r._id ? (names.get(String(r._id)) ?? "Unknown") : "Unassigned",
      total: r.ontime + r.delayed,
      ontime: r.ontime,
      delayed: r.delayed,
    }))
    .sort((a, b) => b.delayed - a.delayed || b.total - a.total);
  const ontime = byAgent.reduce((a, b) => a + b.ontime, 0);
  const delayed = byAgent.reduce((a, b) => a + b.delayed, 0);
  const total = ontime + delayed;
  return {
    total,
    ontime,
    delayed,
    pctOntime: total ? Math.round((ontime / total) * 100) : 0,
    byAgent,
  };
}

/** Leads created in [start, end] split by source and by pipeline stage. */
export async function leadBreakdown(ctx: Ctx, start: Date, end: Date) {
  const { workspaceId } = ctx;
  const match = { workspaceId, ...sc(ctx), createdAt: { $gte: start, $lte: end } };
  const [bySource, byStage, pipe] = await Promise.all([
    Lead.aggregate<{ _id: string | null; count: number }>([
      { $match: match },
      { $group: { _id: "$source.primary", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Lead.aggregate<{ _id: string | null; count: number }>([
      { $match: match },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]),
    Pipeline.findOne({ workspaceId, isDefault: true }).select("stages").lean(),
  ]);
  const stageDefs = ((pipe?.stages ?? []) as Array<{ key: string; label: string; order?: number }>)
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const counts = new Map(byStage.map((r) => [r._id ?? "new", r.count]));
  const stages = stageDefs.map((s) => ({ key: s.key, label: s.label, count: counts.get(s.key) ?? 0 }));
  for (const [k, c] of counts) if (!stageDefs.some((s) => s.key === k)) stages.push({ key: k, label: k, count: c });
  const total = byStage.reduce((a, b) => a + b.count, 0);
  return {
    total,
    sources: bySource.map((r) => ({ key: r._id ?? "other", count: r.count })),
    stages,
  };
}

export { sod, eod };
