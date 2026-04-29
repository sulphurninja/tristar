"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Plus,
  Search,
  ChevronDown,
  LogOut,
  User as UserIcon,
  Settings as SettingsIcon,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { initials, cn } from "@/lib/utils";
import { CommandPalette } from "@/components/layout/CommandPalette";

const PATH_LABELS: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Home", subtitle: "Today's view of your sales operation." },
  "/leads": { title: "All Leads", subtitle: "Every prospect in the system." },
  "/leads/pipeline": {
    title: "Pipeline",
    subtitle: "Move leads across stages — drag a card to update its stage.",
  },
  "/leads/bulk-update": { title: "Bulk Update", subtitle: "Update many leads at once via CSV." },
  "/visits": { title: "Site Visits", subtitle: "Schedule, confirm and run every visit." },
  "/visits/scheduled": {
    title: "SVP Dashboard",
    subtitle: "Scheduled Visit Planned report — visits planned for the day.",
  },
  "/projects": { title: "Projects", subtitle: "Master inventory across every Tristar tower." },
  "/brokers": { title: "Channel Partners", subtitle: "Brokers, RERA, RM mapping." },
  "/reports": { title: "Reports", subtitle: "Live operational reports across the team." },
  "/requests": { title: "Requests", subtitle: "Approvals raised by your team." },
  "/settings": { title: "Settings", subtitle: "Workspace, team, projects and integrations." },
  "/settings/users": { title: "Users", subtitle: "Invite, edit and manage team members." },
  "/settings/pipelines": {
    title: "Pipelines & Stages",
    subtitle: "Define workflows and the stages leads move through.",
  },
  "/settings/projects": { title: "Manage Projects", subtitle: "All Tristar projects." },
  "/settings/sources": { title: "Manage Sources", subtitle: "Lead source taxonomy." },
  "/settings/brokers": { title: "Manage Brokers", subtitle: "Channel partner directory." },
  "/settings/api-keys": { title: "API Keys", subtitle: "Project-scoped programmatic access." },
};

export function Topbar() {
  const pathname = usePathname();
  const { user, workspace, signOut } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const meta =
    PATH_LABELS[pathname] ??
    PATH_LABELS[`/${pathname.split("/").filter(Boolean)[0]}`] ?? {
      title: "Tristar Realtors",
      subtitle: "",
    };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[72px] items-center gap-4 border-b border-slate-200/70 bg-white px-7 lg:px-10">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2.5">
            <h1 className="truncate text-[17px] font-semibold tracking-tight text-slate-900">
              {meta.title}
            </h1>
            {workspace?.plan === "trial" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                <span className="size-1.5 rounded-full bg-amber-500" /> Trial
              </span>
            ) : null}
          </div>
          {meta.subtitle ? (
            <p className="mt-0.5 hidden text-[12.5px] text-slate-500 sm:block">{meta.subtitle}</p>
          ) : null}
        </div>

        <div className="ml-auto hidden max-w-md flex-1 lg:flex">
          <button
            type="button"
            onClick={() => setPaletteOpen(true)}
            className="group flex h-10 w-full items-center gap-2.5 rounded-lg bg-slate-50 px-3.5 text-[13.5px] text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-700"
          >
            <Search
              className="size-4 text-slate-400 transition-colors group-hover:text-slate-600"
              strokeWidth={1.75}
            />
            <span>Search by name, enquiry no., email or phone…</span>
            <kbd className="ml-auto hidden items-center gap-1 rounded-md bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.08)] sm:inline-flex">
              ⌘K
            </kbd>
          </button>
        </div>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="default" size="sm" className="h-10 gap-1.5 rounded-lg px-3.5">
              <Plus className="size-4" strokeWidth={2} />
              <span className="hidden sm:inline">New</span>
              <ChevronDown className="size-3.5 opacity-70" />
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-56 overflow-hidden rounded-lg bg-white p-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 animate-in fade-in-0 zoom-in-95"
            >
              <NewItem href="/leads?new=1" label="New lead" hint="L" />
              <NewItem href="/visits?new=1" label="Schedule site visit" hint="V" />
              <NewItem href="/projects?new=1" label="Add project" hint="P" />
              <NewItem href="/brokers?new=1" label="Add broker" hint="B" />
              <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
              <NewItem href="/leads/bulk-update" label="Bulk update leads" hint="U" />
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex size-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <Bell className="size-[18px]" strokeWidth={1.75} />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-emerald-500 ring-2 ring-white" />
        </button>

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-slate-100"
              aria-label="Account menu"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-[12px] font-bold text-white">
                {initials(user?.name)}
              </div>
              <div className="hidden text-left lg:block">
                <p className="text-[12.5px] font-semibold leading-tight text-slate-900">
                  {user?.name ?? "—"}
                </p>
                <p className="text-[11px] text-slate-500">{workspace?.name ?? ""}</p>
              </div>
              <ChevronDown className="size-3.5 text-slate-400" strokeWidth={2} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              sideOffset={8}
              className="z-50 min-w-64 overflow-hidden rounded-lg bg-white p-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5 animate-in fade-in-0 zoom-in-95"
            >
              <div className="border-b border-slate-100 p-3">
                <p className="text-[13px] font-semibold text-slate-900">{user?.name}</p>
                <p className="text-[11.5px] text-slate-500">{user?.email}</p>
              </div>
              <DropdownMenu.Item className="flex cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] outline-none hover:bg-slate-50">
                <UserIcon className="size-[15px] text-slate-500" strokeWidth={1.75} /> Profile
              </DropdownMenu.Item>
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
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}

function NewItem({ href, label, hint }: { href: string; label: string; hint?: string }) {
  return (
    <DropdownMenu.Item asChild>
      <Link
        href={href}
        className={cn(
          "flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-[13px] outline-none hover:bg-slate-50",
        )}
      >
        <span className="flex-1">{label}</span>
        {hint ? (
          <kbd className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
            {hint}
          </kbd>
        ) : null}
      </Link>
    </DropdownMenu.Item>
  );
}
