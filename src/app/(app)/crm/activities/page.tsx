"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell, PageBody, Section, Surface } from "@/components/shared/PageShell";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { MetricStrip } from "@/components/shared/MetricStrip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { EmptyState } from "@/components/shared/EmptyState";

interface Activity {
  _id: string;
  type: string;
  description?: string;
  actorName?: string;
  occurredAt: string;
  leadId?: { contact?: { name?: string }; leadNumber?: string; stage?: string } | null;
}

export default function ActivitiesPage() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [total, setTotal] = useState(0);
  const [range, setRange] = useState("today");
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [report, setReport] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(() => {
    setLoading(true);
    const u = new URLSearchParams({
      range,
      limit: String(pageSize),
      skip: String((page - 1) * pageSize),
    });
    if (q) u.set("q", q);
    if (type !== "all") u.set("types", type);
    fetch(`/api/crm/activities?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setActivities(d.activities ?? []);
        setTotal(d.total ?? 0);
        setReport(d.report ?? {});
      })
      .finally(() => setLoading(false));
  }, [range, q, type, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [range, q, type, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <PageShell>
      <PageBody>
        <FilterBar
          actions={
            <>
              <Button size="sm" variant="outline" onClick={load}>
                Search
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setQ("");
                  setType("all");
                  setRange("today");
                }}
              >
                Clear
              </Button>
            </>
          }
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search activities…"
            className="h-9 w-56"
          />
          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">Last 7 days</SelectItem>
              <SelectItem value="month">Last 30 days</SelectItem>
              <SelectItem value="all">All time</SelectItem>
            </SelectContent>
          </Select>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="call_made,call_missed">Calls</SelectItem>
              <SelectItem value="meeting_logged">Meetings</SelectItem>
              <SelectItem value="site_visit_scheduled,site_visit_completed">Site visits</SelectItem>
              <SelectItem value="stage_changed">Stage changes</SelectItem>
              <SelectItem value="whatsapp_sent,whatsapp_received">WhatsApp</SelectItem>
              <SelectItem value="note_added">Notes</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        <Section title="Lead activities report">
          <MetricStrip
            className="lg:grid-cols-4"
            items={[
              { key: "tasks", label: "Stage changes", value: report.stageChanges ?? 0 },
              { key: "visits", label: "Site visits", value: report.siteVisitScheduled ?? 0 },
              { key: "calls", label: "Calls logged", value: report.offlineCalls ?? 0 },
              { key: "done", label: "Visit activities", value: report.siteVisitCompleted ?? 0 },
            ]}
          />
          <Surface className="mt-3 grid gap-0 sm:grid-cols-3">
            {[
              [
                ["Meetings", report.meetings ?? 0],
                ["Site visit scheduled", report.siteVisitScheduled ?? 0],
                ["Site visit completed", report.siteVisitCompleted ?? 0],
              ],
              [
                ["Calls logged", report.offlineCalls ?? 0],
                ["Calls to lead", report.callsToLead ?? 0],
                ["Stage changes", report.stageChanges ?? 0],
              ],
              [
                ["WhatsApp", report.whatsapp ?? 0],
                ["Total activities", total],
              ],
            ].map((col, i) => (
              <ul
                key={i}
                className="space-y-2.5 border-b border-slate-100 px-5 py-4 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0"
              >
                {col.map(([label, value]) => (
                  <li key={String(label)} className="flex justify-between gap-3 text-[13px]">
                    <span className="text-slate-600">{label}</span>
                    <span className="font-semibold tabular-nums">{value as number}</span>
                  </li>
                ))}
              </ul>
            ))}
          </Surface>
        </Section>

        <DataTableShell
          title="Activities"
          count={total}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        >
          {loading ? (
            <div className="h-32 animate-pulse bg-slate-50" />
          ) : activities.length === 0 ? (
            <EmptyState title="No activities" description="Try a wider date range." />
          ) : (
            <TableRoot>
              <thead>
                <tr>
                  <Th>Date</Th>
                  <Th>Lead</Th>
                  <Th>Type</Th>
                  <Th>Details</Th>
                  <Th>Executive</Th>
                  <Th>Stage</Th>
                </tr>
              </thead>
              <tbody>
                {activities.map((a) => (
                  <tr key={a._id} className="hover:bg-slate-50/80">
                    <Td className="whitespace-nowrap text-[12px] text-slate-500">
                      {new Date(a.occurredAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </Td>
                    <Td className="font-medium text-emerald-700">
                      {a.leadId?.contact?.name ?? "—"}
                    </Td>
                    <Td className="capitalize">{a.type.replace(/_/g, " ")}</Td>
                    <Td className="max-w-xs truncate">{a.description ?? "—"}</Td>
                    <Td>{a.actorName ?? "—"}</Td>
                    <Td>{a.leadId?.stage?.replace(/_/g, " ") ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </TableRoot>
          )}
        </DataTableShell>
      </PageBody>
    </PageShell>
  );
}
