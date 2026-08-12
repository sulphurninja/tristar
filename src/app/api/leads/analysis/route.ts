import mongoose from "mongoose";
import Lead, { LEAD_STAGES } from "@/models/Lead";
import { withAuth, ok } from "@/lib/api";

const OPEN_STAGES = [
  "new",
  "attempted_1",
  "attempted_2",
  "warm",
  "hot",
  "interested",
  "cnr",
  "cnc",
  "site_visit_scheduled",
  "site_visit_done",
  "negotiating",
  "switched_off",
];

export const GET = withAuth(async ({ session, req }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const url = new URL(req.url);
  const assignedTo = url.searchParams.get("assignedTo") ?? "";
  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const base: Record<string, unknown> = { workspaceId };
  if (assignedTo && mongoose.isValidObjectId(assignedTo)) {
    base.assignedTo = new mongoose.Types.ObjectId(assignedTo);
  }

  const activeFilter = {
    ...base,
    isBooked: { $ne: true },
    stage: { $nin: ["junk", "lost", "not_interested", "duplicate"] },
  };

  const [
    byStage,
    total,
    untouchedLeads,
    noFollowupsLeads,
    returningLeads,
    returningNoFollowupLeads,
    overdueTaskLeads,
  ] = await Promise.all([
    Lead.aggregate<{ _id: string; count: number }>([
      { $match: base },
      { $group: { _id: "$stage", count: { $sum: 1 } } },
    ]),
    Lead.countDocuments(base),
    Lead.countDocuments({
      ...activeFilter,
      $or: [{ lastContactedAt: null }, { lastContactedAt: { $exists: false } }],
    }),
    Lead.countDocuments({
      ...activeFilter,
      lastContactedAt: { $ne: null },
      $or: [{ nextActionAt: null }, { nextActionAt: { $exists: false } }],
    }),
    Lead.countDocuments({
      ...base,
      $or: [{ tags: "returning" }, { "customFields.returning": true }],
    }),
    Lead.countDocuments({
      ...activeFilter,
      $or: [{ tags: "returning" }, { "customFields.returning": true }],
      $and: [
        {
          $or: [{ nextActionAt: null }, { nextActionAt: { $exists: false } }],
        },
      ],
    }),
    Lead.countDocuments({
      ...activeFilter,
      nextActionAt: { $lt: startOfDay },
    }),
  ]);

  const stageMap: Record<string, number> = {};
  for (const s of LEAD_STAGES) stageMap[s] = 0;
  for (const row of byStage) stageMap[row._id] = row.count;

  /* Grouped buckets matching enterprise CRM stage analysis */
  const buckets = [
    {
      key: "open",
      label: "Open",
      color: "#3b82f6",
      count: OPEN_STAGES.filter((s) =>
        ["new", "attempted_1", "attempted_2"].includes(s),
      ).reduce((n, s) => n + (stageMap[s] ?? 0), 0),
    },
    { key: "warm", label: "Warm", color: "#22c55e", count: stageMap.warm ?? 0 },
    { key: "hot", label: "Hot", color: "#ef4444", count: stageMap.hot ?? 0 },
    {
      key: "followup",
      label: "On Followup",
      color: "#f97316",
      count: (stageMap.site_visit_scheduled ?? 0) + (stageMap.negotiating ?? 0),
    },
    {
      key: "interested",
      label: "Interested",
      color: "#38bdf8",
      count: stageMap.interested ?? 0,
    },
    { key: "booked", label: "Booked", color: "#a855f7", count: stageMap.booked ?? 0 },
    {
      key: "cold",
      label: "Cold",
      color: "#d946ef",
      count:
        (stageMap.not_interested ?? 0) +
        (stageMap.switched_off ?? 0) +
        (stageMap.cnc ?? 0),
    },
    {
      key: "cnr",
      label: "Call Not received",
      color: "#eab308",
      count: stageMap.cnr ?? 0,
    },
  ];

  return ok({
    total,
    stages: stageMap,
    buckets,
    kpis: {
      untouchedLeads,
      noFollowupsLeads,
      returningLeads,
      returningNoFollowupLeads,
      overdueTaskLeads,
    },
  });
});
