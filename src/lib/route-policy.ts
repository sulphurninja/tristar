/**
 * Central API authorisation table, enforced by `withAuth` before any handler
 * runs. First matching rule wins, so specific paths come before broad ones.
 *
 * Reference lists that power dropdowns everywhere (users, teams, projects,
 * sources, pipelines, brokers, campaigns, properties, lead options) stay
 * readable by every signed-in user; only their writes are gated.
 */
import type { Permission } from "@/lib/permissions";

type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
type Rule = [methods: Method[] | "*", pattern: RegExp, perm: Permission | "owner" | null];

const R = (methods: Method[] | "*", pattern: RegExp, perm: Permission | "owner" | null): Rule => [
  methods,
  pattern,
  perm,
];
const READ: Method[] = ["GET"];
const WRITE: Method[] = ["POST", "PATCH", "PUT", "DELETE"];
const CREATE_EDIT: Method[] = ["POST", "PATCH", "PUT"];

const RULES: Rule[] = [
  /* Workspace configuration (before the module rules below, which would match first) */
  R(WRITE, /^\/api\/masters(\/|$)/, "settings.manage"),
  R("*", /^\/api\/distribution(\/|$)/, "users.manage"),
  R(["PUT", "PATCH"], /^\/api\/lead-form$/, "settings.manage"),
  R(["PUT", "PATCH"], /^\/api\/reception\/config$/, "settings.manage"),
  R(READ, /^\/api\/reception\/config$/, null),

  /* Leads */
  R(READ, /^\/api\/leads\/export$/, "leads.export"),
  R(READ, /^\/api\/leads\/options$/, null),
  R("*", /^\/api\/leads\/bulk-update$/, "leads.bulk"),
  R("*", /^\/api\/leads\/bulk$/, "leads.bulk"),
  R("*", /^\/api\/leads\/saved-filters(\/|$)/, "leads.view"),
  R(READ, /^\/api\/leads(\/|$)/, "leads.view"),
  R(["POST"], /^\/api\/leads$/, "leads.create"),
  R(["DELETE"], /^\/api\/leads\/[^/]+$/, "leads.delete"),
  R(WRITE, /^\/api\/leads\/[^/]+(\/|$)/, "leads.edit"),
  R(READ, /^\/api\/crm\/(activities|logs)$/, "leads.view"),

  /* Contacts */
  R(READ, /^\/api\/contacts(\/|$)/, "contacts.view"),
  R(["DELETE"], /^\/api\/contacts\/[^/]+$/, "contacts.delete"),
  R(WRITE, /^\/api\/contacts(\/|$)/, "contacts.manage"),

  /* Tasks & visits */
  R(READ, /^\/api\/tasks(\/|$)/, "tasks.view"),
  R(WRITE, /^\/api\/tasks(\/|$)/, "tasks.manage"),
  R(READ, /^\/api\/visits(\/|$)/, "visits.view"),
  R(WRITE, /^\/api\/visits(\/|$)/, "visits.manage"),

  /* Reception */
  R(READ, /^\/api\/reception(\/|$)/, "reception.view"),
  R(["DELETE"], /^\/api\/reception\/[^/]+$/, "reception.delete"),
  R(WRITE, /^\/api\/reception(\/|$)/, "reception.manage"),

  /* Projects & properties (reads open: used by every lead/booking form) */
  R(["DELETE"], /^\/api\/projects\/[^/]+$/, "projects.archive"),
  R(WRITE, /^\/api\/projects(\/|$)/, "projects.manage"),
  R(["DELETE"], /^\/api\/properties\/[^/]+$/, "properties.delete"),
  R(WRITE, /^\/api\/properties(\/|$)/, "properties.manage"),

  /* Channel partners */
  R(WRITE, /^\/api\/(brokers|cp-companies)(\/|$)/, "cp.manage"),

  /* Bookings & payments */
  R(READ, /^\/api\/bookings(\/|$)/, "bookings.view"),
  R(WRITE, /^\/api\/bookings(\/|$)/, "bookings.manage"),
  R(READ, /^\/api\/payments(\/|$)/, "payments.view"),
  R(WRITE, /^\/api\/payments(\/|$)/, "payments.manage"),

  /* Campaigns */
  R(WRITE, /^\/api\/campaigns(\/|$)/, "campaigns.manage"),

  /* Accounts */
  R(READ, /^\/api\/(ledger|ledgers|vouchers)(\/|$)/, "accounts.view"),
  R(WRITE, /^\/api\/(ledger|ledgers|vouchers)(\/|$)/, "accounts.manage"),

  /* Dashboard & reports */
  R(READ, /^\/api\/dashboard\/summary$/, "dashboard.view"),
  R(READ, /^\/api\/dashboard\/executive$/, "reports.team"),
  R(READ, /^\/api\/reports\/(communication|outgoing-calls)$/, "communication.view"),
  R(READ, /^\/api\/reports\/(team-performance|closing-manager|closing-manager-backlog|svc-user|personalised)$/, "reports.team"),
  R(READ, /^\/api\/reports(\/|$)/, "reports.view"),

  /* Administration */
  R(["PUT", "PATCH"], /^\/api\/roles$/, "owner"),
  R(READ, /^\/api\/roles$/, "users.manage"),
  R(WRITE, /^\/api\/users(\/|$)/, "users.manage"),
  R(WRITE, /^\/api\/teams(\/|$)/, "teams.manage"),
  R(WRITE, /^\/api\/pipelines(\/|$)/, "pipelines.manage"),
  R(WRITE, /^\/api\/sources(\/|$)/, "sources.manage"),
  R("*", /^\/api\/api-keys(\/|$)/, "apikeys.manage"),
  R("*", /^\/api\/workspace(\/|$)/, "settings.manage"),
];

/**
 * Permission needed for a request. `null` = any signed-in user;
 * "owner" = Super Administrator only.
 */
export function requiredPermission(method: string, pathname: string): Permission | "owner" | null {
  const m = method.toUpperCase() as Method;
  for (const [methods, pattern, perm] of RULES) {
    if (methods !== "*" && !methods.includes(m)) continue;
    if (pattern.test(pathname)) return perm;
  }
  return null;
}
