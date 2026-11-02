/**
 * Permission catalogue + role defaults — pure, safe to import from client code.
 *
 * Effective access for a user =
 *   role template (workspace override, else ROLE_DEFAULTS)
 *   + user.permissionOverrides.allow
 *   − user.permissionOverrides.deny
 * The owner (Super Administrator) always has every permission and sees all data.
 */
import type { Role } from "@/lib/roles";

export type DataScope = "all" | "team" | "own";

export const DATA_SCOPES: Array<{ value: DataScope; label: string; hint: string }> = [
  { value: "all", label: "Entire workspace", hint: "Sees every record across all teams." },
  { value: "team", label: "Their team", hint: "Records assigned to anyone in their team, or teams they lead." },
  { value: "own", label: "Only their own", hint: "Records assigned to them personally." },
];

interface PermissionDef {
  key: string;
  label: string;
}

export interface PermissionGroup {
  key: string;
  label: string;
  perms: PermissionDef[];
}

export const PERMISSION_GROUPS = [
  {
    key: "workspace",
    label: "Workspace",
    perms: [
      { key: "dashboard.view", label: "View dashboard" },
      { key: "communication.view", label: "Call & communication analytics" },
    ],
  },
  {
    key: "leads",
    label: "Leads",
    perms: [
      { key: "leads.view", label: "View leads" },
      { key: "leads.create", label: "Create leads" },
      { key: "leads.edit", label: "Update leads & log activity" },
      { key: "leads.bulk", label: "Bulk update, import & reassign" },
      { key: "leads.export", label: "Export leads" },
      { key: "leads.delete", label: "Delete leads" },
    ],
  },
  {
    key: "contacts",
    label: "Contacts",
    perms: [
      { key: "contacts.view", label: "View contacts" },
      { key: "contacts.manage", label: "Create & edit contacts" },
      { key: "contacts.delete", label: "Delete contacts" },
    ],
  },
  {
    key: "work",
    label: "Tasks & site visits",
    perms: [
      { key: "tasks.view", label: "View tasks" },
      { key: "tasks.manage", label: "Create & update tasks" },
      { key: "visits.view", label: "View site visits" },
      { key: "visits.manage", label: "Schedule & update site visits" },
    ],
  },
  {
    key: "reception",
    label: "Reception",
    perms: [
      { key: "reception.view", label: "View walk-ins" },
      { key: "reception.manage", label: "Register & update walk-ins" },
      { key: "reception.delete", label: "Delete walk-in records" },
    ],
  },
  {
    key: "inventory",
    label: "Projects & inventory",
    perms: [
      { key: "projects.view", label: "View projects" },
      { key: "projects.manage", label: "Create & edit projects" },
      { key: "projects.archive", label: "Archive projects" },
      { key: "properties.view", label: "View properties" },
      { key: "properties.manage", label: "Create & edit properties" },
      { key: "properties.delete", label: "Delete properties" },
    ],
  },
  {
    key: "cp",
    label: "Channel partners",
    perms: [
      { key: "cp.view", label: "View channel partners" },
      { key: "cp.manage", label: "Manage channel partners & companies" },
    ],
  },
  {
    key: "sales",
    label: "Bookings & payments",
    perms: [
      { key: "bookings.view", label: "View bookings" },
      { key: "bookings.manage", label: "Create & edit bookings" },
      { key: "payments.view", label: "View payments" },
      { key: "payments.manage", label: "Record & edit payments" },
    ],
  },
  {
    key: "marketing",
    label: "Campaigns",
    perms: [
      { key: "campaigns.view", label: "View campaigns" },
      { key: "campaigns.manage", label: "Create & edit campaigns" },
    ],
  },
  {
    key: "accounts",
    label: "Accounts",
    perms: [
      { key: "accounts.view", label: "View ledgers & vouchers" },
      { key: "accounts.manage", label: "Post & edit vouchers and ledgers" },
    ],
  },
  {
    key: "reports",
    label: "Reports",
    perms: [
      { key: "reports.view", label: "View reports" },
      { key: "reports.team", label: "Team & per-user performance reports" },
    ],
  },
  {
    key: "admin",
    label: "Administration",
    perms: [
      { key: "requests.approve", label: "Approve requests" },
      { key: "users.manage", label: "Manage users" },
      { key: "teams.manage", label: "Manage teams" },
      { key: "pipelines.manage", label: "Configure pipelines" },
      { key: "sources.manage", label: "Configure lead sources" },
      { key: "apikeys.manage", label: "Manage API keys" },
      { key: "settings.manage", label: "Workspace settings & compliance" },
    ],
  },
] as const satisfies readonly PermissionGroup[];

export type Permission = (typeof PERMISSION_GROUPS)[number]["perms"][number]["key"];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_GROUPS.flatMap((g) => g.perms.map((p) => p.key));

const PERMISSION_SET = new Set<string>(ALL_PERMISSIONS);
export function isPermission(v: unknown): v is Permission {
  return typeof v === "string" && PERMISSION_SET.has(v);
}

const without = (...drop: Permission[]) => ALL_PERMISSIONS.filter((p) => !drop.includes(p));

const FIELD_BASE: Permission[] = [
  "dashboard.view",
  "leads.view",
  "leads.create",
  "leads.edit",
  "tasks.view",
  "tasks.manage",
  "visits.view",
  "visits.manage",
  "projects.view",
  "properties.view",
];

export interface RoleTemplate {
  permissions: Permission[];
  scope: DataScope;
}

