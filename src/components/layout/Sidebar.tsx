"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Contact,
  Target,
  Building2,
  Handshake,
  BadgeCheck,
  BarChart3,
  Settings,
  LayoutGrid,
  Plus,
  ArrowUpRight,
  ChevronDown,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPage } from "@/lib/permissions";

type Icon = React.ComponentType<{ className?: string; strokeWidth?: number }>;

export interface NavChild {
  label: string;
  href: string;
  /** Breadcrumb group, when different from the parent item's label. */
  group?: string;
  external?: boolean;
}

export interface NavItem {
  label: string;
  href?: string;
  icon: Icon;
  /** One-line plain-language explanation, shown on hover. */
  hint?: string;
  children?: NavChild[];
  /** Opens in a new tab (e.g. the full-screen reception kiosk). */
  external?: boolean;
}

export interface NavSection {
  label?: string;
  items: NavItem[];
}

/**
 * Kept deliberately short: the eight things people do every day, then
 * "More" (collapsed) for everything else, then Settings.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    items: [
      { label: "Home", href: "/dashboard", icon: LayoutDashboard, hint: "Today at a glance" },
      { label: "Tasks & visits", href: "/tasks", icon: ListChecks, hint: "Your calls, meetings and site visits" },
      { label: "Leads", href: "/leads", icon: Target, hint: "Every enquiry, with filters and follow-ups" },
      { label: "Contacts", href: "/crm/contacts", icon: Contact, hint: "Buyers and people you know" },
      { label: "Projects", href: "/projects", icon: Building2, hint: "Your projects and inventory" },
      { label: "Channel partners", href: "/brokers", icon: Handshake, hint: "Brokers who bring you buyers" },
      { label: "Bookings", href: "/bookings", icon: BadgeCheck, hint: "Units booked by customers" },
      { label: "Reports", href: "/reports", icon: BarChart3, hint: "How sales and your team are doing" },
    ],
  },
  {
    items: [
      {
        label: "More",
        icon: LayoutGrid,
        hint: "Everything else",
        children: [
          { label: "Reception desk", href: "/reception", group: "Customers", external: true },
          { label: "Walk-in register", href: "/crm/reception", group: "Customers" },
          { label: "Pipeline board", href: "/leads/pipeline", group: "Leads" },
          { label: "Properties", href: "/crm/property", group: "Projects" },
          { label: "Partner companies", href: "/brokers/companies", group: "Channel partners" },
          { label: "Payments", href: "/bookings/payments", group: "Bookings" },
          { label: "Ledger", href: "/accounts/ledger", group: "Accounts" },
          { label: "Vouchers", href: "/accounts/vouchers", group: "Accounts" },
          { label: "Campaigns", href: "/campaigns", group: "Marketing" },
          { label: "Activity log", href: "/crm/activities", group: "Leads" },
          { label: "Call logs", href: "/crm/logs", group: "Leads" },
          { label: "Call analytics", href: "/communication-analysis", group: "Reports" },
          { label: "Requests", href: "/requests", group: "Workspace" },
        ],
      },
      { label: "Settings", href: "/settings", icon: Settings, hint: "Users, permissions, masters and setup" },
    ],
  },
];

/** Report pages: reached from the Reports hub; named here for breadcrumbs. */
const REPORT_LINKS: Array<{ label: string; href: string }> = [
  { label: "Lead analysis", href: "/reports/lead-analysis" },
  { label: "Lead volume", href: "/reports/lead-volume" },
  { label: "Team performance", href: "/reports/team-performance" },
  { label: "Sources", href: "/reports/sources" },
  { label: "Projects", href: "/reports/projects" },
  { label: "Site visits by source", href: "/reports/svc-source" },
  { label: "Site visits by user", href: "/reports/svc-user" },
  { label: "Channel partners", href: "/reports/channel-partner" },
  { label: "Activity", href: "/reports/activity" },
  { label: "Backlog", href: "/reports/backlog" },
  { label: "Advance analysis", href: "/reports/advance-analysis" },
];

/** Settings sub-pages: reachable from the Settings overview, named here for breadcrumbs and search. */
export const SETTINGS_LINKS: Array<{ label: string; href: string }> = [
  { label: "Users", href: "/settings/users" },
  { label: "Teams", href: "/settings/teams" },
  { label: "Roles & permissions", href: "/settings/roles" },
  { label: "Masters", href: "/settings/masters" },
  { label: "Lead form fields", href: "/settings/lead-form" },
  { label: "Reception app", href: "/settings/reception" },
  { label: "Pipelines", href: "/settings/pipelines" },
  { label: "Lead sources", href: "/settings/sources" },
  { label: "Projects", href: "/settings/projects" },
  { label: "API keys", href: "/settings/api-keys" },
  { label: "Compliance", href: "/settings/compliance" },
];

