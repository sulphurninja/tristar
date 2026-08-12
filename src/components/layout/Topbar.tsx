"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Plus,
  Search,
  ChevronDown,
  LogOut,
  Settings as SettingsIcon,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { initials, cn } from "@/lib/utils";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { MobileNavTrigger } from "@/components/layout/Sidebar";

const PATH_LABELS: Record<string, string> = {
  "/dashboard": "Home",
  "/tasks": "Tasks",
  "/leads": "Leads",
  "/leads/pipeline": "Pipeline",
  "/leads/bulk-update": "Bulk Update",
  "/crm/contacts": "Contacts",
  "/crm/activities": "Activities",
  "/crm/logs": "Lead Logs",
  "/crm/property": "Property",
  "/visits": "Site Visits",
  "/visits/scheduled": "SVP Dashboard",
  "/projects": "Projects",
  "/brokers": "Channel Partners",
  "/bookings": "Bookings",
  "/bookings/payments": "Payments",
  "/campaigns": "Campaigns",
  "/accounts/ledger": "Ledger",
  "/accounts/vouchers": "Vouchers",
  "/reports": "Reports",
  "/reports/advance-analysis": "Advance Analysis",
  "/reports/lead-volume": "Lead Volume",
  "/reports/team-performance": "Team Performance",
  "/reports/activity": "Activity Report",
  "/requests": "Requests",
  "/settings": "Settings",
  "/settings/users": "Users",
  "/settings/pipelines": "Pipelines & Stages",
  "/settings/sources": "Sources",
  "/settings/api-keys": "API Keys",
};

export function Topbar({ onMobileNav }: { onMobileNav?: () => void }) {
  const pathname = usePathname();
  const { user, workspace, signOut } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const title =
    PATH_LABELS[pathname] ??
    Object.entries(PATH_LABELS)
      .filter(([k]) => pathname.startsWith(`${k}/`))
      .sort((a, b) => b[0].length - a[0].length)[0]?.[1] ??
    "Tristar";

  return (
    <>
      <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200/70 bg-white px-4 lg:px-6">
        {onMobileNav ? <MobileNavTrigger onClick={onMobileNav} /> : null}

        <h1 className="min-w-0 shrink truncate text-[15px] font-semibold tracking-tight text-slate-900">
          {title}
        </h1>

        <div className="ml-auto flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-2.5">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            aria-label="Search"
            className={cn(
              "group flex h-9 min-w-0 items-center gap-2.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-left transition-all",
              "hover:border-emerald-300 hover:bg-white hover:shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/20",
              "w-full max-w-[14rem] sm:max-w-[18rem] md:max-w-[22rem] lg:max-w-[26rem]",
            )}
          >
            <Search
              className="size-4 shrink-0 text-slate-400 transition-colors group-hover:text-emerald-600"
              strokeWidth={1.75}
            />
            <span className="min-w-0 flex-1 truncate text-[13px] text-slate-400 group-hover:text-slate-500">
              Search leads, pages, actions…
            </span>
            <kbd className="hidden shrink-0 items-center gap-0.5 rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 sm:inline-flex">
              ⌘K
            </kbd>
          </button>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <Button size="sm" className="h-9 shrink-0 gap-1 rounded-lg px-3">
                <Plus className="size-4" strokeWidth={2} />
                <span className="hidden sm:inline">New</span>
                <ChevronDown className="size-3.5 opacity-70" />
              </Button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-50 min-w-52 overflow-hidden rounded-lg bg-white p-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 animate-in fade-in-0 zoom-in-95"
              >
                <NewItem href="/leads?new=1" label="New lead" />
                <NewItem href="/tasks?new=1" label="New task" />
                <NewItem href="/visits?new=1" label="Schedule site visit" />
                <NewItem href="/bookings?new=1" label="Add booking" />
                <NewItem href="/projects?new=1" label="Add project" />
                <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                <NewItem href="/leads/bulk-update" label="Bulk update leads" />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button
                className="flex shrink-0 items-center gap-2 rounded-lg p-1 transition-colors hover:bg-slate-100"
                aria-label="Account menu"
              >
                <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-[11px] font-bold text-white">
                  {initials(user?.name)}
                </div>
                <span className="hidden max-w-[120px] truncate text-[12.5px] font-medium text-slate-800 lg:inline">
                  {user?.name?.split(" ")[0] ?? "Account"}
                </span>
                <ChevronDown className="hidden size-3.5 text-slate-400 sm:block" strokeWidth={2} />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                align="end"
                sideOffset={8}
                className="z-50 min-w-60 overflow-hidden rounded-lg bg-white p-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 animate-in fade-in-0 zoom-in-95"
              >
                <div className="border-b border-slate-100 p-3">
                  <p className="text-[13px] font-semibold text-slate-900">{user?.name}</p>
                  <p className="text-[11.5px] text-slate-500">{user?.email}</p>
                  {workspace?.name ? (
                    <p className="mt-1 text-[11px] font-medium text-emerald-700">
                      {workspace.name}
                      {workspace.plan === "trial" ? " · Trial" : ""}
                    </p>
                  ) : null}
                </div>
                <DropdownMenu.Item asChild>
                  <Link
                    href="/settings"
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] outline-none hover:bg-slate-50"
                  >
                    <SettingsIcon className="size-[15px] text-slate-500" strokeWidth={1.75} />{" "}
                    Settings
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                <DropdownMenu.Item
                  onSelect={() => signOut()}
                  className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-red-600 outline-none hover:bg-red-50"
                >
                  <LogOut className="size-[15px]" strokeWidth={1.75} /> Sign out
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}

function NewItem({ href, label }: { href: string; label: string }) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] outline-none hover:bg-slate-50",
        )}
      >
        {label}
      </Link>
    </DropdownMenu.Item>
  );
}
