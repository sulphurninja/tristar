"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Filter,
  Flame,
  Users as UsersIcon,
  ListChecks,
  CalendarClock,
  Building2,
  Phone as PhoneIcon,
  Star,
  Mail as MailIcon,
  MessageSquare,
  Loader2,
  Settings as SettingsIcon,
  AlertCircle,
} from "lucide-react";
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
import { NewLeadSheet } from "@/components/leads/NewLeadSheet";
import { LeadDrawer } from "@/components/leads/drawer/LeadDrawer";
import { BdButton, BdSelect } from "@/components/bd";
import { cn, formatPhone } from "@/lib/utils";
import { stageAccent, type StageColorKey } from "@/lib/stage-colors";

interface Lead {
  _id: string;
  leadNumber?: string;
  contact: { name: string; primaryPhone: string; email?: string };
  stage: string;
  priority: string;
  pipelineId?: string;
  primaryProjectId?: { _id?: string; name: string; code: string } | null;
  assignedTo?: { _id?: string; name: string } | null;
  source?: { primary?: string };
  createdAt: string;
  nextActionAt?: string;
  description?: string;
  isHot?: boolean;
}

interface ProjectLite {
  _id: string;
  name: string;
}
interface UserLite {
  _id: string;
  name: string;
}

interface StageDef {
  _id: string;
  key: string;
  label: string;
  description?: string;
  type: "open" | "won" | "lost";
  color: string;
  probability?: number;
  order: number;
  isSystem?: boolean;
}

interface PipelineDef {
  _id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  accent: string;
  stages: StageDef[];
}

const PRIORITY_TONE: Record<string, string> = {
  vip: "bg-purple-100 text-purple-700",
  high: "bg-rose-100 text-rose-700",
  medium: "bg-amber-100 text-amber-700",
  low: "bg-slate-100 text-slate-600",
};

const SOURCE_TONE: Record<string, string> = {
  walkin: "bg-amber-50 text-amber-700",
  channel_partner: "bg-orange-50 text-orange-700",
  telecalling: "bg-amber-50 text-amber-700",
  website: "bg-sky-50 text-sky-700",
  referral: "bg-violet-50 text-violet-700",
  campaign: "bg-emerald-50 text-emerald-700",
  api: "bg-slate-50 text-slate-700",
  other: "bg-slate-50 text-slate-700",
};

const SOURCE_LABEL: Record<string, string> = {
  walkin: "Walkin",
  channel_partner: "Channel Partner",
  telecalling: "Tele",
  website: "Website",
  referral: "Referral",
  campaign: "Campaign",
  api: "API",
  other: "Other",
};

