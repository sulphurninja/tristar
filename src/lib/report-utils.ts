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
    default:
      return { start, end };
  }
}

export function parseRange(input: string | null | undefined): RangeKey {
  const allowed: RangeKey[] = ["today", "7d", "30d", "this_month", "last_month", "ytd"];
  if (!input) return "30d";
  return (allowed as string[]).includes(input) ? (input as RangeKey) : "30d";
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
