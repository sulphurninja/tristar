"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, CalendarCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { NewVisitSheet } from "@/components/visits/NewVisitSheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageShell, PageBody } from "@/components/shared/PageShell";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { formatPhone } from "@/lib/utils";

interface Visit {
  _id: string;
  scheduledAt: string;
  durationMinutes?: number;
  mode: "in_person" | "virtual" | "phygital";
  status: string;
  leadId?: { _id: string; contact?: { name?: string; primaryPhone?: string }; leadNumber?: string };
  projectId?: { _id: string; name?: string; code?: string; location?: { city?: string } };
  assignedTo?: { _id: string; name?: string };
}

const STATUS_TONE: Record<
  string,
  { label: string; tone: "neutral" | "info" | "primary" | "success" | "warning" | "danger" }
> = {
  planned: { label: "Planned", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "info" },
  in_progress: { label: "In progress", tone: "primary" },
  done: { label: "Done", tone: "success" },
  no_show: { label: "No show", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "danger" },
  rescheduled: { label: "Rescheduled", tone: "warning" },
};

export default function VisitsPage() {
  const searchParams = useSearchParams();
  const defaultLead = searchParams.get("leadId") ?? undefined;
  const initialOpenNew = !!defaultLead || searchParams.get("new") === "1";

  const [visits, setVisits] = useState<Visit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(initialOpenNew);
  const [range, setRange] = useState<"upcoming" | "today" | "past" | "all">("upcoming");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [projectId, setProjectId] = useState("all");
  const [mode, setMode] = useState("all");
  const [projects, setProjects] = useState<Array<{ _id: string; name: string }>>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const params = useMemo(() => {
    const u = new URLSearchParams();
    u.set("range", range);
    if (status !== "all") u.set("status", status);
    if (q) u.set("q", q);
    if (projectId !== "all") u.set("projectId", projectId);
    if (mode !== "all") u.set("mode", mode);
    u.set("limit", String(pageSize));
    u.set("skip", String((page - 1) * pageSize));
    return u.toString();
  }, [range, status, q, projectId, mode, page, pageSize]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/visits?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setVisits(d.visits ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [range, status, q, projectId, mode, pageSize]);

  useEffect(() => {
    fetch("/api/projects?limit=100", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []));
  }, []);

  const updateStatus = async (id: string, next: string) => {
    const res = await fetch(`/api/visits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (res.ok) {
      toast.success(`Marked ${next.replace("_", " ")}`);
      load();
    } else {
      toast.error("Couldn't update");
    }
  };

  return (
    <PageShell>
      <PageBody>
        <FilterBar
          actions={
            <>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setQ("");
                  setStatus("all");
                  setProjectId("all");
                  setMode("all");
                  setRange("upcoming");
                }}
              >
                Clear
              </Button>
              <Button size="sm" className="h-9 gap-1.5" onClick={() => setOpenNew(true)}>
                <Plus className="size-3.5" />
                Schedule visit
              </Button>
            </>
          }
        >
          <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
            <TabsList>
              <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
              <TabsTrigger value="today">Today</TabsTrigger>
              <TabsTrigger value="past">Past</TabsTrigger>
              <TabsTrigger value="all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search lead name / phone…"
            className="h-9 w-56"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_TONE).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={projectId} onValueChange={setProjectId}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              {projects.map((p) => (
                <SelectItem key={p._id} value={p._id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={mode} onValueChange={setMode}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modes</SelectItem>
              <SelectItem value="in_person">In person</SelectItem>
              <SelectItem value="virtual">Virtual</SelectItem>
              <SelectItem value="phygital">Phygital</SelectItem>
            </SelectContent>
          </Select>
        </FilterBar>

        <DataTableShell
          title="Site visits"
          count={total}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        >
          {loading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-slate-100" />
              ))}
            </div>
          ) : visits.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<CalendarCheck className="size-5 text-emerald-600" />}
                title="No visits"
                description="Schedule a site visit for a lead."
                action={
                  <Button onClick={() => setOpenNew(true)} className="gap-1.5">
                    <Plus className="size-4" />
                    Schedule visit
                  </Button>
                }
              />
            </div>
          ) : (
            <TableRoot>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Schedule</Th>
                  <Th>Lead</Th>
                  <Th>Mobile</Th>
                  <Th>Project</Th>
                  <Th>Assigned</Th>
                  <Th>Mode</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {visits.map((v, i) => {
                  const tone = STATUS_TONE[v.status] ?? STATUS_TONE.planned;
                  return (
                    <tr key={v._id} className="hover:bg-slate-50/80">
                      <Td className="text-slate-400">{(page - 1) * pageSize + i + 1}</Td>
                      <Td className="whitespace-nowrap text-[12.5px]">
                        {new Date(v.scheduledAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </Td>
                      <Td className="font-medium text-emerald-700">
                        {v.leadId?.contact?.name ?? "—"}
                      </Td>
                      <Td className="tabular-nums">
                        {v.leadId?.contact?.primaryPhone
                          ? formatPhone(v.leadId.contact.primaryPhone)
                          : "—"}
                      </Td>
                      <Td>{v.projectId?.name ?? "—"}</Td>
                      <Td>{v.assignedTo?.name ?? "—"}</Td>
                      <Td className="capitalize">{v.mode.replace("_", " ")}</Td>
                      <Td>
                        <StatusPill tone={tone.tone} dot>
                          {tone.label}
                        </StatusPill>
                      </Td>
                      <Td>
                        <div className="flex justify-end gap-1">
                          {v.status === "planned" || v.status === "confirmed" ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7"
                                onClick={() => updateStatus(v._id, "done")}
                              >
                                Done
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-red-600"
                                onClick={() => updateStatus(v._id, "cancelled")}
                              >
                                Cancel
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableRoot>
          )}
        </DataTableShell>
      </PageBody>
      <NewVisitSheet
        open={openNew}
        onOpenChange={setOpenNew}
        onCreated={load}
        defaultLeadId={defaultLead}
      />
    </PageShell>
  );
}
