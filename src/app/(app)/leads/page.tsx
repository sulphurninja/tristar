"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Users,
  Filter,
  Mail,
  Flame,
  Clock,
  CalendarCheck,
  AlertCircle,
  TrendingUp,
  Building2,
  Upload,
  Pencil,
  ArrowUpRight,
  MessageSquare,
  PhoneCall,
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
import { cn, formatNumber, formatPhone } from "@/lib/utils";

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

interface Stats {
  totalLeads: number;
  hotLeads: number;
  bookedLeads: number;
  inactiveLeads: number;
  backlogLeads: number;
  todayFollowUps: number;
  visitExpirations: number;
}

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

  const [leads, setLeads] = useState<Lead[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(initialOpenNew);
  const [activeId, setActiveId] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [stage, setStage] = useState(initialStage);
  const [priority, setPriority] = useState("all");

  const params = useMemo(() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (stage && stage !== "all") u.set("stage", stage);
    if (priority && priority !== "all") u.set("priority", priority);
    u.set("limit", "200");
    return u.toString();
  }, [q, stage, priority]);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/leads?${params}`, { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/dashboard/summary", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([leadsData, summaryData]) => {
        setLeads(leadsData.leads ?? []);
        setTotal(leadsData.total ?? 0);
        setStats(summaryData.kpis ?? null);
      })
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Stats strip — mirrors the screenshot */}
      <div className="grid grid-cols-2 gap-px border-b border-slate-200/70 bg-slate-200/70 sm:grid-cols-3 lg:grid-cols-7">
        <StatTile
          icon={Clock}
          label="Today's follow-ups"
          value={stats?.todayFollowUps ?? 0}
          tone="default"
          loading={!stats}
        />
        <StatTile
          icon={AlertCircle}
          label="Backlogs"
          value={stats?.backlogLeads ?? 0}
          tone="default"
          loading={!stats}
        />
        <StatTile
          icon={CalendarCheck}
          label="Visit Expirations"
          value={stats?.visitExpirations ?? 0}
          tone="default"
          loading={!stats}
        />
        <StatTile
          icon={Flame}
          label="Hot Leads"
          value={stats?.hotLeads ?? 0}
          tone="hot"
          loading={!stats}
        />
        <StatTile
          icon={Users}
          label="New Leads"
          value={stats?.totalLeads ?? 0}
          tone="info"
          loading={!stats}
        />
        <StatTile
          icon={TrendingUp}
          label="Booked Leads"
          value={stats?.bookedLeads ?? 0}
          tone="success"
          loading={!stats}
        />
        <StatTile
          icon={Building2}
          label="Inactive Leads"
          value={stats?.inactiveLeads ?? 0}
          tone="default"
          loading={!stats}
        />
      </div>

      {/* Toolbar */}
      <div className="sticky top-[72px] z-20 flex flex-col gap-3 border-b border-slate-200/70 bg-white px-7 py-4 lg:flex-row lg:items-center lg:px-10">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-md">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
              strokeWidth={1.75}
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, enquiry no., email or phone…"
              className="h-10 rounded-lg pl-10"
            />
          </div>

          <Select value={stage} onValueChange={setStage}>
            <SelectTrigger className="h-10 w-44">
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
            <SelectTrigger className="h-10 w-36">
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

          <span className="hidden text-[12.5px] text-slate-500 lg:inline">
            Showing <span className="font-semibold text-slate-700">{leads.length}</span>
            {total > leads.length ? ` of ${formatNumber(total)}` : ""}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="h-10 gap-1.5 rounded-lg">
            <Link href="/leads/bulk-update">
              <Upload className="size-4" strokeWidth={1.75} />
              Bulk update
            </Link>
          </Button>
          <Button
            variant="outline"
            size="default"
            className="h-10 gap-1.5 rounded-lg"
            onClick={() => {
              setQ("");
              setStage("all");
              setPriority("all");
            }}
          >
            <Filter className="size-4" strokeWidth={1.75} />
            Reset
          </Button>
          <Button onClick={() => setOpenNew(true)} className="h-10 gap-1.5 rounded-lg">
            <Plus className="size-4" strokeWidth={2} />
            New lead
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1">
        {loading ? (
          <div className="space-y-2 p-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : leads.length === 0 ? (
          <div className="px-7 py-12 lg:px-10">
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
                  : "Capture your first prospect — we'll auto-assign and start scoring instantly."
              }
              action={
                <Button onClick={() => setOpenNew(true)} className="gap-1.5">
                  <Plus className="size-4" strokeWidth={2} />
                  Add your first lead
                </Button>
              }
              secondary={
                q || stage !== "all" || priority !== "all" ? (
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setQ("");
                      setStage("all");
                      setPriority("all");
                    }}
                  >
                    Clear filters
                  </Button>
                ) : null
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13.5px]">
              <thead className="sticky top-[136px] z-10 bg-sky-50/80 backdrop-blur">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                  <th className="px-7 py-3 lg:px-10">Name</th>
                  <th className="px-3 py-3">Call/Mobile</th>
                  <th className="px-3 py-3">Assigned To</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Project</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3">Next Call Date</th>
                  <th className="px-3 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((lead) => {
                  const tone = STAGE_TONE[lead.stage] ?? STAGE_TONE.new;
                  const sourceTag = SOURCE_TAG[lead.source?.primary ?? "other"];
                  return (
                    <tr
                      key={lead._id}
                      className="cursor-pointer border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                      onClick={() => setActiveId(lead._id)}
                    >
                      <td className="px-7 py-3 lg:px-10">
                        <div>
                          <p className="font-semibold text-emerald-700 hover:underline">
                            {lead.contact.name}
                            {lead.isHot ? (
                              <Flame
                                className="ml-1 inline size-3.5 text-amber-500"
                                strokeWidth={1.75}
                              />
                            ) : null}
                          </p>
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
                      </td>
                      <td className="px-3 py-3 text-[12.5px] text-slate-700">
                        {formatPhone(lead.contact.primaryPhone)}
                      </td>
                      <td className="px-3 py-3 text-[12.5px] text-slate-700">
                        {lead.assignedTo?.name ?? (
                          <span className="text-slate-400">Unassigned</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <StatusPill tone={tone.tone} dot>
                          {tone.label}
                        </StatusPill>
                      </td>
                      <td className="px-3 py-3 text-[12.5px] text-slate-700">
                        {lead.primaryProjectId?.name ?? (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3 max-w-xs">
                        <p className="line-clamp-2 text-[12px] text-slate-600">
                          {lead.description ?? <span className="text-slate-400">—</span>}
                        </p>
                      </td>
                      <td className="px-3 py-3 text-[12px] text-slate-500">
                        {lead.nextActionAt ? (
                          new Date(lead.nextActionAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div
                          className="flex items-center justify-end gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ActionButton
                            href={`tel:${lead.contact.primaryPhone}`}
                            color="bg-sky-500 hover:bg-sky-600"
                            icon={PhoneCall}
                            label="Call"
                          />
                          <ActionButton
                            href={`mailto:${lead.contact.email ?? ""}`}
                            color="bg-emerald-500 hover:bg-emerald-600"
                            icon={Mail}
                            label="Email"
                            disabled={!lead.contact.email}
                          />
                          <ActionButton
                            href={`https://wa.me/${lead.contact.primaryPhone.replace(/\D/g, "")}`}
                            color="bg-emerald-600 hover:bg-emerald-700"
                            icon={MessageSquare}
                            label="WhatsApp"
                            external
                          />
                          <button
                            className="inline-flex size-7 items-center justify-center rounded-md bg-sky-100 text-sky-700 hover:bg-sky-200"
                            onClick={() => setActiveId(lead._id)}
                            aria-label="View"
                          >
                            <ArrowUpRight className="size-4" strokeWidth={2} />
                          </button>
                          <button
                            className="inline-flex size-7 items-center justify-center rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200"
                            onClick={() => setActiveId(lead._id)}
                            aria-label="Edit"
                          >
                            <Pencil className="size-3.5" strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <NewLeadSheet open={openNew} onOpenChange={setOpenNew} onCreated={load} />
      <LeadDetailSheet
        leadId={activeId}
        onOpenChange={(v) => !v && setActiveId(null)}
        onChanged={load}
      />
    </div>
  );
}

