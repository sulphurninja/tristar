"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, ChevronDown, LogOut, Megaphone, Settings as SettingsIcon } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { initials } from "@/lib/utils";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { MobileNavTrigger } from "@/components/layout/Sidebar";

interface Notice {
  _id: string;
  title: string;
  scheduleAt?: string;
}

export function Topbar({ onToggleNav }: { onToggleNav: () => void }) {
  const { user, workspace, signOut } = useAuth();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [due, setDue] = useState<Notice[]>([]);
  const [requests, setRequests] = useState(0);

  useEffect(() => {
    fetch("/api/tasks?range=today&status=pending&limit=8", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setDue(d.tasks ?? []))
      .catch(() => undefined);
    fetch("/api/requests", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) =>
        setRequests(((d.requests ?? []) as Array<{ status?: string }>).filter((x) => x.status === "pending").length),
      )
      .catch(() => undefined);
  }, []);

  const menu =
    "z-50 min-w-64 overflow-hidden rounded-md bg-white p-1 shadow-[0_10px_30px_-10px_rgba(15,23,42,0.25)] ring-1 ring-slate-900/5";

  return (
    <>
      <header className="z-30 flex h-[52px] shrink-0 items-center gap-3 border-b border-[#e3e6ef] bg-[#f8f9fd] px-4">
        <MobileNavTrigger onClick={onToggleNav} />

        <div className="ml-auto flex items-center gap-5">
          <span className="hidden text-[16px] font-bold uppercase tracking-tight text-[#2b2f3a] sm:inline">
            {workspace?.name ?? "Tristar Realtors"}
          </span>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button aria-label="Announcements" className="relative text-[#5a6072] hover:text-[#3a5dc2]">
                <Megaphone className="size-6" strokeWidth={1.75} />
                {requests > 0 ? (
                  <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-[#3a5dc2]" />
                ) : null}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={10} className={menu}>
                <p className="border-b border-slate-100 px-3 py-2 text-[13px] font-bold">Announcements</p>
                <Link href="/requests" className="block px-3 py-2.5 text-[13px] hover:bg-slate-50">
                  {requests > 0
                    ? `${requests} pending request${requests === 1 ? "" : "s"}`
                    : "No new announcements"}
                </Link>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button aria-label="Notifications" className="relative text-[#5a6072] hover:text-[#3a5dc2]">
                <Bell className="size-6 fill-current" strokeWidth={1.5} />
                {due.length > 0 ? (
                  <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-[#3a5dc2]" />
                ) : null}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={10} className={menu}>
                <p className="border-b border-slate-100 px-3 py-2 text-[13px] font-bold">Notifications</p>
                {due.length === 0 ? (
                  <p className="px-3 py-3 text-[13px] text-slate-500">You are all caught up.</p>
                ) : (
                  due.map((t) => (
                    <Link
                      key={t._id}
                      href="/tasks"
                      className="block border-b border-slate-50 px-3 py-2 text-[13px] hover:bg-slate-50"
                    >
                      <span className="block truncate font-medium">{t.title}</span>
                      {t.scheduleAt ? (
                        <span className="text-[11.5px] text-slate-500">
                          {new Date(t.scheduleAt).toLocaleString()}
                        </span>
                      ) : null}
                    </Link>
                  ))
                )}
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>

          <div className="h-[52px] w-px bg-[#e3e6ef]" />

          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center gap-2" aria-label="Account menu">
                {user?.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.avatarUrl} alt="" className="size-10 rounded-full object-cover" />
                ) : (
                  <span className="flex size-10 items-center justify-center rounded-full bg-[#e3e6ef] text-[13px] font-bold text-[#5a6072]">
                    {initials(user?.name)}
                  </span>
                )}
                <span className="hidden max-w-[140px] truncate text-[16px] text-[#5a6072] sm:inline">
                  {user?.name?.split(" ")[0] ?? "Account"}
                </span>
                <span className="flex size-[18px] items-center justify-center rounded-full bg-[#2fbf9b] text-white">
                  <ChevronDown className="size-3" strokeWidth={3} />
                </span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content align="end" sideOffset={10} className={menu}>
                <div className="border-b border-slate-100 p-3">
                  <p className="text-[13px] font-semibold text-slate-900">{user?.name}</p>
                  <p className="text-[11.5px] text-slate-500">{user?.email}</p>
                </div>
                <DropdownMenu.Item asChild>
                  <Link
                    href="/settings"
                    className="flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-[13px] outline-none hover:bg-slate-50"
                  >
                    <SettingsIcon className="size-[15px] text-slate-500" /> Settings
                  </Link>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  onSelect={() => setPaletteOpen(true)}
                  className="flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-[13px] outline-none hover:bg-slate-50"
                >
                  Search (Ctrl K)
                </DropdownMenu.Item>
                <DropdownMenu.Separator className="my-1 h-px bg-slate-100" />
                <DropdownMenu.Item
                  onSelect={() => signOut()}
                  className="flex cursor-pointer items-center gap-2.5 rounded px-2.5 py-2 text-[13px] text-red-600 outline-none hover:bg-red-50"
                >
                  <LogOut className="size-[15px]" /> Sign out
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
