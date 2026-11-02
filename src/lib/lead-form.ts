/**
 * Lead form configuration (client-safe). Decides which fields the "New lead"
 * form shows and which are mandatory. Stored on Workspace.leadFormConfig.
 */

export type FieldMode = "hidden" | "optional" | "required";

export interface FormFieldDef {
  key: string;
  label: string;
  /** Always shown and required (the lead can't exist without it). */
  locked?: boolean;
  default?: FieldMode;
}

export interface FormSectionDef {
  key: string;
  label: string;
  description: string;
  fields: FormFieldDef[];
}

export const LEAD_FORM_SECTIONS: FormSectionDef[] = [
  {
    key: "contact",
    label: "Contact details",
    description: "Who the enquiry is from.",
    fields: [
      { key: "date", label: "Enquiry date" },
      { key: "firstName", label: "First name", locked: true },
      { key: "lastName", label: "Last name" },
      { key: "primaryPhone", label: "Primary phone", locked: true },
      { key: "email", label: "Email" },
      { key: "secondaryPhone", label: "Secondary phone" },
      { key: "alternateNumbers", label: "Alternate numbers", default: "hidden" },
    ],
  },
  {
    key: "lead",
    label: "Lead details",
    description: "How the lead is classified and where it came from.",
    fields: [
      { key: "source", label: "Source" },
      { key: "stage", label: "Lead stage" },
      { key: "category", label: "Lead category" },
      { key: "visitorType", label: "Type of visitor" },
      { key: "channelPartner", label: "Channel partner" },
      { key: "tags", label: "Tags" },
      { key: "relatedSource", label: "Is related source", default: "hidden" },
    ],
  },
  {
    key: "assignment",
    label: "Assignment",
    description: "Who works this lead.",
    fields: [
      { key: "salesAgent", label: "Sales agent" },
      { key: "preSalesAgent", label: "Pre-sales agent" },
      { key: "sourcingManager", label: "Sourcing manager" },
      { key: "coOwner", label: "Co-owners", default: "hidden" },
    ],
  },
  {
    key: "personal",
    label: "Personal",
    description: "Extra details for relationship building.",
    fields: [
      { key: "address", label: "Address" },
      { key: "country", label: "Country" },
      { key: "dob", label: "Date of birth", default: "hidden" },
      { key: "anniversary", label: "Date of anniversary", default: "hidden" },
    ],
  },
];

export interface FormConfig {
  sections?: Record<string, boolean>;
  fields?: Record<string, FieldMode>;
}

const MODES: FieldMode[] = ["hidden", "optional", "required"];

/** Resolved mode for every field (locked → required, disabled section → hidden). */
export function resolveForm(sections: FormSectionDef[], cfg?: FormConfig | null) {
  const out: Record<string, FieldMode> = {};
  const sectionOn: Record<string, boolean> = {};
  for (const s of sections) {
    const on = cfg?.sections?.[s.key] ?? true;
    sectionOn[s.key] = on;
    for (const f of s.fields) {
      if (f.locked) out[f.key] = "required";
      else if (!on) out[f.key] = "hidden";
      else out[f.key] = cfg?.fields?.[f.key] ?? f.default ?? "optional";
    }
  }
  return { fields: out, sections: sectionOn };
}

/** Keep only known keys / values from untrusted input. */
export function cleanFormConfig(sections: FormSectionDef[], raw: unknown): FormConfig {
  const r = (raw ?? {}) as FormConfig;
  const out: FormConfig = { sections: {}, fields: {} };
  for (const s of sections) {
    if (typeof r.sections?.[s.key] === "boolean") out.sections![s.key] = r.sections[s.key];
    for (const f of s.fields) {
      const m = r.fields?.[f.key];
      if (!f.locked && m && MODES.includes(m)) out.fields![f.key] = m;
    }
  }
  return out;
}
