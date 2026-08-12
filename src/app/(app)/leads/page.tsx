"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Upload,
  Pencil,
  ArrowUpRight,
  MessageSquare,
  PhoneCall,
  Mail,
  Flame,
  Users,
} from "lucide-react";
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
import { NewLeadSheet } from "@/components/leads/NewLeadSheet";
import { LeadDetailSheet } from "@/components/leads/LeadDetailSheet";
import {
  LeadStageAnalysis,
  type LeadAnalysisData,
} from "@/components/leads/LeadStageAnalysis";
import { PageShell, PageBody } from "@/components/shared/PageShell";
import { FilterBar } from "@/components/shared/FilterBar";
import { FilterField } from "@/components/shared/FilterField";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { DatePicker } from "@/components/ui/date-picker";
import { cn, formatNumber, formatPhone } from "@/lib/utils";
import { format } from "date-fns";

interface Lead {
  _id: string;
  leadNumber?: string;
  contact: { name: string; primaryPhone: string; email?: string };
  stage: string;
  priority: string;
  primaryProjectId?: { name: string; code: string } | null;
  assignedTo?: { name: string } | null;
  source?: { primary?: string };
  createdAt: string;
  lastContactedAt?: string;
  nextActionAt?: string;
  description?: string;
  isHot?: boolean;
  score?: { value?: number; label?: string };
  tags?: string[];
}

const BUCKET_STAGE: Record<string, string> = {
  open: "new",
  warm: "warm",
  hot: "hot",
  followup: "site_visit_scheduled",
  interested: "interested",
  booked: "booked",
  cold: "not_interested",
  cnr: "cnr",
};

