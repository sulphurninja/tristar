"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { BdCard, BdSelect, BdStatCard } from "@/components/bd";
import { TeamAgentSelects, type TeamAgentValue } from "@/components/bd/TeamAgentSelects";
import { cn } from "@/lib/utils";

export interface StageStat {
  key: string;
  label: string;
  color: string;
  count: number;
  pct: number;
}
export interface Overview {
  total: number;
  stages: StageStat[];
  kpis: {
    untouchedLeads: number;
    noFollowupsLeads: number;
    returningLeads: number;
    returningNoFollowupLeads: number;
    overdueTaskLeads: number;
  };
}

export const VIEW_OPTIONS = [
  { value: "active", label: "Active Lead" },
  { value: "all", label: "All Leads" },
  { value: "returning", label: "Returning" },
  { value: "hot", label: "Hot Leads" },
  { value: "booked", label: "Booked" },
  { value: "lost", label: "Lost/Inactive" },
];

export const CARDS = [
  { key: "untouched", title: "Untouched Leads", caption: "Leads never contacted", field: "untouchedLeads" },
  { key: "nofollowup", title: "No Followups Leads", caption: "Contacted but no future followups", field: "noFollowupsLeads" },
  { key: "returning", title: "Returning Leads", caption: "Leads returning again", field: "returningLeads" },
  {
    key: "returningnofollowup",
    title: "Returning No Followup Leads",
    caption: "Returned leads but no future followups",
    field: "returningNoFollowupLeads",
  },
  { key: "overdue", title: "Over Due Task Leads", caption: "Leads with overdue followups", field: "overdueTaskLeads" },
] as const;

const fmt = (n: number) => new Intl.NumberFormat("en-IN").format(n);
const pct = (n: number) => `${Number(n.toFixed(2))}%`;

export function LeadsOverview({
  data,
  loading,
  view,
  onView,
  scope,
  onScope,
  card,
  onCard,
  stageFilter,
  onStage,
}: {
  data: Overview | null;
  loading: boolean;
  view: string;
  onView: (v: string) => void;
  scope: TeamAgentValue;
  onScope: (v: TeamAgentValue) => void;
  card: string;
  onCard: (k: string) => void;
  stageFilter: string;
  onStage: (key: string) => void;
}) {
  const total = data?.total ?? 0;
  const slices = (data?.stages ?? []).filter((s) => s.count > 0);
  return (
    <>
      <BdCard bodyClassName="p-0">
        <div className="flex flex-wrap items-center gap-4 border-b border-[#eef0f6] px-5 py-4">
          <BdSelect
            className="w-[320px] max-w-full"
            value={view}
            onChange={(v) => onView(v || "all")}
            options={VIEW_OPTIONS}
            placeholder="All Leads"
          />
          <TeamAgentSelects value={scope} onChange={onScope} selectClassName="!w-[320px] max-w-full" />
        </div>
        <div className="flex flex-wrap items-center gap-8 px-8 py-6">
          <div className="relative size-[190px] shrink-0">
            {slices.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={slices}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={58}
                    outerRadius={92}
                    stroke="#fff"
                    strokeWidth={2}
                    startAngle={90}
                    endAngle={-270}
                    isAnimationActive={false}
                    onClick={(_, i) => onStage(slices[i].key)}
                  >
                    {slices.map((s) => (
                      <Cell key={s.key} fill={s.color} className="cursor-pointer outline-none" />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: number, _n, p) => [`${fmt(v)} (${pct((v / Math.max(total, 1)) * 100)})`, p?.payload?.label]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex size-full items-center justify-center rounded-full border-[20px] border-[#eef0f6] text-[12px] text-[#8b90a0]">
                {loading ? "Loading…" : "No leads"}
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[30px] leading-none text-[#2b2f3a]">{loading && !data ? "…" : fmt(total)}</p>
            <p className="mt-2 text-[18px] text-[#2b2f3a]">Total</p>
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-4">
              {(data?.stages ?? []).map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => onStage(s.key)}
                  title={`Show ${s.label} leads`}
                  className={cn(
                    "flex items-stretch gap-2 rounded-[2px] text-left transition hover:bg-[#f4f6fb]",
                    stageFilter === s.key && "bg-[#eef1fa]",
                  )}
                >
                  <span className="w-[3px] shrink-0 rounded-full" style={{ background: s.color }} />
                  <span className="block text-center">
                    <span className="block text-[16px] leading-tight text-[#2b2f3a]">{fmt(s.count)}</span>
                    <span className="block text-[11.5px] uppercase leading-tight text-[#5a6072]">{s.label}</span>
                    <span className="block text-[14px] leading-tight text-[#6b7186]">{pct(s.pct)}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </BdCard>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {CARDS.map((c) => (
          <BdStatCard
            key={c.key}
            title={c.title}
            value={loading && !data ? "…" : (data?.kpis[c.field] ?? 0)}
            caption={c.caption}
            active={card === c.key}
            onClick={() => onCard(card === c.key ? "" : c.key)}
          />
        ))}
      </div>
    </>
  );
}
