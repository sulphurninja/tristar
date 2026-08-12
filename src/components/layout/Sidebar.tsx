"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListTodo,
  Contact,
  ListChecks,
  KanbanSquare,
  Activity,
  ScrollText,
  Handshake,
  Upload,
  Building2,
  Home,
  CalendarCheck,
  ClipboardCheck,
  CreditCard,
  Megaphone,
  BookOpen,
  FileText,
  PieChart,
  Settings,
  Users,
  GitBranch,
  Tags,
  KeyRound,
  ClipboardList,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Menu,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

interface NavSection {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
}

const SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Tasks", href: "/tasks", icon: ListTodo },
    ],
  },
  {
    label: "CRM",
    collapsible: true,
    items: [
      { label: "Contacts", href: "/crm/contacts", icon: Contact },
      { label: "Leads", href: "/leads", icon: ListChecks },
      { label: "Pipeline", href: "/leads/pipeline", icon: KanbanSquare },
      { label: "Activities", href: "/crm/activities", icon: Activity },
      { label: "Logs", href: "/crm/logs", icon: ScrollText },
      { label: "Channel Partners", href: "/brokers", icon: Handshake },
      { label: "Bulk Update", href: "/leads/bulk-update", icon: Upload },
    ],
  },
  {
    label: "Inventory",
    collapsible: true,
    items: [
      { label: "Projects", href: "/projects", icon: Building2 },
      { label: "Property", href: "/crm/property", icon: Home },
      { label: "Site Visits", href: "/visits", icon: CalendarCheck },
      { label: "SVP Dashboard", href: "/visits/scheduled", icon: ClipboardCheck },
    ],
  },
  {
    label: "Sales",
    collapsible: true,
    items: [
      { label: "Bookings", href: "/bookings", icon: ClipboardCheck },
      { label: "Payments", href: "/bookings/payments", icon: CreditCard },
      { label: "Campaigns", href: "/campaigns", icon: Megaphone },
    ],
  },
  {
    label: "Accounts",
    collapsible: true,
    items: [
      { label: "Ledger", href: "/accounts/ledger", icon: BookOpen },
      { label: "Vouchers", href: "/accounts/vouchers", icon: FileText },
    ],
  },
  {
    label: "Insights",
    collapsible: true,
    items: [
      { label: "Reports hub", href: "/reports", icon: PieChart },
      { label: "Advance analysis", href: "/reports/advance-analysis", icon: Activity },
      { label: "Lead volume", href: "/reports/lead-volume", icon: ListChecks },
      { label: "Team performance", href: "/reports/team-performance", icon: Users },
      { label: "Activity", href: "/reports/activity", icon: Activity },
    ],
  },
];

const MANAGE_ITEMS: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Users", href: "/settings/users", icon: Users },
  { label: "Pipelines", href: "/settings/pipelines", icon: GitBranch },
  { label: "Sources", href: "/settings/sources", icon: Tags },
  { label: "API Keys", href: "/settings/api-keys", icon: KeyRound },
  { label: "Requests", href: "/requests", icon: ClipboardList },
];

const STORAGE_KEY = "tristar.sidebar.rail";

function pathActive(pathname: string, href: string) {
  if (pathname === href) return true;
  if (href === "/dashboard") return false;
  if (href === "/leads") return pathname === "/leads";
  if (href === "/bookings") return pathname === "/bookings";
  if (href === "/reports") return pathname === "/reports";
  if (href === "/settings") return pathname === "/settings";
  return pathname.startsWith(`${href}/`) || pathname === href;
}

export function Sidebar({
  mobileOpen,
  onMobileOpenChange,
}: {
  mobileOpen?: boolean;
  onMobileOpenChange?: (open: boolean) => void;
} = {}) {
  const pathname = usePathname();
  const [rail, setRail] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({});
  const [manageOpen, setManageOpen] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setRail(true);
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, rail ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, [rail, hydrated]);

  useEffect(() => {
    for (const section of SECTIONS) {
      if (section.items.some((item) => pathActive(pathname, item.href))) {
        setSectionsCollapsed((c) => ({ ...c, [section.label]: false }));
      }
    }
    if (MANAGE_ITEMS.some((item) => pathActive(pathname, item.href))) {
      setManageOpen(true);
    }
    onMobileOpenChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      <aside
        data-rail={rail ? "true" : "false"}
        className={cn(
          "group/sidebar relative z-40 hidden h-full shrink-0 flex-col border-r border-slate-200/70 bg-gradient-to-b from-white via-emerald-50/40 to-white text-slate-700 transition-[width] duration-200 ease-out lg:flex",
          rail ? "w-[72px]" : "w-72",
        )}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.10),_transparent_60%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[radial-gradient(ellipse_at_bottom,_rgba(37,99,235,0.05),_transparent_70%)]"
        />

        <SidebarBody
          pathname={pathname}
          rail={rail}
          setRail={setRail}
          sectionsCollapsed={sectionsCollapsed}
          setSectionsCollapsed={setSectionsCollapsed}
          manageOpen={manageOpen}
          setManageOpen={setManageOpen}
          onNavigate={() => onMobileOpenChange?.(false)}
        />
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Close menu"
            onClick={() => onMobileOpenChange?.(false)}
          />
          <aside className="relative flex h-full w-[288px] flex-col border-r border-slate-200/70 bg-gradient-to-b from-white via-emerald-50/40 to-white shadow-xl">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.10),_transparent_60%)]"
            />
            <button
              type="button"
              className="absolute right-3 top-5 z-10 inline-flex size-8 items-center justify-center rounded-lg text-slate-500 hover:bg-white hover:text-slate-800"
              onClick={() => onMobileOpenChange?.(false)}
            >
              <X className="size-4" />
            </button>
            <SidebarBody
              pathname={pathname}
              rail={false}
              setRail={setRail}
              sectionsCollapsed={sectionsCollapsed}
              setSectionsCollapsed={setSectionsCollapsed}
              manageOpen={manageOpen}
              setManageOpen={setManageOpen}
              onNavigate={() => onMobileOpenChange?.(false)}
              hideCollapse
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}