export const ROLE_DEFAULTS: Record<Role, RoleTemplate> = {
  owner: { permissions: ALL_PERMISSIONS, scope: "all" },
  admin: { permissions: ALL_PERMISSIONS, scope: "all" },
  manager: {
    permissions: without("users.manage", "apikeys.manage", "settings.manage", "pipelines.manage", "sources.manage"),
    scope: "all",
  },
  supervisor: {
    permissions: [
      ...FIELD_BASE,
      "communication.view",
      "leads.bulk",
      "leads.export",
      "contacts.view",
      "contacts.manage",
      "reception.view",
      "reception.manage",
      "reception.delete",
      "cp.view",
      "cp.manage",
      "bookings.view",
      "payments.view",
      "campaigns.view",
      "reports.view",
      "reports.team",
    ],
    scope: "team",
  },
  sales_executive: {
    permissions: [
      ...FIELD_BASE,
      "contacts.view",
      "contacts.manage",
      "reception.view",
      "cp.view",
      "bookings.view",
      "reports.view",
    ],
    scope: "own",
  },
  telecaller: {
    permissions: [...FIELD_BASE, "communication.view", "contacts.view"],
    scope: "own",
  },
  field_executive: {
    permissions: FIELD_BASE.filter((p) => p !== "leads.create"),
    scope: "own",
  },
  channel_partner: {
    permissions: ["dashboard.view", "leads.view", "leads.create", "projects.view", "properties.view"],
    scope: "own",
  },
  viewer: {
    permissions: [
      "dashboard.view",
      "leads.view",
      "contacts.view",
      "tasks.view",
      "visits.view",
      "projects.view",
      "properties.view",
      "cp.view",
      "bookings.view",
      "reports.view",
    ],
    scope: "all",
  },
};

export interface PermissionOverrides {
  allow?: string[];
  deny?: string[];
}

export type RoleTemplates = Partial<Record<Role, { permissions?: string[]; scope?: DataScope }>>;

export function roleTemplate(role: Role, custom?: RoleTemplates | null): RoleTemplate {
  const base = ROLE_DEFAULTS[role] ?? ROLE_DEFAULTS.viewer;
  if (role === "owner") return base;
  const c = custom?.[role];
  return {
    permissions: c?.permissions ? c.permissions.filter(isPermission) : base.permissions,
    scope: c?.scope ?? base.scope,
  };
}

export function effectiveAccess(
  role: Role,
  overrides?: PermissionOverrides | null,
  scopeOverride?: DataScope | null,
  custom?: RoleTemplates | null,
): RoleTemplate {
  if (role === "owner") return ROLE_DEFAULTS.owner;
  const tpl = roleTemplate(role, custom);
  const set = new Set<Permission>(tpl.permissions);
  for (const p of overrides?.allow ?? []) if (isPermission(p)) set.add(p);
  for (const p of overrides?.deny ?? []) if (isPermission(p)) set.delete(p);
  return {
    permissions: ALL_PERMISSIONS.filter((p) => set.has(p)),
    scope: scopeOverride ?? tpl.scope,
  };
}

/**
 * Pages → permission needed to open them. Longest matching prefix wins.
 * `null` means any signed-in user. Used by the sidebar and the in-app route guard.
 */
export const PAGE_PERMISSIONS: Array<[string, Permission | "owner" | null]> = [
  ["/dashboard", "dashboard.view"],
  ["/tasks", "tasks.view"],
  ["/visits", "visits.view"],
  ["/leads", "leads.view"],
  ["/leads/new", "leads.create"],
  ["/leads/bulk-update", "leads.bulk"],
  ["/crm/contacts", "contacts.view"],
  ["/crm/activities", "leads.view"],
  ["/crm/logs", "leads.view"],
  ["/crm/property", "properties.view"],
  ["/crm/reception", "reception.view"],
  ["/projects", "projects.view"],
  ["/brokers", "cp.view"],
  ["/bookings", "bookings.view"],
  ["/bookings/payments", "payments.view"],
  ["/campaigns", "campaigns.view"],
  ["/accounts", "accounts.view"],
  ["/communication-analysis", "communication.view"],
  ["/outgoing-calls", "communication.view"],
  ["/reports", "reports.view"],
  ["/reports/team-performance", "reports.team"],
  ["/reports/closing-manager", "reports.team"],
  ["/reports/closing-manager-backlog", "reports.team"],
  ["/reports/svc-user", "reports.team"],
  ["/reports/personalised", "reports.team"],
  ["/requests", null],
  ["/settings", null],
  ["/settings/users", "users.manage"],
  ["/settings/teams", "teams.manage"],
  ["/settings/roles", "owner"],
  ["/settings/pipelines", "pipelines.manage"],
  ["/settings/sources", "sources.manage"],
  ["/settings/projects", "projects.manage"],
  ["/settings/brokers", "cp.manage"],
  ["/settings/api-keys", "apikeys.manage"],
  ["/settings/compliance", "settings.manage"],
  ["/settings/masters", "settings.manage"],
  ["/settings/lead-form", "settings.manage"],
  ["/settings/reception", "settings.manage"],
  ["/reception", "reception.manage"],
];

export function pagePermission(pathname: string): Permission | "owner" | null {
  let best: [string, Permission | "owner" | null] | null = null;
  for (const entry of PAGE_PERMISSIONS) {
    const [prefix] = entry;
    if ((pathname === prefix || pathname.startsWith(`${prefix}/`)) && (!best || prefix.length > best[0].length)) {
      best = entry;
    }
  }
  return best ? best[1] : null;
}

export function canAccessPage(
  pathname: string,
  role: string | undefined,
  permissions: readonly string[] | undefined,
): boolean {
  const need = pagePermission(pathname);
  if (need === null) return true;
  if (role === "owner") return true;
  if (need === "owner") return false;
  return !!permissions?.includes(need);
}
