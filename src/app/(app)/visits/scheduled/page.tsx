"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CalendarCheck,
  Download,
  Filter,
  Pencil,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { formatNumber } from "@/lib/utils";

interface PlannedVisit {
  _id: string;
  scheduledAt: string;
  durationMinutes?: number;
  status: string;
  description?: string;
  leadId?: {
    _id: string;
    contact?: { name?: string; primaryPhone?: string };
    description?: string;
  };
  projectId?: { _id: string; name?: string };
  assignedToName?: string;
  assignedTo?: { _id: string; name?: string };
}

export default function SVPDashboardPage() {
  const [items, setItems] = useState<PlannedVisit[]>([]);
  const [visited, setVisited] = useState(0);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"today" | "tomorrow" | "week" | "all">("today");

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ range, status: "planned,confirmed" });
    fetch(`/api/visits/scheduled?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.visits ?? []);
        setVisited(d.visited ?? 0);
      })
      .finally(() => setLoading(false));
  }, [range]);

  const exportCsv = () => {
    const rows = [
      ["Name", "Scheduled Date", "Day", "Time", "Assigned To", "Project", "Description"],
      ...items.map((v) => {
        const d = new Date(v.scheduledAt);
        return [
          v.leadId?.contact?.name ?? "",
          d.toLocaleDateString("en-IN"),
          d.toLocaleDateString("en-IN", { weekday: "long" }),
          d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          v.assignedToName ?? v.assignedTo?.name ?? "",
          v.projectId?.name ?? "",
          v.description ?? v.leadId?.description ?? "",
        ];
      }),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${(c ?? "").toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `svp-${range}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Header */}
      <div className="border-b border-slate-200/70 px-7 py-6 lg:px-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-[20px] font-bold tracking-tight text-slate-900">
              Scheduled Visit Planned Report
            </h1>
            <p className="mt-1 text-[12.5px] text-slate-500">
              All site visits planned for the selected window.
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 rounded-lg border border-slate-200 bg-white p-3">
            <span className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
              Visited
            </span>
            <span className="text-[22px] font-bold tabular-nums text-emerald-700">
              {formatNumber(visited)}
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="sticky top-[72px] z-20 flex items-center gap-3 border-b border-slate-200/70 bg-white px-7 py-3 lg:px-10">
        <Button variant="outline" className="gap-1.5" onClick={exportCsv}>
          <Download className="size-4" strokeWidth={1.75} />
          Export
        </Button>
        <Button asChild variant="outline" className="gap-1.5">
          <Link href="/visits">
            <CalendarDays className="size-4" strokeWidth={1.75} />
            Calendar View
          </Link>
        </Button>
        <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <TabsList>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="tomorrow">Tomorrow</TabsTrigger>
            <TabsTrigger value="week">This week</TabsTrigger>
            <TabsTrigger value="all">All upcoming</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" className="ml-auto gap-1.5">
          <Filter className="size-4" strokeWidth={1.75} />
          Advanced search
        </Button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-2 p-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-7 py-12 lg:px-10">
          <EmptyState
            icon={<CalendarCheck className="size-5 text-emerald-600" strokeWidth={1.75} />}
            title="No planned visits in this window"
            description="Once visits are scheduled they'll show here, day by day."
            action={
              <Button asChild>
                <Link href="/visits?new=1">Schedule a visit</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-[13.5px]">
            <thead className="sticky top-[136px] z-10 bg-sky-50/80 backdrop-blur">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                <th className="px-7 py-3 lg:px-10">Name</th>
                <th className="px-3 py-3">Scheduled Date</th>
                <th className="px-3 py-3">Day</th>
                <th className="px-3 py-3">Time</th>
                <th className="px-3 py-3">Assigned To</th>
                <th className="px-3 py-3">Project</th>
                <th className="px-3 py-3">Description</th>
                <th className="px-3 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((v) => {
                const d = new Date(v.scheduledAt);
                return (
                  <tr key={v._id} className="border-t border-slate-100 hover:bg-slate-50/60">
                    <td className="px-7 py-3 lg:px-10">
                      <Link
                        href={`/leads?leadId=${v.leadId?._id}`}
                        className="font-semibold text-emerald-700 hover:underline"
                      >
                        {v.leadId?.contact?.name ?? "Unknown lead"}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {d.toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {d.toLocaleDateString("en-IN", { weekday: "long" })}
                    </td>
                    <td className="px-3 py-3 text-slate-700 tabular-nums">
                      {d.toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        hour12: false,
                      })}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      {v.assignedToName ?? v.assignedTo?.name ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-slate-700">{v.projectId?.name ?? "—"}</td>
                    <td className="px-3 py-3 max-w-xs">
                      <p className="line-clamp-2 text-[12px] text-slate-600">
                        {v.description ?? v.leadId?.description ?? "—"}
                      </p>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Button asChild variant="ghost" size="sm" className="h-7 gap-1">
                        <Link href={`/leads?leadId=${v.leadId?._id}`}>
                          <Pencil className="size-3.5" strokeWidth={1.75} />
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
