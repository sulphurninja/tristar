"use client";

import { useMemo } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Surface } from "@/components/shared/PageShell";
import { formatNumber } from "@/lib/utils";

export interface StageBucket {
  key: string;
  label: string;
  color: string;
  count: number;
}

export interface LeadAnalysisData {
  total: number;
  buckets: StageBucket[];
  kpis: {
    untouchedLeads: number;
    noFollowupsLeads: number;
    returningLeads: number;
    returningNoFollowupLeads: number;
    overdueTaskLeads: number;
  };
}

interface Props {
  data: LeadAnalysisData | null;
  loading?: boolean;
  agentFilter?: string;
  onAgentFilterChange?: (v: string) => void;
  agents?: Array<{ _id: string; name: string }>;
  onBucketClick?: (key: string) => void;
}

export function LeadStageAnalysis({
  data,
  loading,
  agentFilter = "all",
  onAgentFilterChange,
  agents = [],
  onBucketClick,
}: Props) {
  const total = data?.total ?? 0;
  const buckets = data?.buckets ?? [];
  const chartData = useMemo(
    () => buckets.filter((b) => b.count > 0).map((b) => ({ name: b.label, value: b.count, color: b.color })),
    [buckets],
  );

  const kpis = [
    {
      key: "untouched",
      label: "Untouched Leads",
      value: data?.kpis.untouchedLeads ?? 0,
      hint: "Leads claimed but not contacted",
    },
    {
      key: "nofollow",
      label: "No Followups Leads",
      value: data?.kpis.noFollowupsLeads ?? 0,
      hint: "Contacted but no future followups",
    },
    {
      key: "returning",
      label: "Returning Leads",
      value: data?.kpis.returningLeads ?? 0,
      hint: "Leads returning again",
    },
    {
      key: "retnofollow",
      label: "Returning No Followup Leads",
      value: data?.kpis.returningNoFollowupLeads ?? 0,
      hint: "Returned leads but no future followups",
    },
    {
      key: "overdue",
      label: "Over Due Task Leads",
      value: data?.kpis.overdueTaskLeads ?? 0,
      hint: "Leads with overdue followups",
    },
  ];

  return (
    <div className="space-y-3">
      <Surface className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3">
          <h3 className="text-[15px] font-semibold text-slate-900">Lead Stage Analysis</h3>
          {onAgentFilterChange ? (
            <Select value={agentFilter} onValueChange={onAgentFilterChange}>
              <SelectTrigger className="h-8 w-44 text-[12.5px]">
                <SelectValue placeholder="Select Sales Agent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sales agents</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[220px_1fr]">
          <div className="relative mx-auto flex h-48 w-full max-w-[220px] items-center justify-center">
            {loading ? (
              <div className="size-40 animate-pulse rounded-full bg-slate-100" />
            ) : chartData.length ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={58}
                      outerRadius={82}
                      paddingAngle={1.5}
                      strokeWidth={0}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number | string) => formatNumber(Number(v))}
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Total
                  </p>
                  <p className="text-[22px] font-bold tabular-nums text-slate-900">
                    {formatNumber(total)}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex size-40 items-center justify-center rounded-full border-[10px] border-slate-100 text-[13px] text-slate-400">
                No data
              </div>
            )}
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {buckets.map((b) => {
              const pct = total ? ((b.count / total) * 100).toFixed(2) : "0.00";
              return (
                <button
                  key={b.key}
                  type="button"
                  onClick={() => onBucketClick?.(b.key)}
                  className="flex items-start gap-2.5 rounded-lg border border-transparent px-2 py-2 text-left transition-colors hover:border-slate-200 hover:bg-slate-50"
                >
                  <span
                    className="mt-0.5 h-10 w-1 shrink-0 rounded-full"
                    style={{ background: b.color }}
                  />
                  <span className="min-w-0">
                    <span className="block text-[18px] font-bold tabular-nums text-slate-900">
                      {loading ? "—" : formatNumber(b.count)}
                    </span>
                    <span className="block truncate text-[12px] font-medium text-slate-600">
                      {b.label}
                    </span>
                    <span className="block text-[11px] tabular-nums text-slate-400">{pct}%</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </Surface>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {kpis.map((k) => (
          <Surface key={k.key} className="p-4">
            <p className="text-[12px] font-semibold text-slate-700">{k.label}</p>
            <p className="mt-2 text-[26px] font-bold tabular-nums tracking-tight text-slate-900">
              {loading ? "—" : formatNumber(k.value)}
            </p>
            <p className="mt-1 text-[11.5px] leading-snug text-slate-500">{k.hint}</p>
          </Surface>
        ))}
      </div>
    </div>
  );
}