function SidebarBody({
  pathname,
  rail,
  setRail,
  sectionsCollapsed,
  setSectionsCollapsed,
  manageOpen,
  setManageOpen,
  onNavigate,
  hideCollapse,
}: {
  pathname: string;
  rail: boolean;
  setRail: (v: boolean | ((p: boolean) => boolean)) => void;
  sectionsCollapsed: Record<string, boolean>;
  setSectionsCollapsed: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
  manageOpen: boolean;
  setManageOpen: (v: boolean | ((p: boolean) => boolean)) => void;
  onNavigate?: () => void;
  hideCollapse?: boolean;
}) {
  return (
    <>
      <div
        className={cn(
          "relative flex items-center justify-center pt-4 pb-3",
          rail ? "px-1.5" : "px-3",
        )}
      >
        <Link
          href="/dashboard"
          aria-label="Tristar Realtors"
          className={cn(
            "flex w-full items-center justify-center",
            rail ? "max-w-[40px]" : "max-w-[108px]",
          )}
        >
          <Logo fluid size={rail ? "xs" : "sm"} />
        </Link>
      </div>

      {!rail ? (
        <div className="relative mx-5 mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-50/80 px-2.5 py-1">
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
            CRM Edition
          </span>
        </div>
      ) : (
        <div aria-hidden className="relative mx-auto mb-3 h-px w-6 bg-slate-200" />
      )}

      <nav
        className={cn(
          "relative flex-1 overflow-y-auto pb-4 scrollbar-hide",
          rail ? "px-2" : "px-3",
        )}
      >
        {SECTIONS.map((section) => {
          const isCollapsed = sectionsCollapsed[section.label] ?? false;
          return (
            <div key={section.label} className={cn("mb-5", rail && "mb-3")}>
              {!rail ? (
                <button
                  type="button"
                  onClick={() =>
                    section.collapsible &&
                    setSectionsCollapsed((c) => ({
                      ...c,
                      [section.label]: !isCollapsed,
                    }))
                  }
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition-colors",
                    section.collapsible ? "hover:text-slate-900" : "cursor-default",
                  )}
                >
                  {section.label}
                  {section.collapsible ? (
                    <ChevronDown
                      className={cn(
                        "size-3 transition-transform duration-200",
                        isCollapsed && "-rotate-90",
                      )}
                    />
                  ) : null}
                </button>
              ) : (
                <div aria-hidden className="mx-auto mb-1 h-px w-6 bg-slate-200" />
              )}

              {!rail && isCollapsed ? null : (
                <ul className={cn("space-y-0.5", rail ? "mt-0" : "mt-1.5")}>
                  {section.items.map((item) => (
                    <NavItemRow
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      rail={rail}
                      onNavigate={onNavigate}
                    />
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </nav>

      <div
        className={cn(
          "relative mb-4 space-y-1 border-t border-slate-200/60 pt-3",
          rail ? "mx-2" : "mx-3",
        )}
      >
        {!rail ? (
          <button
            type="button"
            onClick={() => setManageOpen((v) => !v)}
            className="flex w-full items-center justify-between px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:text-slate-900"
          >
            Manage
            <ChevronDown
              className={cn(
                "size-3 transition-transform duration-200",
                !manageOpen && "-rotate-90",
              )}
            />
          </button>
        ) : (
          <div aria-hidden className="mx-auto mb-1 h-px w-6 bg-slate-200" />
        )}

        {(rail || manageOpen) && (
          <ul className="space-y-0.5">
            {MANAGE_ITEMS.map((item) => (
              <NavItemRow
                key={item.href}
                item={item}
                pathname={pathname}
                rail={rail}
                onNavigate={onNavigate}
              />
            ))}
          </ul>
        )}
      </div>

      {!hideCollapse ? (
        <button
          type="button"
          onClick={() => setRail((v) => !v)}
          aria-label={rail ? "Expand sidebar" : "Collapse sidebar"}
          title={rail ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 opacity-0 shadow-[0_4px_14px_rgba(15,23,42,0.10)] transition-all duration-150 hover:bg-emerald-500 hover:text-white group-hover/sidebar:opacity-100 focus-visible:opacity-100"
        >
          {rail ? (
            <ChevronsRight className="size-3.5" strokeWidth={2.25} />
          ) : (
            <ChevronsLeft className="size-3.5" strokeWidth={2.25} />
          )}
        </button>
      ) : null}
    </>
  );
}

function NavItemRow({
  item,
  pathname,
  rail,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  rail: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  const active = pathActive(pathname, item.href);

  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        title={rail ? item.label : undefined}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-colors",
          rail && "justify-center px-0",
          active
            ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/25"
            : "text-slate-600 hover:bg-white/90 hover:text-slate-900",
        )}
      >
        <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
        {!rail ? <span className="truncate">{item.label}</span> : null}
      </Link>
    </li>
  );
}

export function MobileNavTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open navigation"
      className="inline-flex size-10 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 lg:hidden"
    >
      <Menu className="size-5" strokeWidth={1.75} />
    </button>
  );
}