/** Flat list of every destination, used by breadcrumbs and the command palette. */
export const NAV_LINKS: Array<{ label: string; href: string; group?: string }> = [
  ...NAV_SECTIONS.flatMap((s) =>
    s.items.flatMap((i) =>
      i.children
        ? i.children.map((c) => ({ label: c.label, href: c.href, group: c.group ?? i.label }))
        : [{ label: i.label, href: i.href!, group: s.label }],
    ),
  ),
  ...SETTINGS_LINKS.map((l) => ({ ...l, group: "Settings" })),
  ...REPORT_LINKS.map((l) => ({ ...l, group: "Reports" })),
];

/** Longest-prefix match so /leads/pipeline lights "Pipeline board", not "All leads". */
function activeHref(pathname: string, hrefs: string[]) {
  let best: string | null = null;
  for (const h of hrefs) {
    const hit = pathname === h || pathname.startsWith(`${h}/`);
    if (hit && (!best || h.length > best.length)) best = h;
  }
  return best;
}

/* Only sidebar destinations; settings sub-pages light up "Settings" via prefix match. */
const ALL_HREFS = NAV_SECTIONS.flatMap((s) => s.items.flatMap((i) => (i.children ? i.children.map((c) => c.href) : [i.href!])));

const COLLAPSE_KEY = "ts.nav.collapsed";

