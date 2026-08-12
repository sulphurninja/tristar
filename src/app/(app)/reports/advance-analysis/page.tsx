"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { ReportShell } from "@/components/reports/ReportShell";
import { useReportFilters } from "@/hooks/useReportFilters";
import { Surface } from "@/components/shared/PageShell";
import { formatNumber } from "@/lib/utils";

const COLORS = ["#059669", "#0ea5e9", "#f59e0b", "#ef4444", "#8b5cf6", "#14b8a6", "#64748b"];

interface SeriesPoint {
  day: string;
  value: number;
}

interface Data {
  kpis: {
    todayLeads: number;
    siteVisitScheduled: number;
    siteVisitCompleted: number;
    booking: number;
    leadUnqualified: number;
  };
  series: {
    todayLeads: SeriesPoint[];
    siteVisitScheduled: SeriesPoint[];
    siteVisitCompleted: SeriesPoint[];
    booking: SeriesPoint[];
    leadUnqualified: SeriesPoint[];
  };
  activity: {
    total: number;
    ontime: number;
    delayed: number;
    pctOntime: number;
    mostDelayBy: string;
  };
  delayByAgent: Array<{ name: string; value: number }>;
}

export default function AdvanceAnalysisPage() {
  const { range, setRange, from, to, onDatesChange, query, ready } = useReportFilters("30d");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    fetch(`/api/reports/advance-analysis?${query}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [query, ready]);

  const cards = [
    { key: "todayLeads", label: "Leads in range", value: data?.kpis.todayLeads ?? 0, series: data?.series.todayLeads },
    {
      key: "svs",
      label: "Site visit scheduled",
      value: data?.kpis.siteVisitScheduled ?? 0,
      series: data?.series.siteVisitScheduled,
    },
    {
      key: "svc",
      label: "Site visit completed",
      value: data?.kpis.siteVisitCompleted ?? 0,
      series: data?.series.siteVisitCompleted,
    },
    { key: "booking", label: "Booking", value: data?.kpis.booking ?? 0, series: data?.series.booking },
    {
      key: "unq",
      label: "Lead unqualified",
      value: data?.kpis.leadUnqualified ?? 0,
      series: data?.series.leadUnqualified,
    },
  ];

  return (
    <ReportShell
      title="Advance analysis"
      description="Lead, visit and activity pulse with delay breakdown."
      range={range}
      onRangeChange={setRange}
      from={from}
      to={to}
      onDatesChange={onDatesChange}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <Surface key={c.key} className="p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {c.label}
            </p>
            <p className="mt-2 text-[28px] font-bold tabular-nums text-slate-900">
              {loading ? "—" : formatNumber(c.value)}
            </p>
            <div className="mt-3 h-16">
              {c.series?.length ? (
                <ResponsiveContainer>
                  <BarChart data={c.series}>
                    <Bar dataKey="value" fill="#059669" radius={[2, 2, 0, 0]} />
                    <XAxis dataKey="day" hide />
                    <YAxis hide />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full animate-pulse rounded bg-slate-100" />
              )}
            </div>
          </Surface>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Surface className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Task completion time
          </p>
          <p className="mt-3 text-[28px] font-bold text-slate-900">
            {data?.activity.pctOntime ?? 0}%{" "}
            <span className="text-[16px] font-medium text-slate-500">
              tasks completed on time
            </span>
          </p>
          <div className="mt-4 grid grid-cols-3 gap-3 rounded-lg bg-slate-50 p-3 text-center">
            <div>
              <p className="text-[11px] text-slate-500">Total</p>
              <p className="text-[18px] font-semibold tabular-nums">
                {formatNumber(data?.activity.total ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Ontime</p>
              <p className="text-[18px] font-semibold tabular-nums text-emerald-600">
                {formatNumber(data?.activity.ontime ?? 0)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-500">Delayed</p>
              <p className="text-[18px] font-semibold tabular-nums text-red-600">
                {formatNumber(data?.activity.delayed ?? 0)}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[12px] text-slate-500">
            * Most delay by{" "}
            <span className="font-semibold text-slate-700">
              {data?.activity.mostDelayBy ?? "—"}
            </span>
          </p>
        </Surface>

        <Surface className="p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Delay activity
          </p>
          <div className="mt-2 grid grid-cols-[1fr_140px] items-center gap-3">
            <div className="h-56">
              {(data?.delayByAgent?.length ?? 0) > 0 ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={data!.delayByAgent}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={2}
                    >
                      {data!.delayByAgent.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-[13px] text-slate-500">
                  No activity data
                </div>
              )}
            </div>
            <ul className="max-h-56 space-y-1.5 overflow-y-auto text-[12px]">
              {(data?.delayByAgent ?? []).map((a, i) => (
                <li key={a.name} className="flex items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ background: COLORS[i % COLORS.length] }}
                  />
                  <span className="truncate text-slate-600">{a.name}</span>
                  <span className="ml-auto tabular-nums font-medium text-slate-800">
                    {a.value}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Surface>
      </div>
    </ReportShell>
  );
}