export default function PipelinePage() {
  const searchParams = useSearchParams();
  const [pipelines, setPipelines] = useState<PipelineDef[]>([]);
  const [pipelineId, setPipelineId] = useState<string>("");
  const [pipelineLoading, setPipelineLoading] = useState(true);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [totalAll, setTotalAll] = useState(0);
  const [projects, setProjects] = useState<ProjectLite[]>([]);
  const [users, setUsers] = useState<UserLite[]>([]);
  const [loading, setLoading] = useState(false);
  const [openNew, setOpenNew] = useState(searchParams.get("new") === "1");
  const [activeId, setActiveId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [projectFilter, setProjectFilter] = useState("all");
  const [assignedTo, setAssignedTo] = useState("all");
  const [priority, setPriority] = useState("all");

  const activePipeline = useMemo(
    () => pipelines.find((p) => p._id === pipelineId) ?? pipelines[0],
    [pipelines, pipelineId],
  );

  /* Initial load: pipelines, projects, users */
  useEffect(() => {
    setPipelineLoading(true);
    fetch("/api/pipelines", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const list: PipelineDef[] = d.pipelines ?? [];
        setPipelines(list);
        const fromUrl = searchParams.get("pipeline");
        const initial =
          (fromUrl && list.find((p) => p._id === fromUrl)?._id) ??
          list.find((p) => p.isDefault)?._id ??
          list[0]?._id ??
          "";
        setPipelineId(initial);
      })
      .finally(() => setPipelineLoading(false));

    fetch("/api/projects?limit=200", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => setProjects([]));
    fetch("/api/users?limit=200", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => setUsers([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Build query string for /api/leads */
  const params = useMemo(() => {
    const u = new URLSearchParams();
    if (q.trim()) u.set("q", q.trim());
    if (pipelineId) u.set("pipelineId", pipelineId);
    if (projectFilter !== "all") u.set("projectId", projectFilter);
    if (assignedTo !== "all") u.set("assignedTo", assignedTo);
    if (priority !== "all") u.set("priority", priority);
    u.set("limit", "500");
    u.set("view", "all");
    return u.toString();
  }, [q, pipelineId, projectFilter, assignedTo, priority]);

  const load = useCallback(() => {
    if (!pipelineId) return;
    setLoading(true);
    fetch(`/api/leads?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setLeads(d.leads ?? []);
        setTotalAll(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [params, pipelineId]);

  useEffect(() => {
    if (!pipelineId) return;
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load, pipelineId]);

  /* Group leads by stage key */
  const byStage = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    if (activePipeline?.stages) {
      for (const s of activePipeline.stages) map[s.key] = [];
    }
    for (const l of leads) {
      if (!map[l.stage]) map[l.stage] = [];
      map[l.stage].push(l);
    }
    return map;
  }, [leads, activePipeline]);

  /* drag state */
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<string | null>(null);

  const moveLead = useCallback(
    async (leadId: string, toStage: string) => {
      const target = leads.find((l) => l._id === leadId);
      if (!target || target.stage === toStage) return;

      const stageLabel =
        activePipeline?.stages?.find((s) => s.key === toStage)?.label ?? toStage;
      const prevStage = target.stage;

      setLeads((xs) =>
        xs.map((l) => (l._id === leadId ? { ...l, stage: toStage } : l)),
      );
      try {
        const res = await fetch(`/api/leads/${leadId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ stage: toStage }),
        });
        if (!res.ok) throw new Error();
        toast.success(`Moved to ${stageLabel}`);
      } catch {
        setLeads((xs) =>
          xs.map((l) => (l._id === leadId ? { ...l, stage: prevStage } : l)),
        );
        toast.error("Couldn't update stage. Try again.");
      }
    },
    [leads, activePipeline],
  );

  /* ----- Render ----- */

  if (pipelineLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" /> Loading pipeline…
        </div>
      </div>
    );
  }

  if (!activePipeline) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <AlertCircle className="size-5" strokeWidth={1.75} />
        </div>
        <div>
          <h2 className="text-lg font-semibold">No pipelines yet</h2>
          <p className="mt-1 max-w-sm text-sm text-slate-600">
            Create your first pipeline to start visualising your sales workflow as a Kanban board.
          </p>
        </div>
        <Button asChild>
          <Link href="/settings/pipelines">
            <Plus className="size-4" /> Create a pipeline
          </Link>
        </Button>
      </div>
    );
  }

  const orderedStages = [...(activePipeline.stages ?? [])].sort(
    (a, b) => a.order - b.order,
  );

  const total = leads.length;
  const wonLeads = leads.filter((l) =>
    activePipeline.stages?.find((s) => s.key === l.stage)?.type === "won",
  ).length;
  const lostLeads = leads.filter((l) =>
    activePipeline.stages?.find((s) => s.key === l.stage)?.type === "lost",
  ).length;
  const winRate = total > 0 ? Math.round((wonLeads / total) * 100) : 0;

  return (
    <div className="flex min-h-full flex-1 flex-col bg-[#f4f6fb]">
      {/* Toolbar */}
      <div className="sticky top-0 z-20 flex flex-col gap-3 border-b border-[#e3e6ef] bg-white px-5 py-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <BdSelect
              className="w-[280px]"
              clearable={false}
              value={pipelineId}
              onChange={(v) => {
                setPipelineId(v);
                setLeads([]);
              }}
              options={pipelines.map((p) => ({ value: p._id, label: p.isDefault ? `${p.name} (Default)` : p.name }))}
            />
            <Link
              href={`/settings/pipelines/${activePipeline._id}`}
              title="Manage pipelines"
              aria-label="Manage pipelines"
              className="bd-btn-light inline-flex size-[38px] items-center justify-center !p-0"
            >
              <SettingsIcon className="size-4" strokeWidth={1.75} />
            </Link>
          </div>

          <div className="flex items-center gap-5 text-[13px]">
            <span><b className="text-[16px] tabular-nums">{total}</b> <span className="text-[#6b7186]">leads{totalAll > total ? ` (latest ${total} of ${totalAll.toLocaleString("en-IN")})` : ""}</span></span>
            <span><b className="text-[16px] tabular-nums text-[#2f8f5f]">{wonLeads}</b> <span className="text-[#6b7186]">won</span></span>
            <span><b className="text-[16px] tabular-nums text-[#d9453f]">{lostLeads}</b> <span className="text-[#6b7186]">lost</span></span>
            <span><b className="text-[16px] tabular-nums">{winRate}%</b> <span className="text-[#6b7186]">win rate</span></span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              className="bd-input !w-[260px] rounded-r-none"
            />
            <span className="flex w-10 items-center justify-center bg-[#8da3dc] text-white">
              <Search className="size-4" />
            </span>
          </div>
          <BdSelect className="w-[200px]" value={projectFilter === "all" ? "" : projectFilter} onChange={(v) => setProjectFilter(v || "all")} placeholder="Select Project" options={projects.map((p) => ({ value: p._id, label: p.name }))} />
          <BdSelect className="w-[200px]" value={assignedTo === "all" ? "" : assignedTo} onChange={(v) => setAssignedTo(v || "all")} placeholder="Select Sales Agent" options={users.map((u) => ({ value: u._id, label: u.name }))} />
          <BdSelect
            className="w-[160px]"
            value={priority === "all" ? "" : priority}
            onChange={(v) => setPriority(v || "all")}
            placeholder="Priority"
            options={[{ value: "vip", label: "VIP" }, { value: "high", label: "High" }, { value: "medium", label: "Medium" }, { value: "low", label: "Low" }]}
          />

          <div className="ml-auto flex items-center gap-2">
            <Link href="/leads" className="bd-btn-light inline-flex items-center gap-1.5">
              <ListChecks className="size-4" strokeWidth={1.75} /> List view
            </Link>
            <BdButton
              variant="light"
              onClick={() => {
                setQ("");
                setProjectFilter("all");
                setAssignedTo("all");
                setPriority("all");
              }}
            >
              <Filter className="size-4" strokeWidth={1.75} /> Reset
            </BdButton>
            <BdButton onClick={() => setOpenNew(true)}>
              <Plus className="size-4" strokeWidth={2} /> Add Lead
            </BdButton>
          </div>
        </div>
      </div>

      {/* Loading veil */}
      {loading ? (
        <div className="pointer-events-none flex items-center gap-2 px-10 pt-3 text-[12px] font-medium text-slate-500">
          <Loader2 className="size-3.5 animate-spin" /> Loading leads…
        </div>
      ) : null}

      {/* Kanban board */}
      <div className="flex-1 overflow-x-auto">
        <div className="inline-flex min-w-max items-start gap-3 px-5 py-5">
          {orderedStages.map((stage) => {
            const colLeads = byStage[stage.key] ?? [];
            const colorTokens = stageAccent(stage.color as StageColorKey);
            return (
              <ColumnCard
                key={stage._id}
                stage={stage}
                colorTokens={colorTokens}
                count={colLeads.length}
                isHover={hoverStage === stage.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                  setHoverStage(stage.key);
                }}
                onDragLeave={() =>
                  setHoverStage((s) => (s === stage.key ? null : s))
                }
                onDrop={async (e) => {
                  e.preventDefault();
                  setHoverStage(null);
                  const id = e.dataTransfer.getData("text/lead-id") || draggingId;
                  if (!id) return;
                  await moveLead(id, stage.key);
                  setDraggingId(null);
                }}
              >
                {colLeads.length === 0 ? (
                  <EmptyColumn label={stage.label} />
                ) : (
                  colLeads.map((lead) => (
                    <LeadCard
                      key={lead._id}
                      lead={lead}
                      dragging={draggingId === lead._id}
                      onClick={() => setActiveId(lead._id)}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/lead-id", lead._id);
                        setDraggingId(lead._id);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                    />
                  ))
                )}
              </ColumnCard>
            );
          })}
        </div>
      </div>

      <NewLeadSheet
        open={openNew}
        onOpenChange={setOpenNew}
        onCreated={load}
        defaultPipelineId={pipelineId}
      />
      <LeadDrawer
        leadId={activeId}
        ids={leads.map((l) => l._id)}
        onNavigate={setActiveId}
        onClose={() => setActiveId(null)}
        onChanged={load}
        onDeleted={() => {
          setActiveId(null);
          load();
        }}
      />
    </div>
  );
}

