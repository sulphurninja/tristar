import mongoose from "mongoose";
import SiteVisit from "@/models/SiteVisit";
import { withAuth, ok } from "@/lib/api";

export const GET = withAuth(async ({ req, session }) => {
  const url = new URL(req.url);
  const range = url.searchParams.get("range") ?? "today";
  const statusList =
    url.searchParams.get("status")?.split(",").filter(Boolean) ?? null;

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);

  if (range === "today") {
    end.setHours(23, 59, 59, 999);
  } else if (range === "tomorrow") {
    start.setDate(start.getDate() + 1);
    end.setTime(start.getTime());
    end.setHours(23, 59, 59, 999);
  } else if (range === "week") {
    end.setDate(end.getDate() + 7);
  } else {
    // "all" — open-ended upcoming
    end.setFullYear(end.getFullYear() + 5);
  }

  const match: Record<string, unknown> = {
    workspaceId,
    scheduledAt: { $gte: start, $lte: end },
  };
  if (statusList && statusList.length > 0) {
    match.status = { $in: statusList };
  }

  const [visits, visited] = await Promise.all([
    SiteVisit.find(match)
      .sort({ scheduledAt: 1 })
      .limit(500)
      .populate({ path: "leadId", select: "contact description leadNumber" })
      .populate({ path: "projectId", select: "name code" })
      .populate({ path: "assignedTo", select: "name email" })
      .lean(),
    SiteVisit.countDocuments({
      workspaceId,
      scheduledAt: { $gte: start, $lte: end },
      status: { $in: ["done", "in_progress"] },
    }),
  ]);

  return ok({ visits, visited });
});
