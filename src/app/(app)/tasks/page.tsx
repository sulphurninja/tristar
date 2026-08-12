"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PageShell, PageBody, Section } from "@/components/shared/PageShell";
import { MetricStrip } from "@/components/shared/MetricStrip";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddTaskDialog } from "@/components/tasks/AddTaskDialog";

interface TaskRow {
  _id: string;
  title: string;
  type: string;
  status: string;
  scheduleAt?: string;
  remark?: string;
  createdAt: string;
  leadId?: { contact?: { name?: string; primaryPhone?: string }; leadNumber?: string } | null;
  assignedTo?: { name?: string } | null;
  assignedBy?: { name?: string } | null;
}

export default function TasksPage() {
  const searchParams = useSearchParams();
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [total, setTotal] = useState(0);
  const [stats, setStats] = useState({ today: 0, upcoming: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [range, setRange] = useState("today");
  const [type, setType] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [agents, setAgents] = useState<Array<{ _id: string; name: string }>>([]);
  const [openAdd, setOpenAdd] = useState(false);
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
    if (status !== "all") u.set("status", status);
    if (type !== "all") u.set("type", type);
    if (assignee !== "all") u.set("assignedTo", assignee);
    if (range && range !== "all") u.set("range", range);
    fetch(`/api/tasks?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setTasks(d.tasks ?? []);
        setTotal(d.total ?? 0);
        setStats(d.stats ?? { today: 0, upcoming: 0, pending: 0, completed: 0 });
      })
      .finally(() => setLoading(false));
  }, [q, status, range, type, assignee, page, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    fetch("/api/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAgents(d.users ?? []));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, status, range, type, assignee, pageSize]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setOpenAdd(true);
  }, [searchParams]);

  async function markDone(id: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    load();
  }

  return (
    <PageShell>
      <PageBody>
        <MetricStrip
          items={[
            { key: "today", label: "Today's tasks", value: stats.today },
            { key: "upcoming", label: "Upcoming", value: stats.upcoming, tone: "primary" },
            { key: "pending", label: "Pending", value: stats.pending, tone: "warning" },
            { key: "completed", label: "Completed", value: stats.completed },
            { key: "total", label: "In view", value: total, tone: "muted" },
          ]}
          className="lg:grid-cols-5"
        />

        <Section>
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
                    setStatus("all");
                    setRange("today");
                    setType("all");
                    setAssignee("all");
                  }}
                >
                  Clear
                </Button>
                <Button size="sm" className="h-9 gap-1" onClick={() => setOpenAdd(true)}>
                  <Plus className="size-3.5" />
                  Add task
                </Button>
              </>
            }
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search tasks…"
              className="h-9 w-56"
            />
            <Select value={range} onValueChange={setRange}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Date range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="all">All dates</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="upcoming">Upcoming</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="call">Call</SelectItem>
                <SelectItem value="meeting">Meeting</SelectItem>
                <SelectItem value="follow_up">Follow-up</SelectItem>
                <SelectItem value="site_visit">Site visit</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            <Select value={assignee} onValueChange={setAssignee}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Assignee" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All agents</SelectItem>
                {agents.map((a) => (
                  <SelectItem key={a._id} value={a._id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterBar>
        </Section>

        <DataTableShell
          title="Tasks"
          count={total}
          search={q}
          onSearchChange={setQ}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        >
          {loading ? (
            <div className="h-40 animate-pulse bg-slate-50" />
          ) : tasks.length === 0 ? (
            <EmptyState
              title="No tasks found"
              description="Create a follow-up or clear filters."
              action={
                <Button onClick={() => setOpenAdd(true)} className="gap-1.5">
                  <Plus className="size-4" />
                  Add task
                </Button>
              }
            />
          ) : (
            <TableRoot>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Created</Th>
                  <Th>Lead</Th>
                  <Th>Mobile</Th>
                  <Th>Type</Th>
                  <Th>Assigned by</Th>
                  <Th>Assigned to</Th>
                  <Th>Schedule</Th>
                  <Th>Title</Th>
                  <Th>Remark</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {tasks.map((t, i) => (
                  <tr key={t._id} className="hover:bg-slate-50/80">
                    <Td className="tabular-nums text-slate-400">
                      {(page - 1) * pageSize + i + 1}
                    </Td>
                    <Td className="whitespace-nowrap text-[12px] text-slate-500">
                      {new Date(t.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </Td>
                    <Td>
                      <span className="font-medium text-emerald-700">
                        {t.leadId?.contact?.name ?? "—"}
                      </span>
                    </Td>
                    <Td className="tabular-nums">
                      {t.leadId?.contact?.primaryPhone ?? "—"}
                    </Td>
                    <Td>
                      <StatusPill tone="info">{t.type.replace(/_/g, " ")}</StatusPill>
                    </Td>
                    <Td>{t.assignedBy?.name ?? "—"}</Td>
                    <Td>{t.assignedTo?.name ?? "—"}</Td>
                    <Td className="whitespace-nowrap text-[12px]">
                      {t.scheduleAt
                        ? new Date(t.scheduleAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </Td>
                    <Td className="max-w-[200px] truncate font-medium">{t.title}</Td>
                    <Td className="max-w-[140px] truncate text-slate-500">{t.remark ?? "—"}</Td>
                    <Td>
                      {t.status !== "completed" ? (
                        <Button size="sm" variant="outline" className="h-7" onClick={() => markDone(t._id)}>
                          Done
                        </Button>
                      ) : (
                        <StatusPill tone="success">Done</StatusPill>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableRoot>
          )}
        </DataTableShell>
      </PageBody>
      <AddTaskDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={load} />
    </PageShell>
  );
}
