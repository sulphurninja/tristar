"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowUpRight,
  Plus,
  TrendingUp,
  Users,
  Flame,
  CalendarCheck,
  Building2,
  Handshake,
  Clock,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import { StatusPill } from "@/components/shared/StatusPill";

interface DashboardData {
  kpis: {
    totalLeads: number;
    newLeadsLast7d: number;
    hotLeads: number;
    todayFollowUps: number;
    overdueFollowUps: number;
    visitsThisWeek: number;
    confirmedVisitsThisWeek: number;
    activeProjects: number;
    activeBrokers: number;
    bookedLeads: number;
    inactiveLeads: number;
    backlogLeads: number;
    visitExpirations: number;
  };
  pipeline: Record<string, number>;
  recentActivity: Array<{
    _id: string;
    type: string;
    description?: string;
    occurredAt: string;
    leadId?: { _id: string; contact?: { name?: string }; leadNumber?: string };
  }>;
  topProjects: Array<{ _id: string; name?: string; city?: string; count: number }>;
}

const PIPELINE_ORDER: Array<{
  key: string;
  label: string;
  tone: "neutral" | "info" | "warning" | "primary" | "success" | "danger";
}> = [
  { key: "new", label: "New", tone: "neutral" },
  { key: "warm", label: "Warm", tone: "info" },
  { key: "hot", label: "Hot", tone: "warning" },
  { key: "site_visit_scheduled", label: "Visit booked", tone: "primary" },
  { key: "site_visit_done", label: "Visit done", tone: "primary" },
  { key: "negotiating", label: "Negotiating", tone: "warning" },
  { key: "booked", label: "Booked", tone: "success" },
  { key: "lost", label: "Lost", tone: "danger" },
];

