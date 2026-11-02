import mongoose from "mongoose";

const oids = (v: unknown) =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === "string" && mongoose.isValidObjectId(x)))].map(
        (x) => new mongoose.Types.ObjectId(x),
      )
    : undefined;

/** Editable fields of a distribution rule from an untrusted body. */
export function ruleFields(b: Record<string, unknown>) {
  return {
    name: typeof b.name === "string" ? b.name.trim().slice(0, 80) : undefined,
    active: typeof b.active === "boolean" ? b.active : undefined,
    sources: Array.isArray(b.sources)
      ? [...new Set(b.sources.filter((x): x is string => typeof x === "string" && !!x.trim()).map((x) => x.trim().toLowerCase()))]
      : undefined,
    projectIds: oids(b.projectIds),
    agentIds: oids(b.agentIds),
  };
}
