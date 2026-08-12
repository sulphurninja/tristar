"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpRight, Plus } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { cn, formatNumber } from "@/lib/utils";
import { StatusPill } from "@/components/shared/StatusPill";
import { PageShell, PageBody, Section, Surface } from "@/components/shared/PageShell";
import { MetricStrip, type KpiItem } from "@/components/shared/MetricStrip";

interface DashboardData {
  kpis: {
    totalLeads: number;
    freshLeads: number;
    returningLeads: number;
    untouchedLeads: number;
    unassignedLeads: number;
    todayLeads: number;
    todayFresh: number;
    todayReturning: number;
    todayTasks: number;
    todayVisits: number;
    hotLeads: number;
    todayFollowUps: number;
    overdueFollowUps: number;
    visitsThisWeek: number;
    activeProjects: number;
    activeBrokers: number;
    bookedLeads: number;
    inactiveLeads: number;
    backlogLeads: number;
  };
  todayActivity: {
    tasks: number;
    meetings: number;
    siteVisitScheduled: number;
    offlineCalls: number;
    callsToLead: number;
    whatsapp: number;
    stageChanges: number;
    visitActivities: number;
    overdueFollowUps: number;
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
  const { user } = useAuth();
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

  const allLeads: KpiItem[] = [
    { key: "total", label: "Total leads", value: data?.kpis.totalLeads ?? 0 },
    { key: "fresh", label: "Fresh", value: data?.kpis.freshLeads ?? 0, tone: "primary" },
    { key: "returning", label: "Returning", value: data?.kpis.returningLeads ?? 0 },
    { key: "untouched", label: "Untouched", value: data?.kpis.untouchedLeads ?? 0, tone: "warning" },
    { key: "unassigned", label: "Unassigned", value: data?.kpis.unassignedLeads ?? 0, tone: "danger" },
  ];

  const todayLeads: KpiItem[] = [
    { key: "leads", label: "Leads", value: data?.kpis.todayLeads ?? 0 },
    { key: "fresh", label: "Fresh", value: data?.kpis.todayFresh ?? 0, tone: "primary" },
    { key: "returning", label: "Returning", value: data?.kpis.todayReturning ?? 0 },
    { key: "tasks", label: "Tasks", value: data?.kpis.todayTasks ?? 0, tone: "warning" },
    { key: "visits", label: "Site visits", value: data?.kpis.todayVisits ?? 0 },
  ];

  const activity = data?.todayActivity;

  return (
    <PageShell>
      <PageBody>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[18px] font-semibold tracking-tight text-slate-900">
              {greeting}, {user?.name?.split(" ")[0] ?? "there"}
            </h2>
            <p className="text-[12.5px] text-slate-500">Your sales pulse for today.</p>
          </div>
          <Button asChild size="sm" className="h-9">
            <Link href="/leads?new=1">
              <Plus className="mr-1 size-3.5" />
              New lead
            </Link>
          </Button>
        </div>

        <Section title="All leads" description="Workspace-wide lead inventory.">
          {loading ? <StripSkeleton /> : <MetricStrip items={allLeads} />}
        </Section>

        <Section title="Today" description="What landed and what's due today.">
          {loading ? <StripSkeleton /> : <MetricStrip items={todayLeads} />}
        </Section>

        <Section title="Today's activity" description="Operational pulse for the day.">
          <Surface className="grid gap-0 sm:grid-cols-3">
            <ActivityGroup
              title="Work"
              items={[
                { label: "Tasks", value: activity?.tasks ?? 0 },
                { label: "Meetings", value: activity?.meetings ?? 0 },
                { label: "Site visits scheduled", value: activity?.siteVisitScheduled ?? 0 },
              ]}
            />
            <ActivityGroup
              title="Calls & WhatsApp"
              items={[
                { label: "Calls logged", value: activity?.offlineCalls ?? 0 },
                { label: "Calls to lead", value: activity?.callsToLead ?? 0 },
                { label: "WhatsApp", value: activity?.whatsapp ?? 0 },
              ]}
            />
            <ActivityGroup
              title="Pipeline"
              items={[
                { label: "Stage changes", value: activity?.stageChanges ?? 0 },
                { label: "Visit activities", value: activity?.visitActivities ?? 0 },
                { label: "Overdue follow-ups", value: activity?.overdueFollowUps ?? 0 },
              ]}
              last
            />
          </Surface>
        </Section>

        <div className="grid gap-5 lg:grid-cols-5">
          <Section
            title="Pipeline"
            description="Stage distribution"
            className="lg:col-span-3"
            actions={
              <Button asChild variant="ghost" size="sm" className="h-8 text-primary">
                <Link href="/leads/pipeline">
                  Open <ArrowUpRight className="ml-1 size-3.5" />
                </Link>
              </Button>
            }
          >
            <Surface className="p-4">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {PIPELINE_ORDER.map((s) => {
                  const count = data?.pipeline[s.key] ?? 0;
                  return (
                    <Link
                      key={s.key}
                      href={`/leads?stage=${s.key}`}
                      className="rounded-md bg-slate-50 px-3 py-3 transition-colors hover:bg-slate-100"
                    >
                      <StatusPill tone={s.tone} dot>
                        {s.label}
                      </StatusPill>
                      <p className="mt-2 text-[20px] font-semibold tabular-nums text-slate-900">
                        {formatNumber(count)}
                      </p>
                    </Link>
                  );
                })}
              </div>

              {data?.topProjects && data.topProjects.length > 0 ? (
                <div className="mt-5 border-t border-border pt-4">
                  <p className="text-[12px] font-semibold text-slate-900">Top projects</p>
                  <div className="mt-3 space-y-2">
                    {data.topProjects.map((p, idx) => {
                      const max = data.topProjects[0]?.count ?? 1;
                      const pct = Math.round((p.count / max) * 100);
                      return (
                        <div key={p._id} className="flex items-center gap-3">
                          <span className="w-4 text-[11px] tabular-nums text-slate-400">
                            {idx + 1}
                          </span>
                          <span className="min-w-0 flex-1 truncate text-[13px] text-slate-700">
                            {p.name ?? "Unnamed"}
                          </span>
                          <div className="h-1 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-primary"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-[12px] tabular-nums text-slate-600">
                            {p.count}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </Surface>
          </Section>

          <Section title="Recent activity" className="lg:col-span-2">
            <Surface className="divide-y divide-border">
              {(data?.recentActivity ?? []).length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-slate-500">
                  No activity yet.
                </p>
              ) : (
                data?.recentActivity.map((a) => (
                  <div key={a._id} className="flex gap-3 px-4 py-3">
                    <div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600">
                      {(a.leadId?.contact?.name ?? "?").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-[13px] text-slate-700">
                        <span className="font-medium text-slate-900">
                          {a.leadId?.contact?.name ?? "Unknown"}
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
            </Surface>
          </Section>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Hot leads", value: data?.kpis.hotLeads ?? 0, href: "/leads?stage=hot" },
            { label: "Overdue", value: data?.kpis.overdueFollowUps ?? 0, href: "/tasks" },
            { label: "Booked", value: data?.kpis.bookedLeads ?? 0, href: "/bookings" },
            { label: "Backlog", value: data?.kpis.backlogLeads ?? 0, href: "/reports/backlog" },
          ].map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-slate-300"
            >
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">
                {item.label}
              </p>
              <p className="mt-1 text-[18px] font-semibold tabular-nums text-slate-900">
                {formatNumber(item.value)}
              </p>
            </Link>
          ))}
        </div>
      </PageBody>
    </PageShell>
  );
}

function ActivityGroup({
  title,
  items,
  last,
}: {
  title: string;
  items: Array<{ label: string; value: number }>;
  last?: boolean;
}) {
  return (
    <div
      className={cn(
        "space-y-3 px-5 py-4",
        !last && "border-b border-border sm:border-b-0 sm:border-r",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
        {title}
      </p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-baseline justify-between gap-3">
            <span className="text-[13px] text-slate-600">{item.label}</span>
            <span className="text-[14px] font-semibold tabular-nums text-slate-900">
              {formatNumber(item.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StripSkeleton() {
  return (
    <div className="grid h-[88px] animate-pulse gap-4 rounded-lg border border-border bg-card sm:grid-cols-5" />
  );
}
