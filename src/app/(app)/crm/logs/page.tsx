"use client";

import { useCallback, useEffect, useState } from "react";
import { PageShell, PageBody, Section, Surface } from "@/components/shared/PageShell";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
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

interface LogRow {
  _id: string;
  type: string;
  description?: string;
  actorName?: string;
  occurredAt: string;
  leadId?: {
    contact?: { name?: string };
    stage?: string;
    source?: { primary?: string };
  } | null;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [report, setReport] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(() => {
    setLoading(true);
    const u = new URLSearchParams({
      limit: String(pageSize),
      skip: String((page - 1) * pageSize),
    });
    if (q) u.set("q", q);
    if (type !== "all") u.set("type", type);
    fetch(`/api/crm/logs?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setLogs(d.logs ?? []);
        setTotal(d.total ?? 0);
        setReport(d.report ?? {});
      })
      .finally(() => setLoading(false));
  }, [q, type, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [q, type, pageSize]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  const reportItems = [
    ["Lead added", report.lead_created ?? 0],
    ["Lead assigned", report.lead_assigned ?? 0],
    ["Stage changed", report.stage_changed ?? 0],
    ["Calls made", report.call_made ?? 0],
    ["WhatsApp sent", report.whatsapp_sent ?? 0],
    ["Site visit scheduled", report.site_visit_scheduled ?? 0],
    ["Merged", report.merged ?? 0],
  ];

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
            placeholder="Search logs…"
            className="h-9 w-48"
          />
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Log type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="lead_created">Lead added</SelectItem>
              <SelectItem value="stage_changed">Stage changed</SelectItem>
              <SelectItem value="call_made">Calls</SelectItem>
              <SelectItem value="site_visit_scheduled">Site visits</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        <Section title="Lead logs report">
          <Surface className="grid gap-0 sm:grid-cols-3">
            {[0, 1, 2].map((col) => (
              <ul
                key={col}
                className="space-y-2.5 border-b border-slate-100 px-5 py-4 sm:border-b-0 sm:border-r sm:last:border-r-0"
              >
                {reportItems.slice(col * 3, col * 3 + 3).map(([label, value]) => (
                  <li key={String(label)} className="flex justify-between gap-3 text-[13px]">
                    <span className="border-l-2 border-emerald-500 pl-2.5 text-slate-600">
                      {label}
                    </span>
                    <span className="font-semibold tabular-nums">{value as number}</span>
                  </li>
                ))}
              </ul>
            ))}
          </Surface>
        </Section>

        <DataTableShell
          title="Logs"
          count={total}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        >
          {loading ? (
            <div className="h-32 animate-pulse bg-slate-50" />
          ) : logs.length === 0 ? (
            <EmptyState title="No data found" description="Logs will appear as the team works leads." />
          ) : (
            <TableRoot>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Date</Th>
                  <Th>Details</Th>
                  <Th>Executive</Th>
                  <Th>Stage</Th>
                  <Th>Source</Th>
                  <Th>Logs type</Th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log._id} className="hover:bg-slate-50/80">
                    <Td className="text-slate-400">{(page - 1) * pageSize + i + 1}</Td>
                    <Td className="whitespace-nowrap text-[12px] text-slate-500">
                      {new Date(log.occurredAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </Td>
                    <Td className="max-w-sm">
                      <p className="font-medium text-slate-800">
                        {log.leadId?.contact?.name ?? "System"}
                      </p>
                      <p className="truncate text-[12px] text-slate-500">
                        {log.description ?? log.type.replace(/_/g, " ")}
                      </p>
                    </Td>
                    <Td>{log.actorName ?? "—"}</Td>
                    <Td>{log.leadId?.stage?.replace(/_/g, " ") ?? "—"}</Td>
                    <Td>{log.leadId?.source?.primary ?? "—"}</Td>
                    <Td className="capitalize">{log.type.replace(/_/g, " ")}</Td>
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
