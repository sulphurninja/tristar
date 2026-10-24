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
import { ReportShell, ReportTable } from "@/components/reports/ReportShell";
import { BdCard, BdKpi } from "@/components/bd";
import { Users, MapPin, Handshake } from "lucide-react";
import { useReportFilters } from "@/hooks/useReportFilters";
import { downloadCsv } from "@/lib/csv";
import { formatNumber } from "@/lib/utils";

interface DayPoint {
  date: string;
  leads: number;
  visits: number;
  conversions: number;
}

const fmtDay = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

export default function LeadVolumeReportPage() {
  const f = useReportFilters("30d");
  const [days, setDays] = useState<DayPoint[]>([]);
  const [totals, setTotals] = useState({ leads: 0, visits: 0, conversions: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!f.ready) return;
    setLoading(true);
    let live = true;
    fetch(`/api/reports/lead-volume?${f.query}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!live) return;
        setDays(d.days ?? []);
        setTotals(d.totals ?? { leads: 0, visits: 0, conversions: 0 });
      })
      .catch(() => undefined)
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [f.query, f.ready]);

  return (
    <ReportShell
      title="Lead Volume Report"
      description="Leads generated, visits done and conversions over the selected window."
      range={f.range}
      onRangeChange={f.setRange}
      from={f.from}
      to={f.to}
      onDatesChange={f.onDatesChange}
      scope={f.scope}
      onScopeChange={f.setScope}
      onReset={f.reset}
      onExport={() =>
        downloadCsv(`lead-volume-${f.range}`, [
          ["Date", "Leads Generated", "Visits Done", "Conversions"],
          ...days.map((d) => [d.date, d.leads, d.visits, d.conversions]),
          ["Total", totals.leads, totals.visits, totals.conversions],
        ])
      }
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <BdKpi label="Leads Generated" value={formatNumber(totals.leads)} icon={Users} tone="violet" />
        <BdKpi label="Visits Done" value={formatNumber(totals.visits)} icon={MapPin} tone="blue" />
        <BdKpi label="Conversions" value={formatNumber(totals.conversions)} icon={Handshake} tone="green" />
      </div>

      <BdCard title="Lead Volume">
        {loading ? (
          <div className="h-72 animate-pulse rounded bg-[#f0f2f8]" />
        ) : days.length === 0 ? (
          <div className="flex h-72 items-center justify-center text-[13px] text-[#8b90a0]">No data for this window.</div>
        ) : (
          <div className="h-72 w-full">
            <ResponsiveContainer>
              <AreaChart data={days} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="lv-leads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#5471e4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#5471e4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 3" stroke="#dfe3ee" />
                <XAxis dataKey="date" tickFormatter={fmtDay} fontSize={11} stroke="#8b90a0" />
                <YAxis fontSize={11} stroke="#8b90a0" allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: 3, border: "1px solid #e6e9f2", fontSize: 12 }} labelFormatter={(d) => fmtDay(String(d))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area type="monotone" dataKey="leads" name="Leads Generated" stroke="#5471e4" fill="url(#lv-leads)" strokeWidth={2} />
                <Area type="monotone" dataKey="visits" name="Visits Done" stroke="#37b24d" fill="none" strokeWidth={2} />
                <Area type="monotone" dataKey="conversions" name="Conversions" stroke="#f39a3d" fill="none" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </BdCard>

      <ReportTable
        loading={loading}
        columns={["Date", "Leads Generated", "Visits Done", "Conversions"]}
        rows={[...days].reverse().map((d) => [d.date, d.leads, d.visits, d.conversions])}
        totalRow={["Total", totals.leads, totals.visits, totals.conversions]}
      />
    </ReportShell>
  );
}
