"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  Handshake,
  PieChart,
  Settings,
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  Upload,
  ClipboardList,
  Phone,
  MessageSquareText,
  FileBarChart2,
  Lock,
  ListChecks,
  KanbanSquare,
} from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badge?: string;
  disabled?: boolean;
}

interface NavSection {
  label: string;
  items: NavItem[];
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

const SECTIONS: NavSection[] = [
  {
    label: "Workspace",
    items: [{ label: "Home", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Lead Management",
    items: [
      { label: "Pipeline", href: "/leads/pipeline", icon: KanbanSquare },
      { label: "All Leads", href: "/leads", icon: ListChecks },
      { label: "Bulk Update", href: "/leads/bulk-update", icon: Upload },
      { label: "SVP Dashboard", href: "/visits/scheduled", icon: CalendarCheck },
      { label: "Personalised Reports", href: "/reports/personalised", icon: FileBarChart2 },
      {
        label: "Communication Analysis",
        href: "/communication-analysis",
        icon: MessageSquareText,
        disabled: true,
      },
      { label: "Outgoing Calls", href: "/outgoing-calls", icon: Phone, disabled: true },
    ],
    collapsible: true,
  },
  {
    label: "Inventory",
    items: [
      { label: "Projects", href: "/projects", icon: Building2 },
      { label: "Site Visits", href: "/visits", icon: CalendarCheck },
    ],
    collapsible: true,
  },
  {
    label: "Channel Partners",
    items: [{ label: "Brokers", href: "/brokers", icon: Handshake }],
    collapsible: true,
  },
  {
    label: "Operations",
    items: [
      { label: "Requests", href: "/requests", icon: ClipboardList },
      { label: "Reports", href: "/reports", icon: PieChart },
    ],
    collapsible: true,
  },
];

const STORAGE_KEY = "tristar.sidebar.rail";

export function Sidebar() {
  const pathname = usePathname();
  const [sectionsCollapsed, setSectionsCollapsed] = useState<Record<string, boolean>>({});
  const [rail, setRail] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "1") setRail(true);
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, rail ? "1" : "0");
    } catch {
      // ignore
    }
  }, [rail, hydrated]);

  const toggleSection = (label: string) =>
    setSectionsCollapsed((c) => ({ ...c, [label]: !c[label] }));

  return (
    <aside
      data-rail={rail ? "true" : "false"}
      className={cn(
        "group/sidebar relative hidden h-screen shrink-0 flex-col border-r border-slate-200/70 bg-gradient-to-b from-white via-emerald-50/40 to-white text-slate-700 transition-[width] duration-200 ease-out lg:flex",
        rail ? "w-[72px]" : "w-72",
      )}
    >
      {/* soft top tint */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(ellipse_at_top,_rgba(16,185,129,0.10),_transparent_60%)]"
      />
      {/* subtle bottom tint */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-[radial-gradient(ellipse_at_bottom,_rgba(37,99,235,0.05),_transparent_70%)]"
      />

      <div
        className={cn(
          "relative flex justify-center items-center pt-5 pb-4",
          rail ? "justify-center px-2" : "px-5",
        )}
      >
        <Link
          href="/dashboard"
          className="group flex justify-center items-center gap-2.5"
          aria-label="Tristar Realtors"
        >
          <Logo size={rail ? "sm" : "lg"} />
        </Link>
      </div>

      {!rail ? (
        <div className="relative mx-5 mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-300/60 bg-emerald-50/80 px-2.5 py-1">
          <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-emerald-800">
            CRM Edition
          </span>
        </div>
      ) : null}

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
                  onClick={() => section.collapsible && toggleSection(section.label)}
                  className={cn(
                    "flex w-full items-center justify-between px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition-colors",
                    section.collapsible
                      ? "hover:text-slate-900"
                      : "cursor-default",
                  )}
                >
                  {section.label}
                  {section.collapsible ? (
                    <ChevronDown
                      className={cn(
                        "size-3 transition-transform duration-200",
                        isCollapsed ? "-rotate-90" : "",
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
                      key={item.label}
                      item={item}
                      pathname={pathname}
                      rail={rail}
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
        <NavItemRow
          item={{ label: "Settings", href: "/settings", icon: Settings }}
          pathname={pathname}
          rail={rail}
        />
        <DisabledRow
          label="Cloud Telephony"
          icon={Phone}
          rail={rail}
          tooltip="Available in the Tristar+ edition"
        />
      </div>

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
    </aside>
  );
}

function NavItemRow({
  item,
  pathname,
  rail,
}: {
  item: NavItem;
  pathname: string;
  rail: boolean;
}) {
  const Icon = item.icon;
  const active =
    pathname === item.href ||
    (item.href !== "/" && pathname.startsWith(`${item.href}/`));

  if (item.disabled) {
    return (
      <li className="relative">
        <DisabledRow
          label={item.label}
          icon={Icon}
          rail={rail}
          tooltip="Available in the Tristar+ edition"
        />
      </li>
    );
  }

  return (
    <li className="relative">
      {active ? (
        <span
          className={cn(
            "absolute left-0 top-1/2 h-6 w-[3px] -translate-y-1/2 rounded-r-full bg-emerald-500",
            rail && "left-0",
          )}
        />
      ) : null}
      <Link
        href={item.href}
        title={rail ? item.label : undefined}
        className={cn(
          "group/item relative flex items-center rounded-lg text-[13.5px] font-medium transition-all duration-150",
          rail ? "h-10 justify-center px-0" : "gap-3 px-3 py-2",
          active
            ? "bg-emerald-100/70 text-emerald-900 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.18)]"
            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900",
        )}
      >
        <Icon
          className={cn(
            "size-[17px] shrink-0 transition-colors",
            active
              ? "text-emerald-700"
              : "text-slate-400 group-hover/item:text-slate-700",
          )}
          strokeWidth={active ? 2 : 1.75}
        />
        {!rail ? (
          <>
            <span className="flex-1 truncate">{item.label}</span>
            {item.badge ? (
              <span
                className={cn(
                  "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none",
                  "bg-emerald-100 text-emerald-700",
                )}
              >
                {item.badge}
              </span>
            ) : null}
          </>
        ) : item.badge ? (
          <span className="absolute right-1 top-1 size-1.5 rounded-full bg-emerald-500" />
        ) : null}
        {rail ? (
          <span
            role="tooltip"
            className="pointer-events-none absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11.5px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/item:opacity-100"
          >
            {item.label}
          </span>
        ) : null}
      </Link>
    </li>
  );
}

function DisabledRow({
  label,
  icon: Icon,
  rail,
  tooltip,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  rail: boolean;
  tooltip: string;
}) {
  return (
    <div
      title={tooltip}
      aria-disabled
      className={cn(
        "group/disabled relative flex items-center rounded-lg text-[13.5px] font-medium",
        rail ? "h-10 justify-center px-0" : "gap-3 px-3 py-2",
        "cursor-not-allowed text-slate-400",
      )}
    >
      <Icon className="size-[17px] shrink-0" strokeWidth={1.5} />
      {!rail ? (
        <>
          <span className="flex-1 truncate">{label}</span>
          <Lock className="size-3 text-slate-300" strokeWidth={2} />
        </>
      ) : null}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-30 whitespace-nowrap rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/disabled:opacity-100",
          rail ? "left-full top-1/2 ml-2 -translate-y-1/2" : "left-1/2 -top-7 -translate-x-1/2",
        )}
      >
        {tooltip}
      </span>
    </div>
  );
}