export default function DashboardPage() {
  const { user, workspace } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard/summary", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="border-b border-slate-200/70 bg-gradient-to-br from-emerald-50/60 via-white to-sky-50/40 px-7 py-7 lg:px-10 lg:py-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[12.5px] font-medium text-slate-500">
              {greeting}, {user?.name?.split(" ")[0] ?? "there"}.
            </p>
            <h1 className="mt-1 text-[26px] font-bold tracking-tight text-slate-900 lg:text-[30px]">
              Here&apos;s what&apos;s moving at{" "}
              <span className="bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                {workspace?.name ?? "Tristar Realtors"}
              </span>
            </h1>
            <p className="mt-1.5 max-w-2xl text-[13.5px] leading-relaxed text-slate-600">
              Every lead, project, visit and channel partner across the Tristar group — on
              one screen.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              asChild
              variant="outline"
              size="default"
              className="h-10 gap-1.5 rounded-lg"
            >
              <Link href="/leads/bulk-update">
                <ArrowUpRight className="size-4" strokeWidth={1.75} />
                Bulk update
              </Link>
            </Button>
            <Button asChild size="default" className="h-10 gap-1.5 rounded-lg">
              <Link href="/leads?new=1">
                <Plus className="size-4" strokeWidth={2} />
                New lead
              </Link>
            </Button>
          </div>
        </div>
      </div>

      {/* Top stats — match the Lead Management screenshot order */}
      <div className="grid grid-cols-2 gap-px bg-slate-200/70 px-px sm:grid-cols-3 lg:grid-cols-7">
        <KpiTile
          icon={Clock}
          label="Today's follow-ups"
          value={data?.kpis.todayFollowUps ?? 0}
          hint={`${data?.kpis.overdueFollowUps ?? 0} overdue`}
          loading={loading}
          accent="default"
          href="/leads?stage=warm"
        />
        <KpiTile
          icon={AlertCircle}
          label="Backlogs"
          value={data?.kpis.backlogLeads ?? 0}
          hint="Awaiting action"
          loading={loading}
          accent="default"
          href="/reports/backlog"
        />
        <KpiTile
          icon={CalendarCheck}
          label="Visit Expirations"
          value={data?.kpis.visitExpirations ?? 0}
          hint="Past their planned date"
          loading={loading}
          accent="default"
          href="/visits/scheduled"
        />
        <KpiTile
          icon={Flame}
          label="Hot Leads"
          value={data?.kpis.hotLeads ?? 0}
          hint="Score ≥ 75"
          loading={loading}
          accent="hot"
          href="/leads?stage=hot"
        />
        <KpiTile
          icon={Users}
          label="New Leads"
          value={data?.kpis.totalLeads ?? 0}
          hint={`+${data?.kpis.newLeadsLast7d ?? 0} this week`}
          loading={loading}
          accent="info"
          href="/leads?stage=new"
        />
        <KpiTile
          icon={TrendingUp}
          label="Booked Leads"
          value={data?.kpis.bookedLeads ?? 0}
          hint="Closed-won"
          loading={loading}
          accent="success"
          href="/leads?stage=booked"
        />
        <KpiTile
          icon={Building2}
          label="Inactive Leads"
          value={data?.kpis.inactiveLeads ?? 0}
          hint="No contact 30d+"
          loading={loading}
          accent="default"
          href="/reports/inactive-leads"
        />
      </div>

      <div className="grid flex-1 grid-cols-1 gap-px bg-slate-200/70 lg:grid-cols-3">
        <section className="bg-white px-7 py-7 lg:col-span-2 lg:px-10">
          <div className="flex items-end justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="size-4 text-emerald-600" strokeWidth={1.75} />
                <h3 className="text-[15px] font-semibold text-slate-900">Pipeline</h3>
              </div>
              <p className="mt-1 text-[12.5px] text-slate-500">Every lead from new to booked.</p>
            </div>
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="h-8 gap-1 rounded-lg text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <Link href="/leads/pipeline">
                Open pipeline
                <ArrowUpRight className="size-3.5" strokeWidth={2} />
              </Link>
            </Button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-8">
            {PIPELINE_ORDER.map((s) => {
              const count = data?.pipeline[s.key] ?? 0;
              return (
                <Link
                  key={s.key}
                  href={`/leads?stage=${s.key}`}
                  className="group flex flex-col gap-2 rounded-xl bg-slate-50/70 p-3.5 transition-all hover:bg-emerald-50/60 hover:ring-1 hover:ring-emerald-200/60"
                >
                  <StatusPill tone={s.tone} dot>
                    {s.label}
                  </StatusPill>
                  <p className="text-[24px] font-bold tracking-tight text-slate-900">
                    {formatNumber(count)}
                  </p>
                  <p className="text-[10.5px] uppercase tracking-wider text-slate-400">leads</p>
                </Link>
              );
            })}
          </div>

          {data?.topProjects && data.topProjects.length > 0 ? (
            <div className="mt-8">
              <h4 className="text-[13px] font-semibold text-slate-900">
                Top projects by lead volume
              </h4>
              <div className="mt-3 space-y-2">
                {data.topProjects.map((p, idx) => {
                  const max = data.topProjects[0]?.count ?? 1;
                  const pct = Math.round((p.count / max) * 100);
                  return (
                    <div key={p._id} className="flex items-center gap-3">
                      <span className="w-5 shrink-0 text-[11.5px] font-bold tabular-nums text-slate-400">
                        {idx + 1}
                      </span>
                      <span className="flex-1 truncate text-[13px] text-slate-700">
                        {p.name ?? "Unnamed"}
                        {p.city ? (
                          <span className="ml-1.5 text-slate-400">· {p.city}</span>
                        ) : null}
                      </span>
                      <div className="h-1.5 w-32 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-8 text-right text-[12px] font-semibold tabular-nums text-slate-700">
                        {p.count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <ShortcutTile
              icon={Building2}
              label="Active projects"
              value={data?.kpis.activeProjects ?? 0}
              href="/projects"
            />
            <ShortcutTile
              icon={Handshake}
              label="Active brokers"
              value={data?.kpis.activeBrokers ?? 0}
              href="/brokers"
            />
            <ShortcutTile
              icon={CalendarCheck}
              label="Visits this week"
              value={data?.kpis.visitsThisWeek ?? 0}
              href="/visits"
            />
            <ShortcutTile
              icon={Users}
              label="Total leads"
              value={data?.kpis.totalLeads ?? 0}
              href="/leads"
            />
          </div>
        </section>

        <section className="bg-white px-7 py-7 lg:px-10">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h3 className="text-[15px] font-semibold text-slate-900">Recent activity</h3>
              <p className="mt-1 text-[12.5px] text-slate-500">
                What&apos;s happening across your workspace.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {(data?.recentActivity ?? []).length === 0 ? (
              <div className="rounded-xl bg-slate-50 px-4 py-8 text-center text-[13px] text-slate-500">
                No activity yet. Add your first lead to get started.
              </div>
            ) : (
              data?.recentActivity.map((a) => (
                <div key={a._id} className="flex gap-3">
                  <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                    {(a.leadId?.contact?.name ?? "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] text-slate-700">
                      <span className="font-semibold text-slate-900">
                        {a.leadId?.contact?.name ?? "Unknown lead"}
                      </span>{" "}
                      · {a.description ?? a.type.replace(/_/g, " ")}
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {new Date(a.occurredAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  hint,
  loading,
  accent = "default",
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number;
  hint: string;
  loading?: boolean;
  accent?: "default" | "amber" | "hot" | "success" | "info";
  href?: string;
}) {
  const accentColor = {
    default: "text-slate-400",
    amber: "text-amber-500",
    hot: "text-red-500",
    success: "text-emerald-500",
    info: "text-sky-500",
  }[accent];
  const valueColor = {
    default: "text-slate-900",
    amber: "text-amber-700",
    hot: "text-red-700",
    success: "text-emerald-700",
    info: "text-sky-700",
  }[accent];
  const accentBg = {
    default: "bg-white",
    amber: "bg-amber-50/60",
    hot: "bg-red-50/60",
    success: "bg-emerald-50/60",
    info: "bg-sky-50/60",
  }[accent];

  const inner = (
    <div className={cn("px-5 py-5", accentBg)}>
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] font-medium text-slate-600">{label}</p>
        <Icon className={cn("size-[15px]", accentColor)} strokeWidth={1.75} />
      </div>
      <p
        className={cn(
          "mt-2 text-[26px] font-bold tracking-tight tabular-nums",
          valueColor,
        )}
      >
        {loading ? (
          <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-100" />
        ) : (
          formatNumber(value)
        )}
      </p>
      <p className="mt-0.5 text-[11px] text-slate-400">{hint}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block transition-opacity hover:opacity-90">
        {inner}
      </Link>
    );
  }
  return inner;
}

function ShortcutTile({
  icon: Icon,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-slate-200/70 bg-white p-4 transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-medium text-slate-500">{label}</span>
        <Icon className="size-4 text-slate-400" strokeWidth={1.75} />
      </div>
      <p className="mt-1.5 text-[20px] font-bold tracking-tight tabular-nums text-slate-900">
        {formatNumber(value)}
      </p>
    </Link>
  );
}
