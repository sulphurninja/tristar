"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronDown,
  ChevronRight,
  LogOut,
  Menu,
  Plus,
  Settings as SettingsIcon,
  ShieldCheck,
  Inbox,
  Target,
  ListChecks,
  CalendarCheck,
  BadgeCheck,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { initials, cn } from "@/lib/utils";
import { NAV_LINKS } from "@/components/layout/Sidebar";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import type { Permission } from "@/lib/permissions";

interface Notice {
  _id: string;
  title: string;
  scheduleAt?: string;
}

const CREATE: Array<{ label: string; href: string; icon: typeof Plus; perm: Permission }> = [
  { label: "Lead", href: "/leads?new=1", icon: Target, perm: "leads.create" },
  { label: "Task", href: "/tasks?new=1", icon: ListChecks, perm: "tasks.manage" },
  { label: "Site visit", href: "/tasks?tab=site-visit&new=1", icon: CalendarCheck, perm: "visits.manage" },
  { label: "Booking", href: "/bookings?new=1", icon: BadgeCheck, perm: "bookings.manage" },
];

const menu =
  "z-50 min-w-60 overflow-hidden rounded-xl border border-border bg-white p-1.5 shadow-[var(--shadow-lg)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95";
const menuItem =
  "flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] text-foreground outline-none data-[highlighted]:bg-muted";

/** Page title + parent group for the current route. */
function useCrumbs() {
  const pathname = usePathname();
  return useMemo(() => {
    let best: (typeof NAV_LINKS)[number] | null = null;
    for (const l of NAV_LINKS) {
      if ((pathname === l.href || pathname.startsWith(`${l.href}/`)) && (!best || l.href.length > best.href.length)) {
        best = l;
      }
    }
    return best;
  }, [pathname]);
}

