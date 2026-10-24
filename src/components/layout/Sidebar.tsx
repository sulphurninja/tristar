"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  Rows3,
  User,
  Briefcase,
  CheckCheck,
  Send,
  FolderOpen,
  Folder,
  Settings,
  Menu,
  ChevronRight,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface NavChild {
  label: string;
  href: string;
}

export interface NavItem {
  label: string;
  href?: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  children?: NavChild[];
}

/** Wording and order mirror the Buildesk rail. */
export const NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: Gauge },
  { label: "Tasks", href: "/tasks", icon: Rows3 },
  {
    label: "CRM",
    icon: User,
    children: [
      { label: "Contacts", href: "/crm/contacts" },
      { label: "Leads", href: "/leads" },
      { label: "Activities", href: "/crm/activities" },
      { label: "Logs", href: "/crm/logs" },
      { label: "Property", href: "/crm/property" },
      { label: "Projects", href: "/projects" },
      { label: "Reception", href: "/crm/reception" },
    ],
  },
  {
    label: "CP",
    icon: Briefcase,
    children: [
      { label: "Channel Partners", href: "/brokers" },
      { label: "Channel Partner Company", href: "/brokers/companies" },
    ],
  },
  {
    label: "Bookings",
    icon: CheckCheck,
    children: [
      { label: "Bookings", href: "/bookings" },
      { label: "Payments", href: "/bookings/payments" },
    ],
  },
  {
    label: "Campaign",
    icon: Send,
    children: [{ label: "Campaigns", href: "/campaigns" }],
  },
  {
    label: "Accounts",
    icon: FolderOpen,
    children: [
      { label: "Ledger", href: "/accounts/ledger" },
      { label: "Vouchers", href: "/accounts/vouchers" },
    ],
  },
  {
    label: "Report",
    icon: Folder,
    children: [
      { label: "Lead Analysis", href: "/reports/lead-analysis" },
      { label: "Reports", href: "/reports" },
      { label: "Advance Analysis", href: "/reports/advance-analysis" },
      { label: "Lead Volume", href: "/reports/lead-volume" },
      { label: "Team Performance", href: "/reports/team-performance" },
      { label: "Activity Report", href: "/reports/activity" },
      { label: "Backlog", href: "/reports/backlog" },
      { label: "Sources", href: "/reports/sources" },
      { label: "Projects", href: "/reports/projects" },
      { label: "Channel Partner", href: "/reports/channel-partner" },
      { label: "Site Visit by Source", href: "/reports/svc-source" },
      { label: "Site Visit by User", href: "/reports/svc-user" },
    ],
  },
  {
    label: "MANAGE",
    icon: Settings,
    children: [
      { label: "Settings", href: "/settings" },
      { label: "Users", href: "/settings/users" },
      { label: "Teams", href: "/settings/teams" },
      { label: "Pipelines", href: "/settings/pipelines" },
      { label: "Sources", href: "/settings/sources" },
      { label: "Projects", href: "/settings/projects" },
      { label: "API Keys", href: "/settings/api-keys" },
      { label: "Compliance", href: "/settings/compliance" },
      { label: "Requests", href: "/requests" },
    ],
  },
];

/** Longest-prefix match so /leads/pipeline lights "Leads" only when nothing deeper matches. */
function activeChildHref(pathname: string, children: NavChild[]) {
  let best: string | null = null;
  for (const c of children) {
    const hit = pathname === c.href || pathname.startsWith(`${c.href}/`);
    if (hit && (!best || c.href.length > best.length)) best = c.href;
  }
  return best;
}

function itemActive(pathname: string, item: NavItem) {
  if (item.href) return pathname === item.href || pathname.startsWith(`${item.href}/`);
  return !!item.children && activeChildHref(pathname, item.children) !== null;
}

