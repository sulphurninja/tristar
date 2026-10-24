"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Download } from "lucide-react";
import {
  BdButton,
  BdCard,
  BdEmptyRow,
  BdPage,
  BdTable,
  BdTd,
  BdTh,
} from "@/components/bd";
import { BdDateInput, BdDateRange, ymd } from "@/components/bd/DateInputs";
import {
  TeamAgentSelects,
  scopeQuery,
  type TeamAgentValue,
} from "@/components/bd/TeamAgentSelects";
import { downloadCsv } from "@/lib/csv";
import { formatNumber } from "@/lib/utils";

const BAR = "#5471e4";
const DONUT = ["#4472d9", "#e5484d", "#5cc24a", "#f39a3d", "#a53bc4", "#9fd8f8", "#f2c94c", "#1b998b", "#8d6e63", "#607d8b"];

interface Point {
  date: string;
  day: string;
  value: number;
}
interface Card {
  value: number;
  series: Point[];
}
interface AgentRow {
  userId: string;
  name: string;
  total: number;
  ontime: number;
  delayed: number;
}
interface Data {
  cards: Record<"todayLeads" | "siteVisitScheduled" | "siteVisitCompleted" | "booking" | "leadUnqualified", Card>;
  activity: { total: number; ontime: number; delayed: number; pctOntime: number; byAgent: AgentRow[] };
  leads: {
    total: number;
    sources: Array<{ key: string; label: string; count: number }>;
    stages: Array<{ key: string; label: string; count: number }>;
  };
}

const CARDS: Array<{ key: keyof Data["cards"]; title: string }> = [
  { key: "todayLeads", title: "TODAY'S LEAD" },
  { key: "siteVisitScheduled", title: "SITE VISIT SCHEDULED" },
  { key: "siteVisitCompleted", title: "SITE VISIT COMPLETED" },
  { key: "booking", title: "BOOKING" },
  { key: "leadUnqualified", title: "LEAD UNQUALIFIED" },
];

