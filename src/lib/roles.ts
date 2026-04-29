/**
 * Pure role types + helpers — safe to import from client components.
 *
 * Anything that touches `next/headers` (cookie reads, session lookups) lives
 * in `src/lib/auth.ts` and must only be imported from server components and
 * route handlers.
 */
export type Role =
  | "owner"
  | "admin"
  | "manager"
  | "supervisor"
  | "sales_executive"
  | "telecaller"
  | "field_executive"
  | "channel_partner"
  | "viewer";

export const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 100,
  admin: 90,
  manager: 80,
  supervisor: 70,
  sales_executive: 60,
  telecaller: 50,
  field_executive: 50,
  channel_partner: 40,
  viewer: 10,
};

export const ROLE_LABELS: Record<Role, string> = {
  owner: "Super Administrator",
  admin: "Administrator",
  manager: "Manager",
  supervisor: "Supervisor",
  sales_executive: "Executive",
  telecaller: "Telecaller",
  field_executive: "Field Executive",
  channel_partner: "Channel Partner",
  viewer: "Viewer",
};

export function hasRole(userRole: Role, minimum: Role) {
  return (ROLE_HIERARCHY[userRole] ?? 0) >= (ROLE_HIERARCHY[minimum] ?? 0);
}