/* ----------------------------- Subcomponents ---------------------------- */

function ColumnCard({
  stage,
  colorTokens,
  count,
  children,
  isHover,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  stage: StageDef;
  colorTokens: ReturnType<typeof stageAccent>;
  count: number;
  children: React.ReactNode;
  isHover: boolean;
  onDragOver: React.DragEventHandler<HTMLDivElement>;
  onDragLeave: React.DragEventHandler<HTMLDivElement>;
  onDrop: React.DragEventHandler<HTMLDivElement>;
}) {
  const ref = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={ref}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "flex w-[300px] shrink-0 flex-col rounded-[3px] border bg-white shadow-[0_1px_4px_rgba(30,50,110,0.06)] transition-all duration-150",
        isHover
          ? "border-emerald-300 bg-emerald-50/40 shadow-[0_0_0_3px_rgba(16,185,129,0.08)]"
          : "border-slate-200/70 hover:border-slate-300/70",
      )}
    >
      <header className="flex items-center justify-between rounded-t-2xl border-b border-slate-100/80 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <span className={cn("size-2 rounded-full", colorTokens.dot)} />
          <span className="text-[13px] font-semibold tracking-tight text-slate-800">
            {stage.label}
          </span>
          <span
            className={cn(
              "inline-flex h-5 min-w-[22px] items-center justify-center rounded-full px-1.5 text-[11px] font-bold leading-none",
              stage.type === "won"
                ? "bg-emerald-100 text-emerald-700"
                : stage.type === "lost"
                  ? "bg-rose-100 text-rose-700"
                  : "bg-slate-100 text-slate-600",
            )}
          >
            {count}
          </span>
        </div>
        {typeof stage.probability === "number" && stage.probability > 0 ? (
          <span className="text-[10.5px] font-semibold text-slate-400">
            {stage.probability}%
          </span>
        ) : null}
      </header>

      <div className="flex flex-1 flex-col gap-2 px-2 py-2">
        <div className="flex max-h-[calc(100vh-300px)] min-h-[120px] flex-col gap-2 overflow-y-auto pr-1">
          {children}
        </div>
      </div>
    </div>
  );
}