export function Sidebar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const pathname = usePathname();
  const [flyout, setFlyout] = useState<string | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setFlyout(null);
    if (typeof window !== "undefined" && window.innerWidth < 1024) onOpenChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function cancelClose() {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }
  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => setFlyout(null), 180);
  }

  const flyoutItem = NAV.find((n) => n.label === flyout && n.children);

  return (
    <>
      {open ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-slate-900/30 lg:hidden"
          onClick={() => onOpenChange(false)}
        />
      ) : null}

      <aside
        onMouseLeave={scheduleClose}
        onMouseEnter={cancelClose}
        className={cn(
          "fixed bottom-0 left-0 top-0 z-40 flex w-[88px] flex-col border-r border-[#e3e6ef] bg-white shadow-[2px_0_8px_rgba(30,50,110,0.06)] transition-transform duration-200 lg:static lg:z-20",
          open ? "translate-x-0" : "-translate-x-full lg:hidden",
        )}
      >
        <Link
          href="/dashboard"
          aria-label="Tristar Realtors"
          className="flex h-[52px] shrink-0 items-center justify-center bg-[#3a5dc2] shadow-[0_2px_6px_rgba(20,40,110,0.35)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/tristar-logo.png"
            alt="Tristar Realtors"
            className="h-9 w-auto max-w-[72px] rounded-sm bg-white object-contain px-1 py-0.5"
          />
        </Link>

        <nav className="flex-1 overflow-y-auto scrollbar-hide">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = itemActive(pathname, item);
            const hasChildren = !!item.children;
            const isFlyoutOpen = flyout === item.label;
            const cls = cn(
              "relative flex h-[68px] w-full flex-col items-center justify-center gap-1 border-b border-[#eceef5] text-[13px] transition-colors",
              active
                ? "bg-[#3a5dc2] text-white"
                : isFlyoutOpen
                  ? "bg-[#cfd2da] text-white"
                  : "text-[#2b2f3a] hover:bg-[#f1f3f9]",
            );
            const inner = (
              <>
                {hasChildren ? (
                  <span aria-hidden className="absolute right-2 top-1.5 flex flex-col gap-[2px] opacity-40">
                    <i className="block h-px w-3 bg-current" />
                    <i className="block h-px w-3 bg-current" />
                    <i className="block h-px w-3 bg-current" />
                  </span>
                ) : null}
                <Icon className="size-[22px]" strokeWidth={2} />
                <span>{item.label}</span>
              </>
            );
            return hasChildren ? (
              <button
                key={item.label}
                type="button"
                className={cls}
                onMouseEnter={() => {
                  cancelClose();
                  setFlyout(item.label);
                }}
                onClick={() => setFlyout(isFlyoutOpen ? null : item.label)}
              >
                {inner}
              </button>
            ) : (
              <Link
                key={item.label}
                href={item.href!}
                className={cls}
                onMouseEnter={() => setFlyout(null)}
                onClick={() => {
                  if (window.innerWidth < 1024) onOpenChange(false);
                }}
              >
                {inner}
              </Link>
            );
          })}
        </nav>
      </aside>

      {open && flyoutItem?.children ? (
        <div
          onMouseEnter={cancelClose}
          onMouseLeave={scheduleClose}
          className="fixed bottom-0 left-[88px] top-[52px] z-50 w-[220px] overflow-y-auto bg-[#f9f9f9] py-2 shadow-[4px_0_14px_rgba(30,50,110,0.12)]"
        >
          {flyoutItem.children.map((c) => {
            const on = activeChildHref(pathname, flyoutItem.children!) === c.href;
            return (
              <Link
                key={c.href}
                href={c.href}
                className={cn(
                  "flex h-[52px] items-center gap-2.5 px-5 text-[16px] transition-colors",
                  on ? "bg-[#3a5dc2] text-white" : "text-[#3a5dc2] hover:bg-[#eef1fa]",
                )}
              >
                <ChevronRight className="size-3.5 shrink-0" strokeWidth={2.5} />
                <span className="leading-tight">{c.label}</span>
              </Link>
            );
          })}
        </div>
      ) : null}
    </>
  );
}

export function MobileNavTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Toggle navigation"
      className="inline-flex size-10 items-center justify-center rounded-full border border-[#e3e6ef] bg-[#f4f6fb] text-[#4a4f5c] transition-colors hover:bg-[#e9edf8]"
    >
      <Menu className="size-5" strokeWidth={1.75} />
    </button>
  );
}
