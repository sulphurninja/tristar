/**
 * Reception kiosk configuration (client-safe). Stored on Workspace.receptionConfig
 * and edited from Settings → Reception app.
 */
import type { FormConfig, FormSectionDef } from "@/lib/lead-form";

export const RECEPTION_SECTIONS: FormSectionDef[] = [
  {
    key: "personal",
    label: "Personal",
    description: "The visitor's name and basics.",
    fields: [
      { key: "firstName", label: "First name", locked: true },
      { key: "lastName", label: "Last name", default: "required" },
      { key: "email", label: "Email" },
      { key: "dob", label: "Date of birth", default: "hidden" },
    ],
  },
  {
    key: "contact",
    label: "Contact",
    description: "How to reach them. The mobile number also finds returning visitors.",
    fields: [
      { key: "primaryPhone", label: "Mobile number", locked: true },
      { key: "secondaryPhone", label: "Alternate number", default: "hidden" },
      { key: "occupation", label: "Occupation" },
      { key: "address", label: "Address", default: "hidden" },
    ],
  },
  {
    key: "location",
    label: "Location",
    description: "Where they live today.",
    fields: [
      { key: "city", label: "City" },
      { key: "locality", label: "Locality" },
      { key: "pincode", label: "Pincode", default: "hidden" },
    ],
  },
  {
    key: "preference",
    label: "Preference",
    description: "What they're looking for.",
    fields: [
      { key: "project", label: "Project", default: "required" },
      { key: "configuration", label: "Configuration (1/2/3 BHK…)" },
      { key: "budget", label: "Budget" },
      { key: "purpose", label: "Purpose (self use / investment)" },
      { key: "timeline", label: "Buying timeline", default: "hidden" },
    ],
  },
  {
    key: "assignment",
    label: "Assignment",
    description: "Who meets the visitor. They get a task the moment the visitor checks in.",
    fields: [
      { key: "preSalesAgent", label: "Pre-sales agent" },
      { key: "closingManager", label: "Closing manager" },
      { key: "sourcingManager", label: "Sourcing manager", default: "hidden" },
    ],
  },
  {
    key: "finalize",
    label: "Finalize",
    description: "Source and a note for the team.",
    fields: [
      { key: "source", label: "How did you hear about us?" },
      { key: "channelPartner", label: "Channel partner" },
      { key: "visitorCount", label: "Number of visitors" },
      { key: "remark", label: "Remark" },
    ],
  },
];

export interface ProjectDesk {
  projectId: string;
  /** Default closing manager for walk-ins for this project. */
  agentId?: string;
  /** Budget choices shown to the visitor, e.g. ["1 Cr", "1.25 Cr"]. */
  budgets: string[];
  /** Configurations offered, e.g. ["2 BHK", "3 BHK"]. */
  configurations: string[];
}

export interface ReceptionOptions {
  /** Recognise returning visitors by mobile number and pre-fill their details. */
  welcomeBack: boolean;
  /** Assign the project's default agent when reception doesn't pick one. */
  autoAssignProjectAgent: boolean;
  /** Also log a site visit (done) for the lead when they check in. */
  logSiteVisit: boolean;
  /** Seconds before the thank-you screen resets for the next visitor. */
  resetSeconds: number;
  welcomeTitle: string;
  welcomeMessage: string;
}

export interface ReceptionConfig {
  form: FormConfig;
  projects: ProjectDesk[];
  options: ReceptionOptions;
  purposes: string[];
  timelines: string[];
}

export const DEFAULT_RECEPTION: ReceptionConfig = {
  form: {},
  projects: [],
  options: {
    welcomeBack: true,
    autoAssignProjectAgent: true,
    logSiteVisit: true,
    resetSeconds: 12,
    welcomeTitle: "Welcome to Tristar Realtors",
    welcomeMessage: "Please share a few details and we'll connect you with our team right away.",
  },
  purposes: ["Self use", "Investment", "Both"],
  timelines: ["Immediately", "Within 3 months", "3–6 months", "6+ months", "Just exploring"],
};

const strList = (v: unknown, max = 40) =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean))].slice(0, max)
    : [];

/** Merge stored config over defaults, dropping anything malformed. */
export function normalizeReception(raw: unknown): ReceptionConfig {
  const r = (raw ?? {}) as Partial<ReceptionConfig>;
  const o = (r.options ?? {}) as Partial<ReceptionOptions>;
  const d = DEFAULT_RECEPTION;
  return {
    form: (r.form as FormConfig) ?? {},
    projects: Array.isArray(r.projects)
      ? r.projects
          .filter((p): p is ProjectDesk => !!p && typeof p.projectId === "string")
          .map((p) => ({
            projectId: p.projectId,
            agentId: typeof p.agentId === "string" && p.agentId ? p.agentId : undefined,
            budgets: strList(p.budgets),
            configurations: strList(p.configurations),
          }))
      : [],
    options: {
      welcomeBack: typeof o.welcomeBack === "boolean" ? o.welcomeBack : d.options.welcomeBack,
      autoAssignProjectAgent:
        typeof o.autoAssignProjectAgent === "boolean" ? o.autoAssignProjectAgent : d.options.autoAssignProjectAgent,
      logSiteVisit: typeof o.logSiteVisit === "boolean" ? o.logSiteVisit : d.options.logSiteVisit,
      resetSeconds: Math.min(Math.max(Number(o.resetSeconds) || d.options.resetSeconds, 5), 120),
      welcomeTitle: typeof o.welcomeTitle === "string" && o.welcomeTitle.trim() ? o.welcomeTitle.trim().slice(0, 80) : d.options.welcomeTitle,
      welcomeMessage:
        typeof o.welcomeMessage === "string" && o.welcomeMessage.trim() ? o.welcomeMessage.trim().slice(0, 240) : d.options.welcomeMessage,
    },
    purposes: strList(r.purposes).length ? strList(r.purposes) : d.purposes,
    timelines: strList(r.timelines).length ? strList(r.timelines) : d.timelines,
  };
}