function EmptyColumn({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-slate-200/80 bg-slate-50/40 px-4 py-8 text-center">
      <UsersIcon className="size-4 text-slate-300" strokeWidth={1.75} />
      <p className="text-[11.5px] font-medium text-slate-500">No leads in {label}</p>
      <p className="text-[10.5px] text-slate-400">Drag a card here to move it</p>
    </div>
  );
}

function LeadCard({
  lead,
  dragging,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  lead: Lead;
  dragging: boolean;
  onClick: () => void;
  onDragStart: React.DragEventHandler<HTMLDivElement>;
  onDragEnd: React.DragEventHandler<HTMLDivElement>;
}) {
  const sourceKey = lead.source?.primary ?? "other";
  const sourceLabel = SOURCE_LABEL[sourceKey] ?? sourceKey.replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());

  return (
    <div
      draggable
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => (e.key === "Enter" ? onClick() : null)}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        "group cursor-grab rounded-xl border border-slate-200/80 bg-white p-3 text-left transition-all hover:-translate-y-px hover:border-emerald-200 hover:shadow-md",
        dragging && "scale-[0.98] cursor-grabbing opacity-60",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold text-slate-900 group-hover:text-emerald-700">
            {lead.contact.name}
          </p>
          {lead.leadNumber ? (
            <p className="mt-0.5 truncate font-mono text-[10.5px] text-slate-400">
              {lead.leadNumber}
            </p>
          ) : null}
        </div>
        {lead.isHot ? (
          <Flame className="size-3.5 shrink-0 text-amber-500" strokeWidth={2} />
        ) : null}
        {lead.priority === "vip" ? (
          <Star className="size-3.5 shrink-0 fill-purple-500 text-purple-500" />
        ) : null}
      </div>

      <div className="mt-2 flex flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[11.5px] text-slate-600">
          <PhoneIcon className="size-3 text-slate-400" strokeWidth={2} />
          <span className="truncate">{formatPhone(lead.contact.primaryPhone)}</span>
        </div>
        {lead.primaryProjectId?.name ? (
          <div className="flex items-center gap-1.5 text-[11.5px] text-slate-600">
            <Building2 className="size-3 text-slate-400" strokeWidth={2} />
            <span className="truncate">{lead.primaryProjectId.name}</span>
          </div>
        ) : null}
        {lead.nextActionAt ? (
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            <CalendarClock className="size-3 text-slate-400" strokeWidth={2} />
            <span className="truncate">
              {new Date(lead.nextActionAt).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          </div>
        ) : null}
      </div>

      <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-2">
        <div className="flex flex-wrap items-center gap-1">
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
              SOURCE_TONE[sourceKey] ?? SOURCE_TONE.other,
            )}
          >
            {sourceLabel}
          </span>
          {lead.priority && lead.priority !== "medium" ? (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
                PRIORITY_TONE[lead.priority] ?? PRIORITY_TONE.medium,
              )}
            >
              {lead.priority}
            </span>
          ) : null}
          {lead.assignedTo?.name ? (
            <span className="truncate rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
              {lead.assignedTo.name.split(" ")[0]}
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <a
            href={`tel:${lead.contact.primaryPhone}`}
            aria-label="Call"
            title="Call"
            className="inline-flex size-6 items-center justify-center rounded-md bg-sky-50 text-sky-600 hover:bg-sky-100"
          >
            <PhoneIcon className="size-3" strokeWidth={2} />
          </a>
          {lead.contact.email ? (
            <a
              href={`mailto:${lead.contact.email}`}
              aria-label="Email"
              title="Email"
              className="inline-flex size-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
            >
              <MailIcon className="size-3" strokeWidth={2} />
            </a>
          ) : null}
          <a
            href={`https://wa.me/${lead.contact.primaryPhone.replace(/\D/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp"
            title="WhatsApp"
            className="inline-flex size-6 items-center justify-center rounded-md bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
          >
            <MessageSquare className="size-3" strokeWidth={2} />
          </a>
        </div>
      </div>
    </div>
  );
}
