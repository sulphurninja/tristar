"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CalendarCheck, Download, CalendarDays, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageShell, PageBody, Surface } from "@/components/shared/PageShell";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ range, status: "planned,confirmed" });
    fetch(`/api/visits/scheduled?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.visits ?? []);
        setVisited(d.visited ?? 0);
        setPage(1);
      })
      .finally(() => setLoading(false));
  }, [range]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize);

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
    <PageShell>
      <PageBody>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-[18px] font-semibold text-slate-900">
              Scheduled Visit Planned Report
            </h2>
            <p className="mt-0.5 text-[13px] text-slate-500">
              All site visits planned for the selected window.
            </p>
          </div>
          <Surface className="px-4 py-2.5">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
              Visited
            </p>
            <p className="text-[22px] font-bold tabular-nums text-emerald-700">
              {formatNumber(visited)}
            </p>
          </Surface>
        </div>

        <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm">
          <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={exportCsv}>
            <Download className="size-4" strokeWidth={1.75} />
            Export
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
            <Link href="/visits">
              <CalendarDays className="size-4" strokeWidth={1.75} />
              Calendar view
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
        </div>

        <DataTableShell
          title="Planned visits"
          count={items.length}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(n) => {
            setPageSize(n);
            setPage(1);
          }}
        >
          {loading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-slate-100" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-8">
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
            <TableRoot>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Scheduled Date</Th>
                  <Th>Day</Th>
                  <Th>Time</Th>
                  <Th>Assigned To</Th>
                  <Th>Project</Th>
                  <Th>Description</Th>
                  <Th className="text-right">Action</Th>
                </tr>
              </thead>
              <tbody>
                {pageItems.map((v) => {
                  const d = new Date(v.scheduledAt);
                  return (
                    <tr key={v._id} className="hover:bg-slate-50/80">
                      <Td>
                        <Link
                          href={`/leads?leadId=${v.leadId?._id}`}
                          className="font-semibold text-emerald-700 hover:underline"
                        >
                          {v.leadId?.contact?.name ?? "Unknown lead"}
                        </Link>
                      </Td>
                      <Td>
                        {d.toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </Td>
                      <Td>{d.toLocaleDateString("en-IN", { weekday: "long" })}</Td>
                      <Td className="tabular-nums">
                        {d.toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: false,
                        })}
                      </Td>
                      <Td>{v.assignedToName ?? v.assignedTo?.name ?? "—"}</Td>
                      <Td>{v.projectId?.name ?? "—"}</Td>
                      <Td className="max-w-xs">
                        <p className="line-clamp-2 text-[12px] text-slate-600">
                          {v.description ?? v.leadId?.description ?? "—"}
                        </p>
                      </Td>
                      <Td className="text-right">
                        <Button asChild variant="ghost" size="sm" className="h-7 gap-1">
                          <Link href={`/leads?leadId=${v.leadId?._id}`}>
                            <Pencil className="size-3.5" strokeWidth={1.75} />
                          </Link>
                        </Button>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableRoot>
          )}
        </DataTableShell>
      </PageBody>
    </PageShell>
  );
}