function MetricCard({ title, card }: { title: string; card?: Card }) {
  const data = card?.series ?? [];
  const max = Math.max(0, ...data.map((d) => d.value));
  // Buildesk shows 0 / mid / max ticks; keep them whole numbers for counts.
  const top = max <= 1 ? 1 : max;
  const ticks = top === 1 ? [0, 0.5, 1] : top <= 2 ? [0, top] : [0, Math.ceil(top / 2), top];
  return (
    <div className="bd-card flex items-center justify-between gap-2 rounded-[3px] px-6 py-5">
      <div className="min-w-[120px]">
        <p className="text-[12.5px] uppercase text-[#2b2f3a]">{title}</p>
        <p className="mt-3 text-[22px] font-medium leading-none text-[#2b2f3a]">{card ? formatNumber(card.value) : "-"}</p>
      </div>
      <div className="h-[80px] w-full max-w-[290px]">
        <ResponsiveContainer>
          <BarChart data={data} margin={{ top: 4, right: 4, left: -8, bottom: 0 }} barCategoryGap="22%">
            <CartesianGrid strokeDasharray="1.5 2" stroke="#c9ced9" />
            <XAxis dataKey="day" tickLine={false} axisLine={false} fontSize={9} stroke="#8b90a0" interval={0} />
            <YAxis
              width={26}
              tickLine={false}
              axisLine={false}
              fontSize={9}
              stroke="#8b90a0"
              domain={[0, top]}
              ticks={ticks}
              allowDecimals
            />
            <Tooltip
              cursor={{ fill: "rgba(84,113,228,0.08)" }}
              labelFormatter={(_l, p) => (p as Array<{ payload?: { date?: string } }> | undefined)?.[0]?.payload?.date ?? ""}
              formatter={(v) => [v as number, title]}
              contentStyle={{ fontSize: 12, borderRadius: 3, border: "1px solid #e6e9f2" }}
            />
            <Bar dataKey="value" fill={BAR} radius={0} maxBarSize={9} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Pct({ a, b }: { a: number; b: number }) {
  return <>{b ? `${Math.round((a / b) * 100)}%` : "0%"}</>;
}

export default function LeadAnalysisPage() {
  const today = ymd();
  const [scope, setScope] = useState<TeamAgentValue>({ team: "", agent: "" });
  const [day, setDay] = useState(today);
  const [range, setRange] = useState({ from: today, to: today });
  const [details, setDetails] = useState({ from: today, to: today });
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const query = useMemo(() => {
    const p = scopeQuery(scope);
    p.set("day", day);
    p.set("from", range.from);
    p.set("to", range.to);
    p.set("dfrom", details.from);
    p.set("dto", details.to);
    return p.toString();
  }, [scope, day, range, details]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    fetch(`/api/reports/lead-analysis?${query}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        if (d.error) setError(d.error);
        else {
          setError("");
          setData(d);
        }
      })
      .catch(() => live && setError("Could not load Lead Analysis."))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [query]);

  const act = data?.activity;
  const agents = (act?.byAgent ?? []).filter((a) => a.delayed > 0);

  const exportAgents = () =>
    downloadCsv(`lead-analysis-activity-${details.from}_${details.to}`, [
      ["Sales Agent", "Total Activity", "Ontime", "Delayed", "% Ontime"],
      ...(act?.byAgent ?? []).map((a) => [a.name, a.total, a.ontime, a.delayed, a.total ? Math.round((a.ontime / a.total) * 100) : 0]),
    ]);

  return (
    <BdPage className="space-y-5">
      <div className="flex justify-end border-b border-[#e6e9f2] pb-5">
        <TeamAgentSelects value={scope} onChange={setScope} />
      </div>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[18px] font-semibold text-[#2b2f3a]">Lead Analysis</h2>
          <BdDateInput value={day} onChange={setDay} />
        </div>
        {error ? <p className="mb-3 text-[13px] text-[#e5484d]">{error}</p> : null}
        <div className="grid gap-5 xl:grid-cols-3 md:grid-cols-2">
          {CARDS.map((c) => (
            <MetricCard key={c.key} title={c.title} card={data?.cards[c.key]} />
          ))}
        </div>
      </section>

      <div className="flex items-center justify-end gap-3 border-t border-[#e6e9f2] pt-5">
        <span className="text-[13px] font-bold text-[#3a5dc2]" title="Applies to the lead breakdown below and seeds Details From">
          Date Range ⓘ
        </span>
        <BdDateRange
          from={range.from}
          to={range.to}
          onChange={(v) => {
            setRange(v);
            setDetails(v);
          }}
        />
      </div>

      <BdCard
        title="Activity Completed Time"
        bodyClassName="p-0"
        actions={
          <BdButton variant="light" onClick={exportAgents} disabled={!act}>
            <Download className="size-3.5" /> Export CSV
          </BdButton>
        }
      >
        <div className="flex flex-wrap items-center gap-4 border-b border-[#eef0f6] px-5 py-3">
          <span className="text-[15px] font-bold text-[#3a5dc2]">Details From</span>
          <BdDateRange from={details.from} to={details.to} onChange={setDetails} />
        </div>
        <div className="grid gap-6 p-5 lg:grid-cols-2">
          <div className="flex flex-col justify-between gap-8">
            <h3 className="text-[18px] font-medium text-[#2b2f3a]">
              {act ? act.pctOntime : 0} % Activity Completed in time
            </h3>
            <div className="grid grid-cols-3 gap-4 rounded-[3px] border border-[#eef0f6] p-4">
              <div>
                <p className="text-[13px] font-bold text-[#2b2f3a]">Total Activity</p>
                <p className="mt-2 text-[20px] text-[#2b2f3a]">{act ? formatNumber(act.total) : "-"}</p>
              </div>
              <div className="border-l border-[#eef0f6] pl-4">
                <p className="text-[13px] font-bold text-[#2b2f3a]">Ontime</p>
                <p className="mt-2 text-[20px] text-[#37b24d]">{act ? formatNumber(act.ontime) : "-"}</p>
              </div>
              <div className="border-l border-[#eef0f6] pl-4">
                <p className="text-[13px] font-bold text-[#2b2f3a]">Delayed</p>
                <p className="mt-2 text-[20px] text-[#e5484d]">{act ? formatNumber(act.delayed) : "-"}</p>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-[18px] font-medium text-[#2b2f3a]">Delay Activity</h3>
            {agents.length === 0 ? (
              <p className="py-16 text-center text-[13px] text-[#8b90a0]">
                {loading ? "Loading…" : "No delayed activity in this range."}
              </p>
            ) : (
              <div className="grid grid-cols-[1fr_220px] items-center gap-3">
                <div className="h-[260px]">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={agents} dataKey="delayed" nameKey="name" innerRadius="62%" outerRadius="95%" startAngle={90} endAngle={-270} stroke="none">
                        {agents.map((_, i) => (
                          <Cell key={i} fill={DONUT[i % DONUT.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ fontSize: 12, borderRadius: 3, border: "1px solid #e6e9f2" }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <ul className="max-h-[260px] space-y-2.5 overflow-y-auto text-[13px]">
                  {agents.map((a, i) => (
                    <li key={a.userId} className="flex items-center gap-2.5 text-[#2b2f3a]">
                      <span className="h-[7px] w-6 shrink-0 rounded-full" style={{ background: DONUT[i % DONUT.length] }} />
                      <span className="truncate">{a.name}</span>
                      <span className="ml-auto tabular-nums text-[#8b90a0]">{a.delayed}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      </BdCard>

      <BdCard
        title="Delay by Sales Agent"
        bodyClassName="p-0"
        actions={<span className="text-[12.5px] text-[#8b90a0]">{details.from} to {details.to}</span>}
      >
        <BdTable minWidth={700}>
          <thead>
            <tr>
              <BdTh>Sales Agent</BdTh>
              <BdTh className="text-right">Total Activity</BdTh>
              <BdTh className="text-right">Ontime</BdTh>
              <BdTh className="text-right">Delayed</BdTh>
              <BdTh className="text-right">% Ontime</BdTh>
            </tr>
          </thead>
          <tbody>
            {(act?.byAgent ?? []).length === 0 ? (
              <BdEmptyRow colSpan={5} loading={loading} />
            ) : (
              act!.byAgent.map((a) => (
                <tr key={a.userId}>
                  <BdTd className="font-medium">{a.name}</BdTd>
                  <BdTd className="text-right tabular-nums">{a.total}</BdTd>
                  <BdTd className="text-right tabular-nums text-[#37b24d]">{a.ontime}</BdTd>
                  <BdTd className="text-right tabular-nums text-[#e5484d]">{a.delayed}</BdTd>
                  <BdTd className="text-right tabular-nums">
                    <Pct a={a.ontime} b={a.total} />
                  </BdTd>
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
      </BdCard>

      <div className="grid gap-5 lg:grid-cols-2">
        <BdCard
          title="Leads by Source"
          bodyClassName="p-0"
          actions={
            <BdButton
              variant="light"
              onClick={() =>
                downloadCsv(`lead-analysis-sources-${range.from}_${range.to}`, [
                  ["Source", "Leads", "%"],
                  ...(data?.leads.sources ?? []).map((s) => [s.label, s.count, data!.leads.total ? Math.round((s.count / data!.leads.total) * 100) : 0]),
                ])
              }
              disabled={!data}
            >
              <Download className="size-3.5" /> Export CSV
            </BdButton>
          }
        >
          <BdTable minWidth={360}>
            <thead>
              <tr>
                <BdTh>Source</BdTh>
                <BdTh className="text-right">Leads</BdTh>
                <BdTh className="text-right">%</BdTh>
              </tr>
            </thead>
            <tbody>
              {(data?.leads.sources ?? []).length === 0 ? (
                <BdEmptyRow colSpan={3} loading={loading} />
              ) : (
                data!.leads.sources.map((s) => (
                  <tr key={s.key}>
                    <BdTd>{s.label}</BdTd>
                    <BdTd className="text-right tabular-nums">{formatNumber(s.count)}</BdTd>
                    <BdTd className="text-right tabular-nums">
                      <Pct a={s.count} b={data!.leads.total} />
                    </BdTd>
                  </tr>
                ))
              )}
              {data && data.leads.sources.length > 0 ? (
                <tr className="bg-[#f6f8fd]">
                  <BdTd className="font-bold">Total</BdTd>
                  <BdTd className="text-right font-bold tabular-nums">{formatNumber(data.leads.total)}</BdTd>
                  <BdTd />
                </tr>
              ) : null}
            </tbody>
          </BdTable>
        </BdCard>

        <BdCard
          title="Leads by Stage"
          bodyClassName="p-0"
          actions={
            <BdButton
              variant="light"
              onClick={() =>
                downloadCsv(`lead-analysis-stages-${range.from}_${range.to}`, [
                  ["Stage", "Leads", "%"],
                  ...(data?.leads.stages ?? []).map((s) => [s.label, s.count, data!.leads.total ? Math.round((s.count / data!.leads.total) * 100) : 0]),
                ])
              }
              disabled={!data}
            >
              <Download className="size-3.5" /> Export CSV
            </BdButton>
          }
        >
          <BdTable minWidth={360}>
            <thead>
              <tr>
                <BdTh>Stage</BdTh>
                <BdTh className="text-right">Leads</BdTh>
                <BdTh className="text-right">%</BdTh>
              </tr>
            </thead>
            <tbody>
              {(data?.leads.stages ?? []).length === 0 ? (
                <BdEmptyRow colSpan={3} loading={loading} />
              ) : (
                data!.leads.stages.map((s) => (
                  <tr key={s.key}>
                    <BdTd>{s.label}</BdTd>
                    <BdTd className="text-right tabular-nums">{formatNumber(s.count)}</BdTd>
                    <BdTd className="text-right tabular-nums">
                      <Pct a={s.count} b={data!.leads.total} />
                    </BdTd>
                  </tr>
                ))
              )}
            </tbody>
          </BdTable>
        </BdCard>
      </div>
    </BdPage>
  );
}
