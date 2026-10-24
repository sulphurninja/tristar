import { type ReportRange } from "@/components/reports/ReportShell";

export type RangeKey = ReportRange;

export function rangeBounds(range: RangeKey): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  switch (range) {
    case "today":
      return { start, end };
    case "7d": {
      const s = new Date(start);
      s.setDate(s.getDate() - 6);
      return { start: s, end };
    }
    case "30d": {
      const s = new Date(start);
      s.setDate(s.getDate() - 29);
      return { start: s, end };
    }
    case "this_month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      return { start: s, end };
    }
    case "last_month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return { start: s, end: e };
    }
    case "ytd": {
      const s = new Date(now.getFullYear(), 0, 1);
      return { start: s, end };
    }
    case "custom":
      return { start, end };
    default:
      return { start, end };
  }
}

export function parseRange(input: string | null | undefined): RangeKey {
  const allowed: RangeKey[] = [
    "today",
    "7d",
    "30d",
    "this_month",
    "last_month",
    "ytd",
    "custom",
  ];
  if (!input) return "30d";
  return (allowed as string[]).includes(input) ? (input as RangeKey) : "30d";
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

/** Resolve report window from query — supports presets + custom from/to ISO dates. */
export function boundsFromSearchParams(url: URL): {
  start: Date;
  end: Date;
  range: RangeKey;
} {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  if (from && to) {
    const start = startOfDay(new Date(from));
    const end = endOfDay(new Date(to));
    if (!Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && start <= end) {
      return { start, end, range: "custom" };
    }
  }
  const range = parseRange(url.searchParams.get("range"));
  const { start, end } = rangeBounds(range === "custom" ? "30d" : range);
  return { start, end, range: range === "custom" ? "30d" : range };
}

/* All pipeline stages in the order they appear in reports */
export const PIPELINE_COLUMNS: Array<{ key: string; label: string }> = [
  { key: "new", label: "New" },
  { key: "warm", label: "Warm" },
  { key: "attempted_1", label: "Attempted - 1" },
  { key: "attempted_2", label: "Attempted - 2" },
  { key: "interested", label: "Interested" },
  { key: "not_interested", label: "Not Interested" },
  { key: "switched_off", label: "Switch Off" },
  { key: "cnr", label: "CNR" },
  { key: "cnc", label: "CNC" },
];

/**
 * Stage columns for stage-matrix reports: the workspace's default pipeline
 * stages in order (so column sums equal each row's Total), falling back to the
 * legacy fixed list when no pipeline exists.
 */
export async function pipelineColumns(
  workspaceId: mongoose.Types.ObjectId,
): Promise<Array<{ key: string; label: string }>> {
  const { default: Pipeline } = await import("@/models/Pipeline");
  const p = await Pipeline.findOne({ workspaceId, isDefault: true }).select("stages").lean();
  const stages = (p?.stages ?? []) as Array<{ key: string; label: string; order?: number }>;
  if (!stages.length) return PIPELINE_COLUMNS;
  return [...stages]
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s) => ({ key: s.key, label: s.label }));
}

/* Team / Sales Agent scoping (server) */
import type mongoose from "mongoose";
import { resolveAgentScope, scopeParams } from "@/lib/scope";

/** User ids selected by the Team / Sales Agent filter, or null when unfiltered. */
export async function scopeIds(url: URL, workspaceId: mongoose.Types.ObjectId) {
  const { team, agent } = scopeParams(url);
  return resolveAgentScope(workspaceId, team, agent);
}

/** Mongo fragment restricting `field` (default assignedTo) to the scoped users. */
export function scopeMatch(ids: mongoose.Types.ObjectId[] | null, field = "assignedTo") {
  return ids ? { [field]: { $in: ids } } : {};
}
