"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Users,
  CalendarCheck,
  Flame,
  Clock,
  ArchiveX,
  TrendingUp,
} from "lucide-react";
import { ReportShell, type ReportRange } from "@/components/reports/ReportShell";
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

export default function PersonalisedReportPage() {
  const [range, setRange] = useState<ReportRange>("30d");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    setLoading(true);
    fetch(`/api/reports/personalised?range=${range}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSummary(d.summary ?? null))
      .finally(() => setLoading(false));
  }, [range]);

  return (
    <ReportShell
      title="Personalised Report"
      description={`Reports filtered to leads assigned to ${user?.name ?? "you"}.`}
      range={range}
      onRangeChange={setRange}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <Tile
          icon={Users}
          label="My Leads"
          value={summary?.myLeads ?? 0}
          href="/leads"
          loading={loading}
        />
        <Tile
          icon={Flame}
          label="My Hot Leads"
          value={summary?.myHotLeads ?? 0}
          href="/leads?stage=hot"
          loading={loading}
        />
        <Tile
          icon={Clock}
          label="My Today's Follow-ups"
          value={summary?.myTodayFollowUps ?? 0}
          href="/leads"
          loading={loading}
        />
        <Tile
          icon={CalendarCheck}
          label="My Upcoming Visits"
          value={summary?.myUpcomingVisits ?? 0}
          href="/visits/scheduled"
          loading={loading}
        />
        <Tile
          icon={TrendingUp}
          label="My Booked Leads"
          value={summary?.myBookedLeads ?? 0}
          href="/leads?stage=booked"
          loading={loading}
        />
        <Tile
          icon={ArchiveX}
          label="My Inactive Leads"
          value={summary?.myInactiveLeads ?? 0}
          href="/reports/inactive-leads"
          loading={loading}
        />
      </div>
    </ReportShell>
  );
}

function Tile({
  icon: Icon,
  label,
  value,
  href,
  loading,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number;
  href: string;
  loading?: boolean;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200/70 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
          {label}
        </p>
        <Icon className="size-4 text-slate-400" strokeWidth={1.75} />
      </div>
      <p className="mt-2 text-[26px] font-bold tracking-tight tabular-nums text-emerald-700">
        {loading ? (
          <span className="inline-block h-6 w-12 animate-pulse rounded bg-slate-100" />
        ) : (
          formatNumber(value)
        )}
      </p>
    </Link>
  );
}