export function Topbar({ onToggleNav, onSearch }: { onToggleNav: () => void; onSearch: () => void }) {
  const { user, signOut, can, isOwner } = useAuth();
  const [due, setDue] = useState<Notice[]>([]);
  const [requests, setRequests] = useState(0);
  const crumb = useCrumbs();

  useEffect(() => {
    if (!user) return;
    if (can("tasks.view")) {
      fetch("/api/tasks?range=today&status=pending&limit=8", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : { tasks: [] }))
        .then((d) => setDue(d.tasks ?? []))
        .catch(() => undefined);
    }
    fetch("/api/requests", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { requests: [] }))
      .then((d) =>
        setRequests(((d.requests ?? []) as Array<{ status?: string }>).filter((x) => x.status === "pending").length),
      )
      .catch(() => undefined);
  }, [user, can]);

  const creatable = CREATE.filter((c) => can(c.perm));
  const unread = due.length + requests;

  return (
    <header className="z-30 flex h-14 shrink-0 items-center gap-3 border-b border-border bg-white/85 px-4 backdrop-blur-md sm:px-6">
      <button
        type="button"
        onClick={onToggleNav}
        aria-label="Toggle navigation"
        className="inline-flex size-8 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Menu className="size-[18px]" />
      </button>

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        {crumb?.group ? (
          <>
            <span className="hidden truncate text-muted-foreground sm:inline">{crumb.group}</span>
            <ChevronRight className="hidden size-3.5 shrink-0 text-muted-foreground/60 sm:inline" />
          </>
        ) : null}
        <span className="truncate font-medium text-foreground">{crumb?.label ?? "Workspace"}</span>
      </nav>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onSearch}
          className="hidden h-8 items-center gap-2 rounded-[8px] border border-border bg-white px-2.5 text-[12.5px] text-muted-foreground shadow-[var(--shadow-xs)] transition-colors hover:border-input hover:text-foreground md:inline-flex"
        >
          Jump to…
          <kbd className="rounded border border-border bg-muted px-1 py-px font-sans text-[10.5px]">Ctrl K</kbd>
        </button>

        {creatable.length ? (
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="bd-btn !h-8 !px-3">
                <Plus className="size-4" strokeWidth={2.25} />
                <span className="hidden sm:inline">New</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={8} className={cn(menu, "min-w-48")}>
                <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground">
                  Create
                </p>
                {creatable.map((c) => (
                  <DropdownMenu.Item key={c.href} asChild>
                    <Link href={c.href} className={menuItem}>
                      <c.icon className="size-4 text-muted-foreground" /> {c.label}
                    </Link>
                  </DropdownMenu.Item>
                ))}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        ) : null}

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              aria-label="Notifications"
              className="relative inline-flex size-8 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Bell className="size-[18px]" />
              {unread > 0 ? (
                <span className="absolute right-1 top-1 flex size-2 rounded-full bg-primary ring-2 ring-white" />
              ) : null}
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className={cn(menu, "w-80 p-0")}>
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <p className="text-[13.5px] font-semibold">Notifications</p>
                {unread > 0 ? (
                  <span className="rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                    {unread} new
                  </span>
                ) : null}
              </div>
              <div className="max-h-[360px] overflow-y-auto p-1.5">
                {requests > 0 ? (
                  <DropdownMenu.Item asChild>
                    <Link href="/requests" className={cn(menuItem, "items-start")}>
                      <Inbox className="mt-0.5 size-4 text-primary" />
                      <span>
                        <span className="block font-medium">
                          {requests} pending request{requests === 1 ? "" : "s"}
                        </span>
                        <span className="text-[12px] text-muted-foreground">Review approvals from your team</span>
                      </span>
                    </Link>
                  </DropdownMenu.Item>
                ) : null}
                {due.map((t) => (
                  <DropdownMenu.Item key={t._id} asChild>
                    <Link href="/tasks" className={cn(menuItem, "items-start")}>
                      <ListChecks className="mt-0.5 size-4 text-muted-foreground" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{t.title}</span>
                        {t.scheduleAt ? (
                          <span className="text-[12px] text-muted-foreground">
                            Due {new Date(t.scheduleAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </DropdownMenu.Item>
                ))}
                {unread === 0 ? (
                  <div className="px-4 py-8 text-center">
                    <p className="text-[13px] font-medium">You&apos;re all caught up</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">Tasks due today will show up here.</p>
                  </div>
                ) : null}
              </div>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>

        <div className="mx-1 h-6 w-px bg-border" />

        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <button
              className="flex items-center gap-2 rounded-[9px] py-1 pl-1 pr-1.5 transition-colors hover:bg-muted"
              aria-label="Account menu"
            >
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt="" className="size-7 rounded-full object-cover" />
              ) : (
                <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-b from-primary-100 to-primary-50 text-[11px] font-semibold text-primary-700 ring-1 ring-primary/15">
                  {initials(user?.name)}
                </span>
              )}
              <span className="hidden max-w-[140px] text-left leading-tight lg:block">
                <span className="block truncate text-[13px] font-medium">{user?.name ?? "Account"}</span>
                <span className="block truncate text-[11px] text-muted-foreground">
                  {ROLE_LABELS[user?.role as Role] ?? user?.role}
                </span>
              </span>
              <ChevronDown className="hidden size-3.5 text-muted-foreground lg:block" />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="end" sideOffset={8} className={menu}>
              <div className="px-2.5 pb-2.5 pt-1.5">
                <p className="truncate text-[13px] font-semibold">{user?.name}</p>
                <p className="truncate text-[12px] text-muted-foreground">{user?.email}</p>
                <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                  <ShieldCheck className="size-3" />
                  {ROLE_LABELS[user?.role as Role] ?? user?.role}
                </span>
              </div>
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item asChild>
                <Link href="/settings" className={menuItem}>
                  <SettingsIcon className="size-4 text-muted-foreground" /> Settings
                </Link>
              </DropdownMenu.Item>
              {isOwner ? (
                <DropdownMenu.Item asChild>
                  <Link href="/settings/roles" className={menuItem}>
                    <ShieldCheck className="size-4 text-muted-foreground" /> Roles & permissions
                  </Link>
                </DropdownMenu.Item>
              ) : null}
              <DropdownMenu.Separator className="my-1 h-px bg-border" />
              <DropdownMenu.Item
                onSelect={() => signOut()}
                className={cn(menuItem, "text-destructive data-[highlighted]:bg-destructive/10")}
              >
                <LogOut className="size-4" /> Sign out
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      </div>
    </header>
  );
}
