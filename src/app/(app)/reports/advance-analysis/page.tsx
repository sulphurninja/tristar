"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import { ReportShell } from "@/components/reports/ReportShell";
import { BdCard } from "@/components/bd";
import { useReportFilters } from "@/hooks/useReportFilters";
import { downloadCsv } from "@/lib/csv";
import { formatNumber } from "@/lib/utils";

const COLORS = ["#4472d9", "#e5484d", "#5cc24a", "#f39a3d", "#a53bc4", "#9fd8f8", "#f2c94c", "#1b998b"];

interface SeriesPoint {
  day: string;
  value: number;
}

interface Data {
  kpis: Record<"todayLeads" | "siteVisitScheduled" | "siteVisitCompleted" | "booking" | "leadUnqualified", number>;
  series: Record<"todayLeads" | "siteVisitScheduled" | "siteVisitCompleted" | "booking" | "leadUnqualified", SeriesPoint[]>;
  activity: { total: number; ontime: number; delayed: number; pctOntime: number; mostDelayBy: string };
  delayByAgent: Array<{ name: string; value: number }>;
}

const CARDS: Array<{ key: keyof Data["kpis"]; label: string }> = [
  { key: "todayLeads", label: "Leads" },
  { key: "siteVisitScheduled", label: "Site Visit Scheduled" },
  { key: "siteVisitCompleted", label: "Site Visit Completed" },
  { key: "booking", label: "Booking" },
  { key: "leadUnqualified", label: "Lead Unqualified" },
];

export default function AdvanceAnalysisPage() {
  const f = useReportFilters("7d");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!f.ready) return;
    setLoading(true);
    let live = true;
    fetch(`/api/reports/advance-analysis?${f.query}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => live && setData(d.error ? null : d))
      .catch(() => live && setData(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [f.query, f.ready]);

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(`advance-analysis-${f.range}`, [
      ["Metric", "Count"],
      ...CARDS.map((c) => [c.label, data.kpis[c.key]]),
      ["Total Activity", data.activity.total],
      ["Ontime", data.activity.ontime],
      ["Delayed", data.activity.delayed],
      [],
      ["Sales Agent", "Delayed Activity"],
      ...data.delayByAgent.map((a) => [a.name, a.value]),
    ]);
  };

  return (
    <ReportShell
      title="Advance Analysis"
      description="Lead, site visit and activity pulse for the selected window."
      range={f.range}
      onRangeChange={f.setRange}
      from={f.from}
      to={f.to}
      onDatesChange={f.onDatesChange}
      scope={f.scope}
      onScopeChange={f.setScope}
      onReset={f.reset}
      onExport={exportCsv}
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {CARDS.map((c) => (
          <div key={c.key} className="bd-card rounded-[3px] px-5 py-4">
            <p className="text-[12.5px] uppercase text-[#2b2f3a]">{c.label}</p>
            <p className="mt-2 text-[24px] font-medium leading-none">{loading || !data ? "-" : formatNumber(data.kpis[c.key])}</p>
            <div className="mt-2 h-[64px]">
              <ResponsiveContainer>
                <BarChart data={data?.series[c.key] ?? []} margin={{ top: 2, right: 0, left: -30, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="1.5 2" stroke="#c9ced9" />
                  <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={9} stroke="#8b90a0" interval={0} />
                  <YAxis tickLine={false} axisLine={false} fontSize={9} stroke="#8b90a0" allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 3, border: "1px solid #e6e9f2" }} />
                  <Bar dataKey="value" fill="#5471e4" maxBarSize={9} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <BdCard title="Activity Completed Time">
          <p className="text-[18px] font-medium text-[#2b2f3a]">
            {data?.activity.pctOntime ?? 0} % Activity Completed in time
          </p>
          <div className="mt-6 grid grid-cols-3 gap-4 rounded-[3px] border border-[#eef0f6] p-4">
            <div>
              <p className="text-[13px] font-bold">Total Activity</p>
              <p className="mt-2 text-[20px]">{formatNumber(data?.activity.total ?? 0)}</p>
            </div>
            <div className="border-l border-[#eef0f6] pl-4">
              <p className="text-[13px] font-bold">Ontime</p>
              <p className="mt-2 text-[20px] text-[#37b24d]">{formatNumber(data?.activity.ontime ?? 0)}</p>
            </div>
            <div className="border-l border-[#eef0f6] pl-4">
              <p className="text-[13px] font-bold">Delayed</p>
              <p className="mt-2 text-[20px] text-[#e5484d]">{formatNumber(data?.activity.delayed ?? 0)}</p>
            </div>
          </div>
          <p className="mt-4 text-[12.5px] text-[#8b90a0]">
            Most delay by <span className="font-semibold text-[#2b2f3a]">{data?.activity.mostDelayBy ?? "-"}</span>
          </p>
        </BdCard>

        <BdCard title="Delay Activity">
          {(data?.delayByAgent.length ?? 0) > 0 ? (
            <div className="grid grid-cols-[1fr_200px] items-center gap-3">
              <div className="h-56">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data!.delayByAgent} dataKey="value" nameKey="name" innerRadius="62%" outerRadius="95%" stroke="none">
                      {data!.delayByAgent.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="max-h-56 space-y-2 overflow-y-auto text-[13px]">
                {data!.delayByAgent.map((a, i) => (
                  <li key={a.name} className="flex items-center gap-2">
                    <span className="h-[7px] w-6 shrink-0 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="truncate">{a.name}</span>
                    <span className="ml-auto tabular-nums text-[#8b90a0]">{a.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="py-16 text-center text-[13px] text-[#8b90a0]">
              {loading ? "Loading…" : "No delayed activity in this window."}
            </p>
          )}
        </BdCard>
      </div>
    </ReportShell>
  );
}
