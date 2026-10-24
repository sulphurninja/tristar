"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BdPage, BdTabs } from "@/components/bd";
import { CalendarTab } from "@/components/tasks/CalendarTab";
import { TasksTab } from "@/components/tasks/TasksTab";
import { SiteVisitTab } from "@/components/visits/SiteVisitTab";

type Tab = "tasks" | "site-visit" | "calendar";
const TABS: Array<{ key: Tab; label: string }> = [
  { key: "tasks", label: "Tasks" },
  { key: "site-visit", label: "Site Visit" },
  { key: "calendar", label: "Calendar" },
];

function TasksScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const raw = sp.get("tab");
  const tab: Tab = raw === "site-visit" || raw === "calendar" ? raw : "tasks";
  const openAdd = sp.get("new") === "1";

  const setTab = useCallback(
    (t: Tab) => {
      router.replace(t === "tasks" ? pathname : `${pathname}?tab=${t}`, { scroll: false });
    },
    [router, pathname],
  );
  const addClosed = useCallback(() => {
    if (sp.get("new") === "1") router.replace(tab === "tasks" ? pathname : `${pathname}?tab=${tab}`, { scroll: false });
  }, [router, pathname, sp, tab]);

  return (
    <div>
      <div className="border-b border-[#e6e9f2] bg-white pt-2">
        <BdTabs tabs={TABS} value={tab} onChange={setTab} />
      </div>
      <BdPage>
        {tab === "tasks" ? <TasksTab openAdd={openAdd} onAddClosed={addClosed} /> : null}
        {tab === "site-visit" ? <SiteVisitTab openAdd={openAdd} onAddClosed={addClosed} /> : null}
        {tab === "calendar" ? <CalendarTab /> : null}
      </BdPage>
    </div>
  );
}

export default function TasksPage() {
  return (
    <Suspense fallback={null}>
      <TasksScreen />
    </Suspense>
  );
}