export function Sidebar({
  open,
  onOpenChange,
  onSearch,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSearch: () => void;
}) {
  const pathname = usePathname();
  const { user, workspace, can } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* storage unavailable */
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* ignore */
      }
      return !c;
    });
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  /* Only show what this user is allowed to open. */
  const sections = useMemo(() => {
    const ok = (href: string) => canAccessPage(href, user?.role, user?.permissions);
    return NAV_SECTIONS.map((s) => ({
      ...s,
      items: s.items
        .map((i) => (i.children ? { ...i, children: i.children.filter((c) => ok(c.href)) } : i))
        .filter((i) => (i.children ? i.children.length > 0 : ok(i.href!))),
    })).filter((s) => s.items.length > 0);
  }, [user?.role, user?.permissions]);

  const current = activeHref(pathname, ALL_HREFS);
  const narrow = collapsed;

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-slate-900/25 backdrop-blur-[2px] lg:hidden"
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex flex-col border-r border-border bg-white transition-[width,transform] duration-200 lg:static lg:z-20",
          narrow ? "w-[68px]" : "w-[252px]",
          open ? "translate-x-0" : "-translate-x-full lg:hidden",
        )}
      >
        {/* Brand */}
        <div className={cn("flex h-14 shrink-0 items-center gap-2.5 px-3.5", narrow && "justify-center px-0")}>
          <Link href="/dashboard" className="flex min-w-0 items-center gap-2.5" aria-label="Tristar Realtors">
            <BrandMark />
            {!narrow ? (
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[14px] font-semibold tracking-[-0.01em] text-foreground">
                  {workspace?.name ?? "Tristar Realtors"}
                </span>
                <span className="block text-[11.5px] text-muted-foreground">Sales workspace</span>
              </span>
            ) : null}
          </Link>
        </div>

        {/* Primary action + search */}
        <div className={cn("space-y-2 px-3 pb-3", narrow && "px-2.5")}>
          {can("leads.create") ? (
            <Link
              href="/leads/new"
              title="Add a new lead"
              className={cn("bd-btn w-full !h-9", narrow && "!px-0")}
            >
              <Plus className="size-4" strokeWidth={2.25} />
              {!narrow ? "New lead" : null}
            </Link>
          ) : null}
          <button
            type="button"
            onClick={onSearch}
            title="Search (Ctrl K)"
            className={cn(
              "flex h-9 w-full items-center gap-2 rounded-[9px] border border-border bg-muted/50 px-2.5 text-[13px] text-muted-foreground transition-colors hover:border-input hover:bg-white",
              narrow && "justify-center px-0",
            )}
          >
            <Search className="size-4 shrink-0" />
            {!narrow ? (
              <>
                <span className="flex-1 text-left">Search</span>
                <kbd className="rounded border border-border bg-white px-1.5 py-px font-sans text-[10.5px] font-medium text-muted-foreground">
                  Ctrl K
                </kbd>
              </>
            ) : null}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 scrollbar-hide" aria-label="Main">
          {sections.map((section, si) => (
            <div key={section.label ?? si} className={cn(si > 0 && "mt-4")}>
              {section.label && !narrow ? (
                <p className="mb-1 px-2.5 text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground/80">
                  {section.label}
                </p>
              ) : null}
              {(section.label && narrow) || (!section.label && si > 0) ? <div className="mx-2 mb-3 h-px bg-border" /> : null}
              <ul className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  if (!item.children) {
                    const on = current === item.href;
                    return (
                      <li key={item.label}>
                        <Link
                          href={item.href!}
                          title={narrow ? `${item.label}${item.hint ? ` — ${item.hint}` : ""}` : item.hint}
                          target={item.external ? "_blank" : undefined}
                          aria-current={on ? "page" : undefined}
                          className={cn(
                            "group relative flex h-9 items-center gap-2.5 rounded-[9px] px-2.5 text-[13.5px] font-medium transition-colors",
                            narrow && "justify-center px-0",
                            on
                              ? "bg-primary-50 text-primary-700"
                              : "text-foreground/75 hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {on ? <span className="absolute -left-3 top-2 h-5 w-[3px] rounded-r-full bg-primary" /> : null}
                          <Icon className={cn("size-[18px] shrink-0", on ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={1.9} />
                          {!narrow ? <span className="flex-1 truncate">{item.label}</span> : null}
                          {!narrow && item.external ? (
                            <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground/60 group-hover:text-foreground" />
                          ) : null}
                        </Link>
                      </li>
                    );
                  }
                  const childOn = item.children.some((c) => c.href === current);
                  const isOpen = expanded[item.label] ?? childOn;
                  return (
                    <li key={item.label}>
                      <button
                        type="button"
                        title={narrow ? `${item.label}${item.hint ? ` — ${item.hint}` : ""}` : item.hint}
                        aria-expanded={isOpen}
                        onClick={() => {
                          if (narrow) {
                            toggleCollapsed();
                            setExpanded((e) => ({ ...e, [item.label]: true }));
                            return;
                          }
                          setExpanded((e) => ({ ...e, [item.label]: !isOpen }));
                        }}
                        className={cn(
                          "group relative flex h-9 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-[13.5px] font-medium transition-colors",
                          narrow && "justify-center px-0",
                          childOn ? "text-foreground" : "text-foreground/75 hover:bg-muted hover:text-foreground",
                          narrow && childOn && "bg-primary-50 text-primary-700",
                        )}
                      >
                        <Icon className={cn("size-[18px] shrink-0", childOn ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} strokeWidth={1.9} />
                        {!narrow ? (
                          <>
                            <span className="flex-1 truncate text-left">{item.label}</span>
                            <ChevronDown
                              className={cn("size-4 text-muted-foreground transition-transform", isOpen ? "rotate-0" : "-rotate-90")}
                            />
                          </>
                        ) : null}
                      </button>
                      {!narrow && isOpen ? (
                        <ul className="relative ml-[19px] mt-0.5 space-y-0.5 border-l border-border pl-2.5">
                          {item.children.map((c) => {
                            const on = c.href === current;
                            return (
                              <li key={c.href}>
                                <Link
                                  href={c.href}
                                  target={c.external ? "_blank" : undefined}
                                  aria-current={on ? "page" : undefined}
                                  className={cn(
                                    "relative flex h-8 items-center rounded-[8px] px-2.5 text-[13px] transition-colors",
                                    on
                                      ? "bg-primary-50 font-medium text-primary-700"
                                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                  )}
                                >
                                  {on ? <span className="absolute -left-[11px] top-1.5 h-5 w-px bg-primary" /> : null}
                                  <span className="flex-1 truncate">{c.label}</span>
                                  {c.external ? <ArrowUpRight className="size-3 shrink-0 text-muted-foreground/60" /> : null}
                                </Link>
                              </li>
                            );
                          })}
                        </ul>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className={cn("hidden border-t border-border p-3 lg:block", narrow && "px-2.5")}>
          <button
            type="button"
            onClick={toggleCollapsed}
            className={cn(
              "flex h-8 w-full items-center gap-2 rounded-[8px] px-2.5 text-[12.5px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              narrow && "justify-center px-0",
            )}
          >
            {narrow ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            {!narrow ? "Collapse sidebar" : null}
          </button>
        </div>
      </aside>
    </>
  );
}

/** Tristar tower, redrawn as a compact mark: three stepped blocks on a blue tile. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-gradient-to-b from-[#3b82f6] to-[#1d4ed8] shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_1px_2px_rgba(29,78,216,0.35)]",
        className,
      )}
    >
      <svg viewBox="0 0 20 20" className="size-[18px]" fill="none" stroke="white" strokeWidth="1.6" strokeLinejoin="round">
        <path d="M8.5 2.5h3v6h-3z" />
        <path d="M6.5 8.5h7v4.5h-7z" opacity="0.8" />
        <path d="M4.5 13h11v4.5h-11z" />
        <path d="M10 15v2.5" opacity="0.8" />
      </svg>
    </span>
  );
}