function StatTile({
  icon: Icon,
  label,
  value,
  tone,
  loading,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  value: number;
  tone: "default" | "hot" | "info" | "success";
  loading?: boolean;
}) {
  const bg = {
    default: "bg-white",
    hot: "bg-red-50",
    info: "bg-emerald-50",
    success: "bg-emerald-50",
  }[tone];
  const valueText = {
    default: "text-slate-900",
    hot: "text-red-600",
    info: "text-emerald-700",
    success: "text-emerald-700",
  }[tone];
  const iconText = {
    default: "text-slate-400",
    hot: "text-red-500",
    info: "text-emerald-500",
    success: "text-emerald-500",
  }[tone];

  return (
    <div className={cn("p-5", bg)}>
      <div className="flex items-center justify-between">
        <p className="text-[11.5px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <Icon className={cn("size-[15px]", iconText)} strokeWidth={1.75} />
      </div>
      <p
        className={cn(
          "mt-2 text-[26px] font-bold tracking-tight tabular-nums",
          valueText,
        )}
      >
        {loading ? (
          <span className="inline-block h-7 w-12 animate-pulse rounded bg-slate-100" />
        ) : (
          formatNumber(value)
        )}
      </p>
    </div>
  );
}

function ActionButton({
  href,
  color,
  icon: Icon,
  label,
  external,
  disabled,
}: {
  href: string;
  color: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  label: string;
  external?: boolean;
  disabled?: boolean;
}) {
  if (disabled) {
    return (
      <span
        aria-label={label}
        title={`${label} unavailable`}
        className={cn(
          "inline-flex size-7 cursor-not-allowed items-center justify-center rounded-md bg-slate-100 text-slate-300",
        )}
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
      onClick={(e) => e.stopPropagation()}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-7 items-center justify-center rounded-md text-white transition-colors",
        color,
      )}
    >
      <Icon className="size-3.5" strokeWidth={2} />
    </a>
  );
}
