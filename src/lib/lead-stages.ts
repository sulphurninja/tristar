import mongoose from "mongoose";
import Pipeline, { ensureDefaultPipeline } from "@/models/Pipeline";

export interface StageEntry {
  key: string;
  label: string;
  type: "open" | "won" | "lost";
  color: string; // hex
}

/**
 * Stage labels that Buildesk ships but the seeded Tristar pipeline lacks. They
 * are merged in at READ time only - pipeline documents are never modified. A
 * stage is considered present when a pipeline stage has the same key or label.
 */
const EXTRA_STAGES: Array<Omit<StageEntry, "color">> = [
  { key: "on_followup", label: "On Followup", type: "open" },
  { key: "cold", label: "Cold", type: "open" },
  { key: "cnr", label: "Call Not received", type: "open" },
];

/** Keys that always mean "dead lead" regardless of the pipeline's own typing. */
export const LOST_STAGE_KEYS = ["lost", "not_interested", "junk", "duplicate"];

const STAGE_HEX: Record<string, string> = {
  new: "#3a5dc2",
  attempted_1: "#6d8be0",
  attempted_2: "#8aa2e8",
  warm: "#2fb67c",
  hot: "#3ec1d3",
  on_followup: "#ef5a2a",
  interested: "#e0436e",
  site_visit_scheduled: "#8a5cd6",
  site_visit_done: "#6c47c0",
  negotiating: "#f08a2c",
  booked: "#f2b82e",
  cold: "#a24bd1",
  cnr: "#e8a21a",
  lost: "#9a9ca6",
  not_interested: "#b8bbc6",
  junk: "#c5c8d2",
  duplicate: "#c5c8d2",
};
const FALLBACKS = ["#3a5dc2", "#2fb67c", "#3ec1d3", "#ef5a2a", "#e0436e", "#f2b82e", "#a24bd1", "#e8a21a"];

export function stageHex(key: string, index = 0) {
  return STAGE_HEX[key] ?? FALLBACKS[index % FALLBACKS.length];
}

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** Pipeline stages (default pipeline) + extra Buildesk vocabulary. */
export async function loadStageCatalog(
  workspaceId: mongoose.Types.ObjectId,
  userId?: string,
): Promise<StageEntry[]> {
  let pipeline = await Pipeline.findOne({ workspaceId, isDefault: true }).lean();
  if (!pipeline) pipeline = (await Pipeline.findOne({ workspaceId }).lean()) ?? null;
  if (!pipeline) {
    const created = await ensureDefaultPipeline(workspaceId, userId);
    pipeline = created.toObject();
  }
  const out: StageEntry[] = (pipeline.stages ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((s, i) => ({
      key: s.key,
      label: s.label,
      type: (s.type as StageEntry["type"]) ?? "open",
      color: stageHex(s.key, i),
    }));
  const have = new Set(out.flatMap((s) => [norm(s.key), norm(s.label)]));
  for (const e of EXTRA_STAGES) {
    if (have.has(norm(e.key)) || have.has(norm(e.label))) continue;
    out.push({ ...e, color: stageHex(e.key, out.length) });
  }
  return out;
}

export function lostKeys(catalog: StageEntry[]) {
  return Array.from(new Set([...LOST_STAGE_KEYS, ...catalog.filter((s) => s.type === "lost").map((s) => s.key)]));
}
