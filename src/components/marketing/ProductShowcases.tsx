"use client";

import { Search, Filter, Plus, Phone, CalendarCheck } from "lucide-react";
import { StatusPill } from "@/components/shared/StatusPill";
import { MetricStrip } from "@/components/shared/MetricStrip";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Compact CRM chrome used on landing / auth — real StatusPill, MetricStrip, buttons. */

export function LeadTableShowcase({ className }: { className?: string }) {
  const rows = [
    { name: "Ananya Mehta", stage: "Hot", tone: "warning" as const, project: "Tristar Heights", agent: "Rahul" },
    { name: "Vikram Shah", stage: "Site Visit", tone: "primary" as const, project: "Tristar Avenue", agent: "Priya" },
    { name: "Neha Kapoor", stage: "Interested", tone: "info" as const, project: "Tristar Park", agent: "Amit" },
    { name: "Suresh Iyer", stage: "New", tone: "neutral" as const, project: "Tristar Heights", agent: "Unassigned" },
  ];

  return (
    <div className={cn("overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm", className)}>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/70 px-3 py-2.5">
        <div className="relative min-w-[160px] flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
          <div className="flex h-8 items-center rounded-md border border-slate-200 bg-white pl-8 pr-3 text-[12.5px] text-slate-400">
            Search name, phone…
          </div>
        </div>
        <div className="flex h-8 items-center rounded-md border border-slate-200 bg-white px-2.5 text-[12px] text-slate-600">
          All stages
        </div>
        <Button size="sm" variant="outline" className="h-8 gap-1 pointer-events-none">
          <Filter className="size-3.5" /> More
        </Button>
        <Button size="sm" className="h-8 gap-1 pointer-events-none">
          <Plus className="size-3.5" /> New lead
        </Button>
      </div>
      <table className="w-full text-left text-[12.5px]">
        <thead>
          <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-400">
            <th className="px-3 py-2 font-semibold">Lead</th>
            <th className="px-3 py-2 font-semibold">Stage</th>
            <th className="hidden px-3 py-2 font-semibold sm:table-cell">Project</th>
            <th className="hidden px-3 py-2 font-semibold md:table-cell">Agent</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-b border-slate-50 last:border-0">
              <td className="px-3 py-2.5 font-medium text-emerald-700">{r.name}</td>
              <td className="px-3 py-2.5">
                <StatusPill tone={r.tone} dot>
                  {r.stage}
                </StatusPill>
              </td>
              <td className="hidden px-3 py-2.5 text-slate-600 sm:table-cell">{r.project}</td>
              <td className="hidden px-3 py-2.5 text-slate-500 md:table-cell">{r.agent}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function PipelineShowcase({ className }: { className?: string }) {
  const cols = [
    {
      title: "New",
      items: [
        { name: "Karan Desai", meta: "Walk-in" },
        { name: "Meera Joshi", meta: "Website" },
      ],
    },
    {
      title: "Warm",
      items: [
        { name: "Arjun Nair", meta: "CP · Apex Realty" },
        { name: "Sneha Rao", meta: "Telecalling" },
      ],
    },
    {
      title: "Site Visit",
      items: [{ name: "Vikram Shah", meta: "Sat 11:00 AM" }],
    },
  ];

  return (
    <div className={cn("grid grid-cols-3 gap-2", className)}>
      {cols.map((col) => (
        <div key={col.title} className="rounded-xl border border-slate-200/80 bg-slate-50/80 p-2">
          <div className="mb-2 flex items-center justify-between px-1">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {col.title}
            </p>
            <span className="text-[11px] tabular-nums text-slate-400">{col.items.length}</span>
          </div>
          <div className="space-y-1.5">
            {col.items.map((item) => (
              <div
                key={item.name}
                className="rounded-lg border border-slate-200/80 bg-white px-2.5 py-2 shadow-xs"
              >
                <p className="text-[12.5px] font-semibold text-slate-900">{item.name}</p>
                <p className="mt-0.5 text-[11px] text-slate-500">{item.meta}</p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export function MetricsShowcase({ className }: { className?: string }) {
  return (
    <MetricStrip
      className={cn("lg:grid-cols-4", className)}
      items={[
        { key: "leads", label: "Leads today", value: 48, tone: "primary" },
        { key: "visits", label: "Visits scheduled", value: 12 },
        { key: "overdue", label: "Overdue follow-ups", value: 7, tone: "warning" },
        { key: "booked", label: "Bookings", value: 3, tone: "primary" },
      ]}
    />
  );
}

export function ReportsShowcase({ className }: { className?: string }) {
  const bars = [
    { label: "Mon", h: 40 },
    { label: "Tue", h: 65 },
    { label: "Wed", h: 48 },
    { label: "Thu", h: 82 },
    { label: "Fri", h: 70 },
    { label: "Sat", h: 55 },
    { label: "Sun", h: 30 },
  ];

  return (
    <div className={cn("rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm", className)}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Lead volume
          </p>
          <p className="mt-1 text-[22px] font-semibold tabular-nums text-slate-900">248</p>
        </div>
        <div className="flex gap-1.5">
          {["7D", "30D", "Custom"].map((p, i) => (
            <span
              key={p}
              className={cn(
                "rounded-md px-2 py-1 text-[11px] font-medium",
                i === 1 ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600",
              )}
            >
              {p}
            </span>
          ))}
        </div>
      </div>
      <div className="mt-4 flex h-28 items-end gap-2">
        {bars.map((b) => (
          <div key={b.label} className="flex flex-1 flex-col items-center gap-1">
            <div
              className="w-full rounded-t-md bg-gradient-to-t from-emerald-600 to-sky-400"
              style={{ height: `${b.h}%` }}
            />
            <span className="text-[10px] text-slate-400">{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function VisitTaskShowcase({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-2 sm:grid-cols-2", className)}>
      <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 text-emerald-700">
          <CalendarCheck className="size-4" />
          <p className="text-[12px] font-semibold">Site visit</p>
        </div>
        <p className="mt-2 text-[13.5px] font-semibold text-slate-900">Tristar Heights · 3 BHK</p>
        <p className="mt-0.5 text-[12px] text-slate-500">Sat, 11:00 AM · In person</p>
        <div className="mt-3">
          <StatusPill tone="info" dot>
            Confirmed
          </StatusPill>
        </div>
      </div>
      <div className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-sm">
        <div className="flex items-center gap-2 text-sky-700">
          <Phone className="size-4" />
          <p className="text-[12px] font-semibold">Follow-up call</p>
        </div>
        <p className="mt-2 text-[13.5px] font-semibold text-slate-900">Ananya Mehta</p>
        <p className="mt-0.5 text-[12px] text-slate-500">Today · 4:30 PM · Rahul</p>
        <div className="mt-3">
          <StatusPill tone="warning" dot>
            Pending
          </StatusPill>
        </div>
      </div>
    </div>
  );
}

export function HeroProductPlane({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-full min-h-[380px] flex-col justify-end overflow-hidden bg-gradient-to-br from-emerald-50 via-white to-sky-50",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
      <div className="relative mt-auto space-y-3 p-5 sm:p-7 lg:p-8">
        <MetricsShowcase />
        <LeadTableShowcase />
      </div>
    </div>
  );
}
