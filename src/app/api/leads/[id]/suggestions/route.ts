import mongoose from "mongoose";
import Lead from "@/models/Lead";
import Project from "@/models/Project";
import Property from "@/models/Property";
import { withAuth, ok, bad } from "@/lib/api";
import { escapeRegex } from "@/lib/lead-filters";

const SUBTYPE_TO_PROJECT_TYPE: Record<string, string[]> = {
  apartment: ["residential_apartment"],
  villa: ["residential_villa"],
  plot: ["residential_plot"],
  "independent house": ["residential_independent_house"],
  "row house": ["residential_independent_house"],
  penthouse: ["residential_apartment"],
  studio: ["residential_apartment"],
  office: ["commercial_office"],
  shop: ["commercial_retail"],
  showroom: ["commercial_retail"],
  retail: ["commercial_retail"],
  warehouse: ["commercial_warehouse"],
  industrial: ["industrial"],
  farmland: ["farmland"],
};

/**
 * "Suggested Projects & Properties" - real search over the Project and Property
 * collections. `use` lists which criteria chips are active
 * (location,budget,unit,subType). Also returns location / sub-location vocab.
 */
export const GET = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const lead = await Lead.findOne({ _id: params.id, workspaceId }).select("_id").lean();
  if (!lead) return bad("Lead not found", 404);

  const p = new URL(req.url).searchParams;
  const use = new Set((p.get("use") ?? "location,budget,unit,subType").split(",").filter(Boolean));
  const location = p.get("location")?.trim() ?? "";
  const subLocation = p.get("subLocation")?.trim() ?? "";
  const budgetMin = p.get("budgetMin") ? Number(p.get("budgetMin")) : undefined;
  const budgetMax = p.get("budgetMax") ? Number(p.get("budgetMax")) : undefined;
  const units = (p.get("unit") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const subType = (p.get("subType") ?? "").trim().toLowerCase();

  const pAnd: Record<string, unknown>[] = [{ workspaceId, archived: { $ne: true }, isActive: { $ne: false } }];
  const hAnd: Record<string, unknown>[] = [{ workspaceId, status: { $in: ["available", "held"] } }];

  if (use.has("location") && location) {
    const rx = { $regex: escapeRegex(location), $options: "i" };
    pAnd.push({ $or: [{ "location.city": rx }, { "location.locality": rx }, { "location.state": rx }] });
    hAnd.push({ $or: [{ city: rx }, { location: rx }] });
  }
  if (subLocation) {
    const rx = { $regex: escapeRegex(subLocation), $options: "i" };
    pAnd.push({ "location.locality": rx });
    hAnd.push({ location: rx });
  }
  if (use.has("budget")) {
    if (budgetMin !== undefined && Number.isFinite(budgetMin)) {
      pAnd.push({ $or: [{ "priceRange.max": { $gte: budgetMin } }, { "priceRange.max": null }] });
      hAnd.push({ price: { $gte: budgetMin } });
    }
    if (budgetMax !== undefined && Number.isFinite(budgetMax)) {
      pAnd.push({ $or: [{ "priceRange.min": { $lte: budgetMax } }, { "priceRange.min": null }] });
      hAnd.push({ price: { $lte: budgetMax } });
    }
  }
  if (use.has("unit") && units.length) {
    const rxs = units.map((u) => new RegExp(`^${escapeRegex(u)}$`, "i"));
    pAnd.push({ configurations: { $in: rxs } });
    hAnd.push({ configuration: { $in: rxs } });
  }
  if (use.has("subType") && subType) {
    const types = SUBTYPE_TO_PROJECT_TYPE[subType];
    if (types) pAnd.push({ propertyType: { $in: types } });
    else hAnd.push({ inventoryType: { $regex: escapeRegex(subType), $options: "i" } });
  }

  const [projects, properties, cities, localities, propCities] = await Promise.all([
    Project.find({ $and: pAnd }).select("name code location priceRange configurations propertyType saleStage").sort({ name: 1 }).limit(40).lean(),
    Property.find({ $and: hAnd }).select("title location city configuration price area areaUnit status projectId").sort({ createdAt: -1 }).limit(40).lean(),
    Project.distinct("location.city", { workspaceId }),
    location
      ? Project.distinct("location.locality", {
          workspaceId,
          "location.city": { $regex: `^${escapeRegex(location)}$`, $options: "i" },
        })
      : Project.distinct("location.locality", { workspaceId }),
    Property.distinct("city", { workspaceId }),
  ]);

  const uniq = (a: unknown[]) => Array.from(new Set(a.filter((x): x is string => typeof x === "string" && !!x.trim()))).sort();
  return ok({
    projects,
    properties,
    locations: uniq([...cities, ...propCities]),
    subLocations: uniq(localities),
  });
});
