"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageShell, PageBody, Section, Surface } from "@/components/shared/PageShell";
import { FilterBar } from "@/components/shared/FilterBar";
import { FilterField } from "@/components/shared/FilterField";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import {
  LeadStageAnalysis,
  type LeadAnalysisData,
} from "@/components/leads/LeadStageAnalysis";
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
import { formatPhone } from "@/lib/utils";

interface Lead {
  _id: string;
  leadNumber?: string;
  contact: { name: string; primaryPhone: string; email?: string };
  stage: string;
  priority?: string;
  assignedTo?: { name?: string } | null;
  primaryProjectId?: { name?: string } | null;
  createdAt: string;
}

const STAGES = [
  "new",
  "warm",
  "hot",
  "interested",
  "site_visit_scheduled",
  "negotiating",
  "booked",
  "lost",
  "not_interested",
];

export default function ContactsPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [analysis, setAnalysis] = useState<LeadAnalysisData | null>(null);
  const [q, setQ] = useState("");
  const [stage, setStage] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [priority, setPriority] = useState("all");
  const [agents, setAgents] = useState<Array<{ _id: string; name: string }>>([]);
  const [projects, setProjects] = useState<Array<{ _id: string; name: string }>>([]);
  const [agentFilter, setAgentFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [tab, setTab] = useState<"analysis" | "list">("analysis");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  useEffect(() => {
    setPage(1);
  }, [q, stage, assignee, projectId, priority, pageSize]);

  useEffect(() => {
    fetch("/api/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAgents(d.users ?? []));
    fetch("/api/projects?limit=100", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []));
  }, []);

  useEffect(() => {
    setAnalysisLoading(true);
    const u = new URLSearchParams();
    if (agentFilter !== "all") u.set("assignedTo", agentFilter);
    fetch(`/api/leads/analysis?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) =>
        setAnalysis({
          total: d.total ?? 0,
          buckets: d.buckets ?? [],
          kpis: d.kpis ?? {
            untouchedLeads: 0,
            noFollowupsLeads: 0,
            returningLeads: 0,
            returningNoFollowupLeads: 0,
            overdueTaskLeads: 0,
          },
        }),
      )
      .finally(() => setAnalysisLoading(false));
  }, [agentFilter]);

  useEffect(() => {
    setLoading(true);
    const u = new URLSearchParams({
      limit: String(pageSize),
      skip: String((page - 1) * pageSize),
    });
    if (q) u.set("q", q);
    if (stage !== "all") u.set("stage", stage);
    if (assignee !== "all") u.set("assignedTo", assignee);
    if (projectId !== "all") u.set("projectId", projectId);
    if (priority !== "all") u.set("priority", priority);
    fetch(`/api/leads?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.leads ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [q, stage, assignee, projectId, priority, page, pageSize]);

  return (
    <PageShell>
      <PageBody>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={tab === "analysis" ? "default" : "outline"}
            onClick={() => setTab("analysis")}
          >
            Contact analysis
          </Button>
          <Button
            size="sm"
            variant={tab === "list" ? "default" : "outline"}
            onClick={() => setTab("list")}
          >
            Detailed list
          </Button>
        </div>

        <FilterBar
          advancedTitle="Advanced contact filters"
          advancedDescription="Filter the detailed list by project and priority."
          advanced={
            <>
              <FilterField label="Project">
                <Select value={projectId} onValueChange={setProjectId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All projects" />
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
              </FilterField>
              <FilterField label="Priority">
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All priorities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    <SelectItem value="vip">VIP</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
            </>
          }
          actions={
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setQ("");
                setStage("all");
                setAssignee("all");
                setProjectId("all");
                setPriority("all");
              }}
            >
              Clear
            </Button>
          }
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search contacts…"
            className="h-9 w-56"
          />
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, " ")}
                </SelectItem>
              ))}
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

        {tab === "analysis" ? (
          <Section title="Data analysis" description="Workspace contact mix by stage.">
            <LeadStageAnalysis
              data={analysis}
              loading={analysisLoading}
              agentFilter={agentFilter}
              onAgentFilterChange={setAgentFilter}
              agents={agents}
            />
            <Surface className="mt-3 p-4 text-[12.5px] text-slate-500">
              Tip: open the detailed list for searchable contacts with pagination.
            </Surface>
          </Section>
        ) : (
          <DataTableShell
            title="Contacts"
            count={total}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            pageSize={pageSize}
            onPageSizeChange={setPageSize}
          >
            {loading ? (
              <div className="h-40 animate-pulse bg-slate-50" />
            ) : (
              <TableRoot>
                <thead>
                  <tr>
                    <Th>#</Th>
                    <Th>Name</Th>
                    <Th>Mobile</Th>
                    <Th>Email</Th>
                    <Th>Stage</Th>
                    <Th>Project</Th>
                    <Th>Assigned</Th>
                    <Th>Created</Th>
                  </tr>
                </thead>
                <tbody>
                  {leads.map((l, i) => (
                    <tr key={l._id} className="hover:bg-slate-50/80">
                      <Td className="text-slate-400">{(page - 1) * pageSize + i + 1}</Td>
                      <Td>
                        <Link
                          href={`/leads?q=${encodeURIComponent(l.contact.name)}`}
                          className="font-medium text-emerald-700 hover:underline"
                        >
                          {l.contact.name}
                        </Link>
                      </Td>
                      <Td className="tabular-nums">{formatPhone(l.contact.primaryPhone)}</Td>
                      <Td>{l.contact.email ?? "—"}</Td>
                      <Td>
                        <StatusPill tone="info">{l.stage.replace(/_/g, " ")}</StatusPill>
                      </Td>
                      <Td>{l.primaryProjectId?.name ?? "—"}</Td>
                      <Td>{l.assignedTo?.name ?? "—"}</Td>
                      <Td className="text-[12px] text-slate-500">
                        {new Date(l.createdAt).toLocaleDateString("en-IN")}
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </TableRoot>
            )}
          </DataTableShell>
        )}
      </PageBody>
    </PageShell>
  );
}
