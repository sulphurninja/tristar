const PROPERTY_TYPES = [
  "residential_apartment",
  "residential_villa",
  "residential_plot",
  "residential_independent_house",
  "commercial_office",
  "commercial_retail",
  "commercial_warehouse",
  "industrial",
  "mixed_use",
  "farmland",
  "other",
];
const SALE_STAGES = ["pre_launch", "launching_soon", "ready_to_move", "under_construction", "resale", "sold_out"];

const str = (v: unknown) => (typeof v === "string" ? v.trim() : undefined);
const strList = (v: unknown) =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean) : undefined;
const num = (v: unknown): number | null | undefined => {
  if (v === undefined) return undefined;
  if (v === null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : NaN;
};

/** Whitelist + validate a project payload; returns a flat (dotted-path) field map usable with $set. */
export function sanitizeProject(body: Record<string, unknown>): { data: Record<string, unknown> } | { error: string } {
  const data: Record<string, unknown> = {};
  const name = str(body.name);
  if (body.name !== undefined) {
    if (!name) return { error: "Project name is required." };
    data.name = name;
  }
  const code = str(body.code);
  if (body.code !== undefined) {
    if (!code) return { error: "Project code is required." };
    data.code = code;
  }
  for (const k of ["builderName", "description"] as const) {
    if (body[k] !== undefined) data[k] = str(body[k]) || undefined;
  }
  if (body.propertyType !== undefined) {
    if (!PROPERTY_TYPES.includes(body.propertyType as string)) return { error: "Invalid property type." };
    data.propertyType = body.propertyType;
  }
  if (body.saleStage !== undefined) {
    if (!SALE_STAGES.includes(body.saleStage as string)) return { error: "Invalid sale stage." };
    data.saleStage = body.saleStage;
  }
  for (const k of ["configurations", "amenities", "highlights", "tags"] as const) {
    if (body[k] !== undefined) data[k] = strList(body[k]) ?? [];
  }
  if (body.possessionDate !== undefined) {
    if (!body.possessionDate) data.possessionDate = null;
    else {
      const d = new Date(body.possessionDate as string);
      if (Number.isNaN(d.getTime())) return { error: "Invalid possession date." };
      data.possessionDate = d;
    }
  }
  for (const k of ["totalUnits", "availableUnits"] as const) {
    const n = num(body[k]);
    if (n !== undefined && Number.isNaN(n)) return { error: `${k} must be a positive number.` };
    if (n !== undefined) data[k] = n;
  }
  if (typeof data.totalUnits === "number" && typeof data.availableUnits === "number" && data.availableUnits > data.totalUnits) {
    return { error: "Available units cannot exceed total units." };
  }
  if (body.location && typeof body.location === "object") {
    const l = body.location as Record<string, unknown>;
    for (const k of ["addressLine", "locality", "city", "state", "country", "pincode", "landmark"]) {
      if (l[k] !== undefined) data[`location.${k}`] = str(l[k]) || undefined;
    }
  }
  if (body.priceRange && typeof body.priceRange === "object") {
    const p = body.priceRange as Record<string, unknown>;
    for (const k of ["min", "max", "perSqFt"]) {
      const n = num(p[k]);
      if (n !== undefined && Number.isNaN(n)) return { error: `Price ${k} must be a positive number.` };
      if (n !== undefined) data[`priceRange.${k}`] = n;
    }
    const pmin = data["priceRange.min"];
    const pmax = data["priceRange.max"];
    if (typeof pmin === "number" && typeof pmax === "number" && pmin > pmax) {
      return { error: "Min price cannot exceed max price." };
    }
  }
  if (body.rera && typeof body.rera === "object") {
    const r = body.rera as Record<string, unknown>;
    if (r.number !== undefined) data["rera.number"] = str(r.number) || undefined;
  }
  return { data };
}
