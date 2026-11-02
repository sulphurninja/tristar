/**
 * Masters — the workspace's configurable pick-lists (client-safe catalog).
 *
 * Every list is stored in the `Master` collection as `{ type, name, … }`.
 * Some lists have child lists (e.g. Property Type → Sub type / Unit type);
 * children are Masters of the child type with `parentId` set.
 * Lead sources live in the Source model and Lead stages in Pipelines; the
 * catalog points to those so settings stay in one place for the admin.
 */

export type MasterField = "code" | "color" | "range" | "url" | "description";

export interface MasterChild {
  type: string;
  label: string;
}

export interface MasterType {
  type: string;
  label: string;
  singular: string;
  group: string;
  description: string;
  fields?: MasterField[];
  children?: MasterChild[];
  /** Range unit shown next to min / max inputs. */
  unit?: string;
  suggestions?: Array<string | { name: string; min?: number; max?: number; code?: string }>;
  /** Managed elsewhere — the masters screen links there. */
  href?: string;
  /** Child-only types never show in the main list. */
  childOnly?: boolean;
}

export const MASTER_GROUPS = ["Leads", "Contacts", "Channel partners", "Inventory", "Ranges & regions", "Marketing"] as const;

export const MASTER_TYPES: MasterType[] = [
  /* Leads */
  {
    type: "lead_sources",
    label: "Lead sources",
    singular: "Lead source",
    group: "Leads",
    description: "Where enquiries come from, with optional sub-sources.",
    href: "/settings/sources",
    children: [{ type: "lead_sub_source", label: "Sub-sources" }],
  },
  {
    type: "lead_stages",
    label: "Lead stages",
    singular: "Lead stage",
    group: "Leads",
    description: "Stages live inside your sales pipelines.",
    href: "/settings/pipelines",
  },
  {
    type: "lead_category",
    label: "Lead categories",
    singular: "Lead category",
    group: "Leads",
    description: "Classify leads, e.g. Hot buyer, Investor, NRI.",
    fields: ["color"],
    suggestions: ["Hot", "Warm", "Cold", "Investor", "End user", "NRI"],
  },
  {
    type: "lead_tags",
    label: "Lead tags",
    singular: "Lead tag",
    group: "Leads",
    description: "Free labels your team can add to leads.",
    fields: ["color"],
    suggestions: ["Returning", "VIP", "Loan required", "Ready to move"],
  },

  /* Contacts */
  {
    type: "contact_type",
    label: "Contact types",
    singular: "Contact type",
    group: "Contacts",
    description: "Who a contact is to your business.",
    suggestions: [
      "Buyer",
      "Owner",
      "Broker",
      "Builder",
      "Investor",
      "Leasee",
      "Builder Sales Manager",
      "Contractor",
      "Banker",
      "Existing Clients",
      "Team",
      "Doctor",
      "CA / CS",
      "Advocate",
      "IT / ITES",
      "MNC",
      "Business Man",
      "Government Employee",
      "Other",
    ],
  },
  {
    type: "contact_category",
    label: "Contact categories",
    singular: "Contact category",
    group: "Contacts",
    description: "Group contacts, with optional sub-categories.",
    children: [{ type: "contact_sub_category", label: "Sub-categories" }],
  },
  {
    type: "contact_stage",
    label: "Contact stages",
    singular: "Contact stage",
    group: "Contacts",
    description: "Lifecycle stages for contacts.",
    fields: ["color"],
    suggestions: ["New", "Engaged", "Customer", "Dormant"],
  },
  {
    type: "contact_tags",
    label: "Contact tags",
    singular: "Contact tag",
    group: "Contacts",
    description: "Free labels for contacts.",
    fields: ["color"],
  },

  /* Channel partners */
  {
    type: "cp_company_category",
    label: "CP company categories",
    singular: "CP company category",
    group: "Channel partners",
    description: "Tiers or kinds of partner firms.",
    suggestions: ["Gold", "Silver", "Bronze", "Individual broker", "Corporate"],
  },
  {
    type: "cp_stages",
    label: "CP stages",
    singular: "CP stage",
    group: "Channel partners",
    description: "Onboarding stages for channel partners.",
    fields: ["color"],
    suggestions: ["Prospect", "Meeting done", "Empanelled", "Active", "Inactive"],
  },

  /* Inventory */
  {
    type: "property_type",
    label: "Property types",
    singular: "Property type",
    group: "Inventory",
    description: "Residential, Commercial, Plot… each with sub-types and unit types.",
    children: [
      { type: "property_sub_type", label: "Sub-types" },
      { type: "unit_type", label: "Unit types" },
    ],
    suggestions: ["Residential", "Commercial", "Plot / Land"],
  },
  {
    type: "property_stages",
    label: "Property stages",
    singular: "Property stage",
    group: "Inventory",
    description: "Construction / availability status.",
    fields: ["color"],
    suggestions: ["Pre-launch", "Under construction", "Ready to move", "Sold out"],
  },
  {
    type: "amenities",
    label: "Amenities",
    singular: "Amenity",
    group: "Inventory",
    description: "Facilities you can attach to projects.",
    suggestions: ["Swimming pool", "Gym", "Clubhouse", "Kids play area", "Power backup", "Covered parking", "24x7 security"],
  },

  /* Ranges & regions */
  {
    type: "budget_range",
    label: "Budget ranges",
    singular: "Budget range",
    group: "Ranges & regions",
    description: "Ready-made budget brackets for forms and filters.",
    fields: ["range"],
    unit: "₹",
    suggestions: [
      { name: "Under 50 L", min: 0, max: 5000000 },
      { name: "50 L – 1 Cr", min: 5000000, max: 10000000 },
      { name: "1 – 2 Cr", min: 10000000, max: 20000000 },
      { name: "2 – 5 Cr", min: 20000000, max: 50000000 },
      { name: "5 Cr +", min: 50000000 },
    ],
  },
  {
    type: "area_range",
    label: "Area ranges",
    singular: "Area range",
    group: "Ranges & regions",
    description: "Carpet-area brackets in sq. ft.",
    fields: ["range"],
    unit: "sq.ft",
    suggestions: [
      { name: "Up to 600", min: 0, max: 600 },
      { name: "600 – 1000", min: 600, max: 1000 },
      { name: "1000 – 1500", min: 1000, max: 1500 },
      { name: "1500 +", min: 1500 },
    ],
  },
  {
    type: "regions",
    label: "Regions",
    singular: "Region",
    group: "Ranges & regions",
    description: "Cities, zones or micro-markets you sell in.",
    fields: ["code"],
  },

  /* Marketing */
  {
    type: "banners",
    label: "Banners",
    singular: "Banner",
    group: "Marketing",
    description: "Images shown on the reception kiosk and partner app.",
    fields: ["url", "description"],
  },

  /* Child-only lists */
  { type: "lead_sub_source", label: "Sub-sources", singular: "Sub-source", group: "Leads", description: "", childOnly: true },
  {
    type: "contact_sub_category",
    label: "Sub-categories",
    singular: "Sub-category",
    group: "Contacts",
    description: "",
    childOnly: true,
  },
  { type: "property_sub_type", label: "Sub-types", singular: "Sub-type", group: "Inventory", description: "", childOnly: true },
  { type: "unit_type", label: "Unit types", singular: "Unit type", group: "Inventory", description: "", childOnly: true },
];

export const MASTER_TYPE_KEYS = new Set(MASTER_TYPES.filter((t) => !t.href).map((t) => t.type));
/* Lead sub-sources hang off Source records, so the type itself is valid even though lead_sources isn't. */
MASTER_TYPE_KEYS.add("lead_sub_source");

export function masterType(type: string) {
  return MASTER_TYPES.find((t) => t.type === type);
}

/** ₹ amounts as "1.25 Cr" / "50 L" / "75,000". */
export function formatInr(n?: number | null) {
  if (n == null || !Number.isFinite(n)) return "";
  if (n >= 1e7) return `${+(n / 1e7).toFixed(2)} Cr`;
  if (n >= 1e5) return `${+(n / 1e5).toFixed(2)} L`;
  return n.toLocaleString("en-IN");
}
