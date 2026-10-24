import mongoose from "mongoose";
import User from "@/models/User";

/**
 * Resolve the Buildesk "Select Team" / "Select Sales Agent" pair into the list
 * of user ids to filter by. Returns `null` when neither is set (no filtering).
 * An explicit agent wins over a team. A team with no members yields `[]`, which
 * callers must treat as "match nothing".
 */
export async function resolveAgentScope(
  workspaceId: mongoose.Types.ObjectId,
  teamId?: string | null,
  agentId?: string | null,
): Promise<mongoose.Types.ObjectId[] | null> {
  if (agentId && mongoose.isValidObjectId(agentId)) return [new mongoose.Types.ObjectId(agentId)];
  if (teamId && mongoose.isValidObjectId(teamId)) {
    const users = await User.find({ workspaceId, teamId: new mongoose.Types.ObjectId(teamId) })
      .select("_id")
      .lean();
    return users.map((u) => u._id);
  }
  return null;
}

/** Read `team` / `agent` from a request URL. */
export function scopeParams(url: URL) {
  return { team: url.searchParams.get("team"), agent: url.searchParams.get("agent") };
}

/** [start, end] of a named date range in server-local time. */
export function rangeBounds(range: string, from?: string | null, to?: string | null): [Date, Date] | null {
  const now = new Date();
  const sod = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const eod = (d: Date) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };
  const addDays = (d: Date, n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  switch (range) {
    case "today":
      return [sod(now), eod(now)];
    case "yesterday":
      return [sod(addDays(now, -1)), eod(addDays(now, -1))];
    case "tomorrow":
      return [sod(addDays(now, 1)), eod(addDays(now, 1))];
    case "last7":
      return [sod(addDays(now, -6)), eod(now)];
    case "next7":
      return [sod(now), eod(addDays(now, 6))];
    case "last30":
      return [sod(addDays(now, -29)), eod(now)];
    case "thisweek": {
      const s = sod(addDays(now, -now.getDay()));
      return [s, eod(addDays(s, 6))];
    }
    case "thismonth":
      return [new Date(now.getFullYear(), now.getMonth(), 1), eod(new Date(now.getFullYear(), now.getMonth() + 1, 0))];
    case "lastmonth":
      return [new Date(now.getFullYear(), now.getMonth() - 1, 1), eod(new Date(now.getFullYear(), now.getMonth(), 0))];
    case "custom": {
      if (!from) return null;
      const f = new Date(from);
      const t = to ? new Date(to) : f;
      if (Number.isNaN(f.getTime()) || Number.isNaN(t.getTime())) return null;
      return [sod(f), eod(t)];
    }
    default:
      return null;
  }
}

/** Mongo filter matching "returning" (re-enquiry) leads. */
export const RETURNING_FILTER = {
  $or: [{ isReturning: true }, { tags: "returning" }, { "customFields.returning": true }],
};
export const NOT_RETURNING_FILTER = {
  isReturning: { $ne: true },
  tags: { $ne: "returning" },
  "customFields.returning": { $ne: true },
};
