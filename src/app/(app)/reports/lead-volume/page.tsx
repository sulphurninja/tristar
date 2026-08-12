"use client";

import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { ReportShell } from "@/components/reports/ReportShell";
import { useReportFilters } from "@/hooks/useReportFilters";
import { formatNumber } from "@/lib/utils";

interface DayPoint {
  date: string;
  leads: number;
  visits: number;
  conversions: number;
}

export default function LeadVolumeReportPage() {
  const { range, setRange, from, to, onDatesChange, query, ready } = useReportFilters("30d");
  const [days, setDays] = useState<DayPoint[]>([]);
  const [totals, setTotals] = useState({ leads: 0, visits: 0, conversions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    fetch(`/api/reports/lead-volume?${query}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setDays(d.days ?? []);
        setTotals(d.totals ?? { leads: 0, visits: 0, conversions: 0 });
      })
      .finally(() => setLoading(false));
  }, [query, ready]);

  const exportCsv = () => {
    const csv = [
      "Date,Leads Generated,Visits Done,Conversions",
      ...days.map((d) => `${d.date},${d.leads},${d.visits},${d.conversions}`),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lead-volume-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ReportShell
      title="Lead Volume Report"
      description="Leads generated, visits done and conversions over the selected window."
      range={range}
      onRangeChange={setRange}
      from={from}
      to={to}
      onDatesChange={onDatesChange}
      onExport={exportCsv}
    >
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Tile label="Leads Generated" value={totals.leads} tone="emerald" />
        <Tile label="Visits Done" value={totals.visits} tone="sky" />
        <Tile label="Conversions" value={totals.conversions} tone="amber" />
      </div>

      <div className="mt-6 rounded-xl border border-slate-200/70 bg-white p-4">
        {loading ? (
          <div className="h-72 animate-pulse rounded-lg bg-slate-100" />
        ) : days.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-[13px] text-slate-500">
            No data for this window.
          </div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <AreaChart data={days} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="leads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="visits" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="conv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(d) =>
                    new Date(d).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })
                  }
                  fontSize={11}
                  stroke="#64748b"
                />
                <YAxis fontSize={11} stroke="#64748b" allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                  }}
                  labelFormatter={(d) =>
                    new Date(d).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  }
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="leads"
                  name="Leads Generated"
                  stroke="#10b981"
                  fill="url(#leads)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="visits"
                  name="Visits Done"
                  stroke="#0ea5e9"
                  fill="url(#visits)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="conversions"
                  name="Conversions"
                  stroke="#f59e0b"
                  fill="url(#conv)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </ReportShell>
  );
}

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "emerald" | "sky" | "amber";
}) {
  const text =
    tone === "emerald"
      ? "text-emerald-700"
      : tone === "sky"
        ? "text-sky-700"
        : "text-amber-700";
  const bg =
    tone === "emerald"
      ? "bg-emerald-50"
      : tone === "sky"
        ? "bg-sky-50"
        : "bg-amber-50";
  return (
    <div className={`rounded-xl border border-slate-200/70 ${bg} px-5 py-4`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </p>
      <p className={`mt-1 text-[24px] font-bold tabular-nums ${text}`}>
        {formatNumber(value)}
      </p>
    </div>
  );
}
