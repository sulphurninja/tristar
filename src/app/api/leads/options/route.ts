import mongoose from "mongoose";
import Lead from "@/models/Lead";
import Project from "@/models/Project";
import Broker from "@/models/Broker";
import Source from "@/models/Source";
import { withAuth, ok } from "@/lib/api";
import { loadStageCatalog } from "@/lib/lead-stages";

/** Built-in source keys (kept from the original Lead enum) with Buildesk-style labels. */
const BUILTIN_SOURCES: Record<string, string> = {
  walkin: "Walkin",
  channel_partner: "Channel Partner",
  telecalling: "Tele-calling",
  website: "Website",
  whatsapp_bot: "WhatsApp Bot",
  facebook: "Facebook",
  instagram: "Instagram",
  google_ads: "Google Ads",
  magicbricks: "Magicbricks",
  "99acres": "99acres",
  housing: "Housing.com",
  newspaper: "Newspaper",
  hoarding: "Hoarding",
  referral: "Referral",
  exhibition: "Exhibition",
  import: "Import",
  api: "API",
  other: "Other",
};

/** Dropdown vocab for the Leads list filters and the Lead Information drawer. */
export const GET = withAuth(async ({ session }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const [stages, projects, brokers, sourceDocs, tagRows] = await Promise.all([
    loadStageCatalog(workspaceId, session.userId),
    Project.find({ workspaceId, archived: { $ne: true } })
      .select("name code location")
      .sort({ name: 1 })
      .limit(500)
      .lean(),
    Broker.find({ workspaceId }).select("name firmName phone").sort({ name: 1 }).limit(1000).lean(),
    Source.find({ workspaceId, isActive: { $ne: false } }).select("key label").sort({ sortOrder: 1, label: 1 }).lean(),
    Lead.aggregate<{ _id: string; c: number }>([
      { $match: { workspaceId, "tags.0": { $exists: true } } },
      { $unwind: "$tags" },
      { $group: { _id: "$tags", c: { $sum: 1 } } },
      { $sort: { c: -1 } },
      { $limit: 100 },
    ]),
  ]);

  const sources = new Map<string, string>(Object.entries(BUILTIN_SOURCES));
  for (const s of sourceDocs) sources.set(s.key, s.label);

  return ok({
    stages,
    projects: projects.map((p) => ({ _id: p._id, name: p.name, code: p.code, city: p.location?.city })),
    brokers: brokers.map((b) => ({ _id: b._id, name: b.name, firmName: b.firmName, phone: b.phone })),
    sources: Array.from(sources, ([value, label]) => ({ value, label })),
    tags: tagRows.map((t) => t._id),
  });
});