const STAGE_TONE: Record<
  string,
  { label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" | "primary" }
> = {
  new: { label: "New", tone: "neutral" },
  attempted_1: { label: "Attempted - 1", tone: "neutral" },
  attempted_2: { label: "Attempted - 2", tone: "neutral" },
  warm: { label: "Warm", tone: "info" },
  hot: { label: "Hot", tone: "warning" },
  interested: { label: "Interested", tone: "info" },
  site_visit_scheduled: { label: "Site Visit Scheduled", tone: "primary" },
  site_visit_done: { label: "Site Visit Done", tone: "primary" },
  negotiating: { label: "Negotiating", tone: "warning" },
  booked: { label: "Booked", tone: "success" },
  lost: { label: "Lost", tone: "danger" },
  not_interested: { label: "Not Interested", tone: "danger" },
  cnr: { label: "CNR", tone: "neutral" },
  cnc: { label: "CNC", tone: "neutral" },
  duplicate: { label: "Duplicate", tone: "neutral" },
  junk: { label: "Junk", tone: "neutral" },
  switched_off: { label: "Switch Off", tone: "neutral" },
};

const SOURCE_TAG: Record<string, { label: string; tone: string }> = {
  walkin: { label: "Walkin", tone: "bg-amber-100 text-amber-700" },
  channel_partner: { label: "Channel Partner", tone: "bg-orange-100 text-orange-700" },
  telecalling: { label: "Tele-calling", tone: "bg-amber-100 text-amber-700" },
  website: { label: "Website", tone: "bg-sky-100 text-sky-700" },
  other: { label: "Other", tone: "bg-slate-100 text-slate-700" },
};

export default function LeadsPage() {
  const searchParams = useSearchParams();
  const initialStage = searchParams.get("stage") ?? "all";
  const initialOpenNew = searchParams.get("new") === "1";
  const initialQ = searchParams.get("q") ?? "";

  const [leads, setLeads] = useState<Lead[]>([]);
  const [analysis, setAnalysis] = useState<LeadAnalysisData | null>(null);
  const [agents, setAgents] = useState<Array<{ _id: string; name: string }>>([]);
  const [agentFilter, setAgentFilter] = useState("all");
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [openNew, setOpenNew] = useState(initialOpenNew);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [q, setQ] = useState(initialQ);
  const [stage, setStage] = useState(initialStage);
  const [priority, setPriority] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [source, setSource] = useState("all");
  const [hotOnly, setHotOnly] = useState(false);
  const [createdFrom, setCreatedFrom] = useState<Date | undefined>();
  const [createdTo, setCreatedTo] = useState<Date | undefined>();
  const [projects, setProjects] = useState<Array<{ _id: string; name: string }>>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const params = useMemo(() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (stage && stage !== "all") u.set("stage", stage);
    if (priority && priority !== "all") u.set("priority", priority);
    if (assignee && assignee !== "all") u.set("assignedTo", assignee);
    if (projectId && projectId !== "all") u.set("projectId", projectId);
    if (source && source !== "all") u.set("source", source);
    if (hotOnly) u.set("isHot", "1");
    if (createdFrom) u.set("createdFrom", format(createdFrom, "yyyy-MM-dd"));
    if (createdTo) u.set("createdTo", format(createdTo, "yyyy-MM-dd"));
    u.set("limit", String(pageSize));
    u.set("skip", String((page - 1) * pageSize));
    return u.toString();
  }, [
    q,
    stage,
    priority,
    assignee,
    projectId,
    source,
    hotOnly,
    createdFrom,
    createdTo,
    page,
    pageSize,
  ]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/leads?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((leadsData) => {
        setLeads(leadsData.leads ?? []);
        setTotal(leadsData.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [params]);

  const loadAnalysis = useCallback(() => {
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
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    loadAnalysis();
  }, [loadAnalysis]);

  useEffect(() => {
    fetch("/api/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAgents(d.users ?? []));
    fetch("/api/projects?limit=100", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [
    q,
    stage,
    priority,
    assignee,
    projectId,
    source,
    hotOnly,
    createdFrom,
    createdTo,
    pageSize,
  ]);

  const resetFilters = () => {
    setQ("");
    setStage("all");
    setPriority("all");
    setAssignee("all");
    setProjectId("all");
    setSource("all");
    setHotOnly(false);
    setCreatedFrom(undefined);
    setCreatedTo(undefined);
  };

  return (
    <PageShell>
      <PageBody>
        <LeadStageAnalysis
          data={analysis}
          loading={analysisLoading}
          agentFilter={agentFilter}
          onAgentFilterChange={setAgentFilter}
          agents={agents}
          onBucketClick={(key) => {
            const mapped = BUCKET_STAGE[key];
            if (mapped) setStage(mapped);
          }}
        />

        <FilterBar
          advancedTitle="Advanced lead filters"
          advancedDescription="Filter by project, source, date range and more."
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
              <FilterField label="Source">
                <Select value={source} onValueChange={setSource}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="All sources" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All sources</SelectItem>
                    {Object.entries(SOURCE_TAG).map(([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="google_ads">Google Ads</SelectItem>
                    <SelectItem value="referral">Referral</SelectItem>
                  </SelectContent>
                </Select>
              </FilterField>
              <div className="grid grid-cols-2 gap-3">
                <FilterField label="Created from">
                  <DatePicker value={createdFrom} onChange={setCreatedFrom} placeholder="From" />
                </FilterField>
                <FilterField label="Created to">
                  <DatePicker value={createdTo} onChange={setCreatedTo} placeholder="To" />
                </FilterField>
              </div>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-[13px]">
                <input
                  type="checkbox"
                  checked={hotOnly}
                  onChange={(e) => setHotOnly(e.target.checked)}
                  className="size-4 accent-emerald-600"
                />
                <Flame className="size-3.5 text-amber-500" />
                Hot leads only
              </label>
            </>
          }
          actions={
            <>
              <Button asChild variant="outline" size="sm" className="h-9 gap-1.5">
                <Link href="/leads/bulk-update">
                  <Upload className="size-3.5" />
                  Bulk update
                </Link>
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={resetFilters}>
                Reset
              </Button>
              <Button size="sm" className="h-9 gap-1.5" onClick={() => setOpenNew(true)}>
                <Plus className="size-3.5" />
                New lead
              </Button>
            </>
          }
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, phone, email, lead #…"
            className="h-9 w-72"
          />
          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {Object.entries(STAGE_TONE).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger className="h-9 w-36">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              <SelectItem value="vip">VIP</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
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

        <DataTableShell
          title="Leads"
          count={total}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        >
          {loading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-slate-100" />
              ))}
            </div>
          ) : leads.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Users className="size-5 text-emerald-600" strokeWidth={1.75} />}
                title={
                  q || stage !== "all" || priority !== "all"
                    ? "No leads match your filters"
                    : "No leads yet"
                }
                description={
                  q || stage !== "all" || priority !== "all"
                    ? "Try clearing filters or searching with a different term."
                    : "Capture your first prospect to get started."
                }
                action={
                  <Button onClick={() => setOpenNew(true)} className="gap-1.5">
                    <Plus className="size-4" />
                    Add lead
                  </Button>
                }
              />
            </div>
          ) : (
            <TableRoot>
              <thead>
                <tr>
                  <Th className="w-10">#</Th>
                  <Th>Name</Th>
                  <Th>Mobile</Th>
                  <Th>Assigned to</Th>
                  <Th>Status</Th>
                  <Th>Project</Th>
                  <Th>Description</Th>
                  <Th>Next call</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead, idx) => {
                  const tone = STAGE_TONE[lead.stage] ?? STAGE_TONE.new;
                  const sourceTag = SOURCE_TAG[lead.source?.primary ?? "other"];
                  return (
                    <tr
                      key={lead._id}
                      className="cursor-pointer transition-colors hover:bg-slate-50/80"
                      onClick={() => setActiveId(lead._id)}
                    >
                      <Td className="tabular-nums text-slate-400">
                        {(page - 1) * pageSize + idx + 1}
                      </Td>
                      <Td>
                        <div>
                          <p className="font-semibold text-emerald-700">
                            {lead.contact.name}
                            {lead.isHot ? (
                              <Flame className="ml-1 inline size-3.5 text-amber-500" />
                            ) : null}
                          </p>
                          {lead.leadNumber ? (
                            <p className="text-[11px] text-slate-400">{lead.leadNumber}</p>
                          ) : null}
                          {sourceTag ? (
                            <span
                              className={cn(
                                "mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                sourceTag.tone,
                              )}
                            >
                              {sourceTag.label}
                            </span>
                          ) : null}
                        </div>
                      </Td>
                      <Td className="tabular-nums">{formatPhone(lead.contact.primaryPhone)}</Td>
                      <Td>{lead.assignedTo?.name ?? <span className="text-slate-400">Unassigned</span>}</Td>
                      <Td>
                        <StatusPill tone={tone.tone} dot>
                          {tone.label}
                        </StatusPill>
                      </Td>
                      <Td>{lead.primaryProjectId?.name ?? <span className="text-slate-400">—</span>}</Td>
                      <Td className="max-w-[220px]">
                        <p className="line-clamp-2 text-[12.5px] text-slate-600">
                          {lead.description ?? "—"}
                        </p>
                      </Td>
                      <Td className="whitespace-nowrap text-[12px] text-slate-500">
                        {lead.nextActionAt
                          ? new Date(lead.nextActionAt).toLocaleString("en-IN", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })
                          : "—"}
                      </Td>
                      <Td>
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ActionIcon
                            href={`tel:${lead.contact.primaryPhone}`}
                            className="bg-sky-500 hover:bg-sky-600"
                            icon={PhoneCall}
                            label="Call"
                          />
                          <ActionIcon
                            href={`mailto:${lead.contact.email ?? ""}`}
                            className="bg-emerald-500 hover:bg-emerald-600"
                            icon={Mail}
                            label="Email"
                            disabled={!lead.contact.email}
                          />
                          <ActionIcon
                            href={`https://wa.me/${lead.contact.primaryPhone.replace(/\D/g, "")}`}
                            className="bg-emerald-600 hover:bg-emerald-700"
                            icon={MessageSquare}
                            label="WhatsApp"
                            external
                          />
                          <button
                            type="button"
                            className="inline-flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                            onClick={() => setActiveId(lead._id)}
                            aria-label="Open"
                          >
                            <ArrowUpRight className="size-3.5" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                            onClick={() => setActiveId(lead._id)}
                            aria-label="Edit"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableRoot>
          )}
        </DataTableShell>

        <p className="text-[12px] text-slate-500">
          Showing{" "}
          <span className="font-medium text-slate-700">
            {leads.length ? (page - 1) * pageSize + 1 : 0}–
            {(page - 1) * pageSize + leads.length}
          </span>{" "}
          of <span className="font-medium text-slate-700">{formatNumber(total)}</span>
        </p>
      </PageBody>

      <NewLeadSheet open={openNew} onOpenChange={setOpenNew} onCreated={load} />
      <LeadDetailSheet
        leadId={activeId}
        leadIds={leads.map((l) => l._id)}
        onLeadChange={setActiveId}
        onOpenChange={(v) => !v && setActiveId(null)}
        onChanged={() => {
          load();
          loadAnalysis();
        }}
      />
    </PageShell>
  );
}

function ActionIcon({
  href,
  className,
  icon: Icon,
  label,
  external,
  disabled,
}: {
  href: string;
  className: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  external?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span
        aria-label={label}
        className="inline-flex size-7 cursor-not-allowed items-center justify-center rounded-md bg-slate-100 text-slate-300"
      >
        <Icon className="size-3.5" strokeWidth={2} />
      </span>
    );
  }
  return (
    <a
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noopener noreferrer" : undefined}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-white transition-colors",
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} />
    </a>
  );
}
