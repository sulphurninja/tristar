"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Users, CalendarCheck, Flame, Clock, ArchiveX, TrendingUp } from "lucide-react";
import { BdPage, BdCard, BdKpi } from "@/components/bd";
import { formatNumber } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface Summary {
  myLeads: number;
  myHotLeads: number;
  myTodayFollowUps: number;
  myInactiveLeads: number;
  myBookedLeads: number;
  myUpcomingVisits: number;
}

const TILES: Array<{
  key: keyof Summary;
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "violet" | "blue" | "red" | "yellow" | "green" | "cyan";
}> = [
  { key: "myLeads", label: "My Leads", href: "/leads", icon: Users, tone: "violet" },
  { key: "myHotLeads", label: "My Hot Leads", href: "/leads?stage=hot", icon: Flame, tone: "red" },
  { key: "myTodayFollowUps", label: "My Today's Follow-ups", href: "/tasks", icon: Clock, tone: "yellow" },
  { key: "myUpcomingVisits", label: "My Upcoming Visits", href: "/visits/scheduled", icon: CalendarCheck, tone: "cyan" },
  { key: "myBookedLeads", label: "My Booked Leads", href: "/leads?stage=booked", icon: TrendingUp, tone: "green" },
  { key: "myInactiveLeads", label: "My Inactive Leads", href: "/reports/inactive-leads", icon: ArchiveX, tone: "blue" },
];

export default function PersonalisedReportPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetch("/api/reports/personalised", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSummary(d.summary ?? null))
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  return (
    <BdPage>
      <div>
        <Link href="/reports" className="text-[12px] text-[#3a5dc2] hover:underline">
          Report
        </Link>
        <h1 className="text-[20px] font-semibold text-[#2b2f3a]">Personalised Report</h1>
        <p className="mt-0.5 text-[12.5px] text-[#8b90a0]">Numbers for the leads assigned to {user?.name ?? "you"}.</p>
      </div>
      <BdCard>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {TILES.map((t) => (
            <Link key={t.key} href={t.href} className="block">
              <BdKpi
                label={t.label}
                icon={t.icon}
                tone={t.tone}
                value={loading ? "-" : formatNumber(summary?.[t.key] ?? 0)}
              />
            </Link>
          ))}
        </div>
      </BdCard>
    </BdPage>
  );
}
