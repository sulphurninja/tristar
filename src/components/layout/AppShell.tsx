"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { QuickActivityTab } from "@/components/layout/QuickActivityTab";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(true);

  useEffect(() => {
    document.body.classList.add("bd-app");
    if (window.innerWidth < 1024) setNavOpen(false);
    return () => document.body.classList.remove("bd-app");
  }, []);

  return (
    <div className="flex h-svh w-full overflow-hidden bg-[#f4f6fb]">
      <Sidebar open={navOpen} onOpenChange={setNavOpen} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar onToggleNav={() => setNavOpen((v) => !v)} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">{children}</main>
      </div>
      <QuickActivityTab />
    </div>
  );
}
