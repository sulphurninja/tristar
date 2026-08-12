"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Phone,
  MessageSquare,
  Mail,
  StickyNote,
  ListTodo,
  MessageCircle,
  ChevronsLeft,
  ChevronsRight,
  X,
  RefreshCw,
  CalendarPlus,
  Trash2,
  Save,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/shared/StatusPill";
import { AddTaskDialog } from "@/components/tasks/AddTaskDialog";
import { cn, formatPhone, initials } from "@/lib/utils";

const STAGES = [
  { value: "new", label: "New" },
  { value: "attempted_1", label: "Attempted 1" },
  { value: "attempted_2", label: "Attempted 2" },
  { value: "warm", label: "Warm" },
  { value: "hot", label: "Hot" },
  { value: "interested", label: "Interested" },
  { value: "cnr", label: "Call Not Received" },
  { value: "site_visit_scheduled", label: "Site Visit Scheduled" },
  { value: "site_visit_done", label: "Site Visit Done" },
  { value: "negotiating", label: "Negotiating" },
  { value: "booked", label: "Booked" },
  { value: "lost", label: "Lost" },
  { value: "not_interested", label: "Not interested" },
  { value: "junk", label: "Junk" },
];

const PRIORITIES = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "vip", label: "VIP" },
];

interface LeadDetail {
  _id: string;
  leadNumber?: string;
  contact: {
    name: string;
    primaryPhone: string;
    altPhone?: string;
    email?: string;
    whatsappOptIn?: boolean;
  };
  stage: string;
  priority: string;
  description?: string;
  tags?: string[];
  preferences?: {
    configurations?: string[];
    minBudget?: number;
    maxBudget?: number;
    minArea?: number;
    maxArea?: number;
    propertyType?: string[];
    localities?: string[];
    cities?: string[];
    purpose?: string;
  };
  primaryProjectId?: { _id: string; name: string; code: string } | string | null;
  assignedTo?: { _id: string; name: string; email: string } | string | null;
  brokerId?: { name?: string; firmName?: string } | null;
  source?: { primary?: string; subSource?: string };
  createdAt: string;
  lastContactedAt?: string;
  nextActionAt?: string;
  nextActionNote?: string;
}

interface Activity {
  _id: string;
  type: string;
  description?: string;
  occurredAt: string;
  actorName?: string;
  channel?: string;
}

interface ProjectOption {
  _id: string;
  name: string;
  code?: string;
  location?: { city?: string; locality?: string };
  minPrice?: number;
  maxPrice?: number;
  configurations?: string[];
}

interface VisitRow {
  _id: string;
  scheduledAt: string;
  status: string;
  projectId?: { name?: string } | null;
}

interface DocRow {
  name: string;
  url: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: string;
}

interface Props {
  leadId: string | null;
  leadIds?: string[];
  onLeadChange?: (id: string) => void;
  onOpenChange: (v: boolean) => void;
  onChanged: () => void;
}

export function LeadDetailSheet({
  leadId,
  leadIds = [],
  onLeadChange,
  onOpenChange,
  onChanged,
}: Props) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [documents, setDocuments] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("suggestion");
  const [remark, setRemark] = useState("");
  const [visitAt, setVisitAt] = useState("");
  const [visitProjectId, setVisitProjectId] = useState("");
  const [uploading, setUploading] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [prefs, setPrefs] = useState({
    minBudget: "",
    maxBudget: "",
    minArea: "",
    maxArea: "",
    propertyType: "",
    locality: "",
    city: "",
  });
  const [savingPrefs, setSavingPrefs] = useState(false);

  const open = !!leadId;
  const index = leadId ? leadIds.indexOf(leadId) : -1;
  const position = index >= 0 ? index + 1 : 0;
  const total = leadIds.length;
  const canPrev = index > 0;
  const canNext = index >= 0 && index < leadIds.length - 1;

  const load = async (id: string) => {
    setLoading(true);
    try {
      const d = await fetch(`/api/leads/${id}`).then((r) => r.json());
      if (d.lead) {
        setLead(d.lead);
        setActivities(d.activities ?? []);
        setDocuments(d.lead.documents ?? []);
        const p = d.lead.preferences ?? {};
        setPrefs({
          minBudget: p.minBudget != null ? String(p.minBudget) : "",
          maxBudget: p.maxBudget != null ? String(p.maxBudget) : "",
          minArea: p.minArea != null ? String(p.minArea) : "",
          maxArea: p.maxArea != null ? String(p.maxArea) : "",
          propertyType: p.propertyType?.[0] ?? "",
          locality: p.localities?.[0] ?? "",
          city: p.cities?.[0] ?? "",
        });
      }
      const v = await fetch(`/api/visits?leadId=${id}&range=all&limit=50`).then((r) =>
        r.json(),
      );
      setVisits(v.visits ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      setActivities([]);
      setVisits([]);
      setDocuments([]);
      return;
    }
    load(leadId);
  }, [leadId]);

  useEffect(() => {
    fetch("/api/projects?limit=50")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" && (e.metaKey || e.altKey) && canPrev) {
        onLeadChange?.(leadIds[index - 1]);
      }
      if (e.key === "ArrowRight" && (e.metaKey || e.altKey) && canNext) {
        onLeadChange?.(leadIds[index + 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, canPrev, canNext, index, leadIds, onLeadChange]);

  const firstActivity = activities[activities.length - 1];
  const lastActivity = activities[0];

  const suggested = useMemo(() => {
    const minB = Number(prefs.minBudget) || 0;
    const maxB = Number(prefs.maxBudget) || Number.MAX_SAFE_INTEGER;
    const needle = (prefs.locality || prefs.city).toLowerCase();
    return projects
      .map((p) => {
        let score = 0;
        const city = p.location?.city?.toLowerCase() ?? "";
        const loc = p.location?.locality?.toLowerCase() ?? "";
        if (needle && (city.includes(needle) || loc.includes(needle) || p.name.toLowerCase().includes(needle))) {
          score += 3;
        }
        const pMin = p.minPrice ?? 0;
        const pMax = p.maxPrice ?? pMin;
        if (minB || prefs.maxBudget) {
          if (pMax >= minB && pMin <= maxB) score += 2;
        }
        if (prefs.propertyType && p.name.toLowerCase().includes(prefs.propertyType.toLowerCase())) {
          score += 1;
        }
        if (!needle && !prefs.minBudget && !prefs.maxBudget) score = 1;
        return { p, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((x) => x.p);
  }, [projects, prefs]);

  const updateField = async (field: string, value: unknown) => {
    if (!leadId) return;
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (res.ok) {
      const d = await res.json();
      setLead((prev) => (prev ? { ...prev, ...d.lead } : prev));
      toast.success("Updated");
      onChanged();
      const a = await fetch(`/api/leads/${leadId}`).then((r) => r.json());
      setActivities(a.activities ?? []);
    } else {
      toast.error("Couldn't update");
    }
  };

  const logActivity = async (
    type: string,
    description: string,
    channel?: string,
  ) => {
    if (!leadId) return;
    await fetch(`/api/leads/${leadId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, description, channel }),
    });
    const a = await fetch(`/api/leads/${leadId}`).then((r) => r.json());
    setActivities(a.activities ?? []);
    toast.success("Logged");
  };

  const savePreferences = async () => {
    if (!leadId) return;
    setSavingPrefs(true);
    try {
      await updateField("preferences", {
        ...(lead?.preferences ?? {}),
        minBudget: prefs.minBudget ? Number(prefs.minBudget) : undefined,
        maxBudget: prefs.maxBudget ? Number(prefs.maxBudget) : undefined,
        minArea: prefs.minArea ? Number(prefs.minArea) : undefined,
        maxArea: prefs.maxArea ? Number(prefs.maxArea) : undefined,
        propertyType: prefs.propertyType ? [prefs.propertyType] : [],
        localities: prefs.locality ? [prefs.locality] : [],
        cities: prefs.city ? [prefs.city] : [],
      });
    } finally {
      setSavingPrefs(false);
    }
  };

  const submitRemark = async () => {
    if (!remark.trim()) return;
    await logActivity("comment_added", remark.trim());
    setRemark("");
  };

  const remove = async () => {
    if (!leadId) return;
    if (!confirm("Delete this lead?")) return;
    const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      onOpenChange(false);
      onChanged();
    }
  };

  const assignedName =
    typeof lead?.assignedTo === "object" && lead?.assignedTo
      ? lead.assignedTo.name
      : "Not Available";

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="full" hideClose className="bg-slate-50 p-0">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-900">Lead Information</h2>
            {total > 0 ? (
              <p className="text-[12px] tabular-nums text-slate-500">
                {position} / {total}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 px-0"
              disabled={!canPrev}
              onClick={() => canPrev && onLeadChange?.(leadIds[index - 1])}
              aria-label="Previous lead"
              title="Previous lead"
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-8 px-0"
              disabled={!canNext}
              onClick={() => canNext && onLeadChange?.(leadIds[index + 1])}
              aria-label="Next lead"
              title="Next lead"
            >
              <ChevronsRight className="size-4" />
            </Button>
            <SheetClose asChild>
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 px-0" aria-label="Close">
                <X className="size-4" />
              </Button>
            </SheetClose>
          </div>
        </div>

        {loading && !lead ? (
          <div className="flex flex-1 items-center justify-center text-[13px] text-slate-500">
            Loading lead…
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[260px_1fr_280px]">
            {/* Left profile */}
            <aside className="scrollbar-hide overflow-y-auto border-r border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between">
                <p className="font-mono text-[12px] font-semibold text-slate-500">
                  #{lead?.leadNumber?.replace(/\D/g, "").slice(-4) || lead?._id.slice(-4)}
                </p>
              </div>

              <div className="mt-4 flex flex-col items-center text-center">
                <div className="flex size-20 items-center justify-center rounded-full bg-amber-300 text-[22px] font-bold text-amber-950">
                  {initials(lead?.contact.name)}
                </div>
                <h3 className="mt-3 text-[15px] font-bold uppercase tracking-wide text-slate-900">
                  {lead?.contact.name}
                </h3>
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <QuickAction
                  label="WhatsApp"
                  color="bg-emerald-500"
                  icon={MessageSquare}
                  onClick={() => {
                    window.open(
                      `https://wa.me/${lead?.contact.primaryPhone.replace(/\D/g, "")}`,
                      "_blank",
                    );
                    logActivity("whatsapp_sent", "WhatsApp opened.", "whatsapp");
                  }}
                />
                <QuickAction
                  label="Note"
                  color="bg-sky-500"
                  icon={StickyNote}
                  onClick={() => setTab("timeline")}
                />
                <QuickAction
                  label="Email"
                  color="bg-pink-500"
                  icon={Mail}
                  onClick={() => {
                    if (lead?.contact.email) window.location.href = `mailto:${lead.contact.email}`;
                    logActivity("email_sent", "Email opened.", "email");
                  }}
                />
                <QuickAction
                  label="Call"
                  color="bg-green-600"
                  icon={Phone}
                  onClick={() => {
                    window.location.href = `tel:${lead?.contact.primaryPhone}`;
                    logActivity("call_made", "Outbound call logged.", "call");
                  }}
                />
                <QuickAction
                  label="SMS"
                  color="bg-orange-500"
                  icon={MessageCircle}
                  onClick={() => {
                    if (lead?.contact.primaryPhone) {
                      window.location.href = `sms:${lead.contact.primaryPhone}`;
                      logActivity("sms_sent", "SMS composer opened.", "sms");
                    }
                  }}
                />
                <QuickAction
                  label="Task"
                  color="bg-violet-500"
                  icon={ListTodo}
                  onClick={() => setTaskOpen(true)}
                />
              </div>

              <div className="mt-5 space-y-3">
                <FieldLabel>Lead stage</FieldLabel>
                <Select value={lead?.stage} onValueChange={(v) => updateField("stage", v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAGES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <FieldLabel>Lead category</FieldLabel>
                <Select value={lead?.priority} onValueChange={(v) => updateField("priority", v)}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-6 space-y-3 border-t border-slate-100 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Contact information
                </p>
                <InfoRow label="E-mail" value={lead?.contact.email || "Not Available"} />
                <InfoRow
                  label="Phone"
                  value={lead?.contact.primaryPhone ? formatPhone(lead.contact.primaryPhone) : "—"}
                />
                <InfoRow
                  label="Alternate"
                  value={lead?.contact.altPhone ? formatPhone(lead.contact.altPhone) : "Not Available"}
                />
              </div>

              <div className="mt-5 space-y-3 border-t border-slate-100 pt-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Lead information
                </p>
                <InfoRow label="Pre sales agent" value={assignedName} />
                <InfoRow label="Source" value={lead?.source?.primary?.replace(/_/g, " ") || "—"} />
                <InfoRow label="Channel partner" value={lead?.brokerId?.name || "—"} />
              </div>
            </aside>

            {/* Middle tabs */}
            <section className="flex min-h-0 flex-col overflow-hidden bg-slate-50">
              <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
                <div className="scrollbar-hide shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-3 pt-2">
                  <TabsList className="h-auto w-max max-w-none flex-nowrap rounded-none bg-transparent p-0">
                    {[
                      ["suggestion", "Suggestion"],
                      ["timeline", "Timeline"],
                      ["followup", "Followup"],
                      ["site_visit", "Site Visit"],
                      ["meeting", "Meeting"],
                      ["email", "E-Mail"],
                      ["call", "Call"],
                      ["sms", "SMS"],
                      ["whatsapp", "WhatsApp"],
                      ["projects", "Projects"],
                      ["documents", "Documents"],
                    ].map(([value, label]) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className="rounded-t-md rounded-b-none px-3 py-2 text-[12.5px] data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-none"
                      >
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto p-4">
                  <TabsContent value="suggestion" className="mt-0 space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <h4 className="text-[14px] font-semibold text-slate-900">Requirements</h4>
                        <Button size="sm" className="h-8 gap-1.5" onClick={savePreferences} disabled={savingPrefs}>
                          <Save className="size-3.5" />
                          Save
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <FieldLabel>Budget min</FieldLabel>
                          <Input
                            value={prefs.minBudget}
                            onChange={(e) => setPrefs((p) => ({ ...p, minBudget: e.target.value }))}
                            placeholder="Min"
                            className="h-9"
                          />
                        </div>
                        <div>
                          <FieldLabel>Budget max</FieldLabel>
                          <Input
                            value={prefs.maxBudget}
                            onChange={(e) => setPrefs((p) => ({ ...p, maxBudget: e.target.value }))}
                            placeholder="Max"
                            className="h-9"
                          />
                        </div>
                        <div>
                          <FieldLabel>Area min (sqft)</FieldLabel>
                          <Input
                            value={prefs.minArea}
                            onChange={(e) => setPrefs((p) => ({ ...p, minArea: e.target.value }))}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <FieldLabel>Area max (sqft)</FieldLabel>
                          <Input
                            value={prefs.maxArea}
                            onChange={(e) => setPrefs((p) => ({ ...p, maxArea: e.target.value }))}
                            className="h-9"
                          />
                        </div>
                        <div>
                          <FieldLabel>Property type</FieldLabel>
                          <Input
                            value={prefs.propertyType}
                            onChange={(e) => setPrefs((p) => ({ ...p, propertyType: e.target.value }))}
                            placeholder="Apartment / Villa…"
                            className="h-9"
                          />
                        </div>
                        <div>
                          <FieldLabel>City</FieldLabel>
                          <Input
                            value={prefs.city}
                            onChange={(e) => setPrefs((p) => ({ ...p, city: e.target.value }))}
                            className="h-9"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <FieldLabel>Location / locality</FieldLabel>
                          <Input
                            value={prefs.locality}
                            onChange={(e) => setPrefs((p) => ({ ...p, locality: e.target.value }))}
                            placeholder="Search location"
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <h4 className="text-[14px] font-semibold text-slate-900">
                        Suggested projects
                      </h4>
                      <p className="mt-1 text-[12px] text-slate-500">
                        Ranked by location and budget from requirements.
                      </p>
                      <div className="mt-3 space-y-2">
                        {suggested.length === 0 ? (
                          <p className="py-6 text-center text-[13px] text-slate-500">
                            No matching projects. Adjust requirements and save.
                          </p>
                        ) : (
                          suggested.map((p) => (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => updateField("primaryProjectId", p._id)}
                              className="flex w-full items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5 text-left transition-colors hover:border-emerald-300 hover:bg-emerald-50/40"
                            >
                              <div>
                                <p className="text-[13px] font-semibold text-slate-900">{p.name}</p>
                                <p className="text-[11px] text-slate-500">
                                  {[p.location?.locality, p.location?.city].filter(Boolean).join(", ") ||
                                    p.code}
                                </p>
                              </div>
                              <StatusPill tone="primary">Select</StatusPill>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="timeline" className="mt-0">
                    <ActivityComposer
                      remark={remark}
                      setRemark={setRemark}
                      onSubmit={submitRemark}
                    />
                    <ActivityList activities={activities} />
                  </TabsContent>

                  <TabsContent value="followup" className="mt-0 space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <FieldLabel>Next follow-up</FieldLabel>
                      <Input
                        type="datetime-local"
                        className="mt-1 h-9"
                        value={
                          lead?.nextActionAt
                            ? new Date(lead.nextActionAt).toISOString().slice(0, 16)
                            : ""
                        }
                        onChange={(e) =>
                          updateField(
                            "nextActionAt",
                            e.target.value ? new Date(e.target.value).toISOString() : null,
                          )
                        }
                      />
                      <FieldLabel className="mt-3">Note</FieldLabel>
                      <Textarea
                        className="mt-1"
                        rows={3}
                        defaultValue={lead?.nextActionNote ?? ""}
                        onBlur={(e) => updateField("nextActionNote", e.target.value)}
                        placeholder="What should happen next?"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="site_visit" className="mt-0 space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <h4 className="text-[14px] font-semibold">Schedule site visit</h4>
                      <div className="mt-3 grid gap-3 sm:grid-cols-2">
                        <div>
                          <FieldLabel>Project</FieldLabel>
                          <Select value={visitProjectId} onValueChange={setVisitProjectId}>
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select project" />
                            </SelectTrigger>
                            <SelectContent>
                              {projects.map((p) => (
                                <SelectItem key={p._id} value={p._id}>
                                  {p.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <FieldLabel>Date & time</FieldLabel>
                          <Input
                            type="datetime-local"
                            className="h-9"
                            value={visitAt}
                            onChange={(e) => setVisitAt(e.target.value)}
                          />
                        </div>
                      </div>
                      <Button
                        className="mt-3 gap-1.5"
                        size="sm"
                        disabled={!visitProjectId || !visitAt}
                        onClick={async () => {
                          if (!leadId || !visitProjectId || !visitAt) return;
                          const res = await fetch("/api/visits", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              leadId,
                              projectId: visitProjectId,
                              scheduledAt: new Date(visitAt).toISOString(),
                            }),
                          });
                          if (res.ok) {
                            toast.success("Site visit scheduled");
                            setVisitAt("");
                            await load(leadId);
                            onChanged();
                          } else {
                            toast.error("Could not schedule visit");
                          }
                        }}
                      >
                        <CalendarPlus className="size-4" />
                        Schedule
                      </Button>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <h4 className="mb-2 text-[14px] font-semibold">Visits</h4>
                      {visits.length === 0 ? (
                        <p className="py-6 text-center text-[13px] text-slate-500">No visits yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {visits.map((v) => (
                            <li
                              key={v._id}
                              className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-[13px]"
                            >
                              <div>
                                <p className="font-medium text-slate-800">
                                  {v.projectId?.name ?? "Project"}
                                </p>
                                <p className="text-[12px] text-slate-500">
                                  {new Date(v.scheduledAt).toLocaleString("en-IN")}
                                </p>
                              </div>
                              <StatusPill tone="info">{v.status}</StatusPill>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </TabsContent>

                  {(["meeting", "email", "call", "sms", "whatsapp"] as const).map((key) => (
                    <TabsContent key={key} value={key} className="mt-0">
                      <ActivityComposer
                        remark={remark}
                        setRemark={setRemark}
                        onSubmit={async () => {
                          const map: Record<string, string> = {
                            meeting: "meeting_logged",
                            email: "email_sent",
                            call: "call_made",
                            sms: "sms_sent",
                            whatsapp: "whatsapp_sent",
                          };
                          await logActivity(
                            map[key],
                            remark.trim() || `${key} logged`,
                            key === "meeting" ? "in_person" : key,
                          );
                          if (key === "meeting" && leadId) {
                            await fetch("/api/tasks", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                title: `Meeting with ${lead?.contact.name}`,
                                type: "meeting",
                                leadId,
                                remark: remark.trim() || undefined,
                                scheduleAt: new Date().toISOString(),
                              }),
                            });
                          }
                          setRemark("");
                        }}
                        placeholder={`Log a ${key}…`}
                      />
                      <ActivityList
                        activities={activities.filter((a) =>
                          key === "meeting"
                            ? a.type.includes("meeting") || a.channel === "in_person"
                            : a.type.includes(key),
                        )}
                      />
                    </TabsContent>
                  ))}

                  <TabsContent value="projects" className="mt-0">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <h4 className="mb-3 text-[14px] font-semibold">Interested projects</h4>
                      {typeof lead?.primaryProjectId === "object" && lead.primaryProjectId ? (
                        <div className="rounded-lg bg-emerald-50 px-3 py-2 text-[13px] font-medium text-emerald-800">
                          {lead.primaryProjectId.name}
                        </div>
                      ) : (
                        <p className="text-[13px] text-slate-500">No primary project selected.</p>
                      )}
                      <div className="mt-3 space-y-2">
                        {projects.slice(0, 10).map((p) => (
                          <button
                            key={p._id}
                            type="button"
                            className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-[13px] hover:bg-slate-50"
                            onClick={() => updateField("primaryProjectId", p._id)}
                          >
                            {p.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="documents" className="mt-0 space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <h4 className="text-[14px] font-semibold">Upload document</h4>
                      <p className="mt-1 text-[12px] text-slate-500">PDF, images or docs up to 8MB.</p>
                      <Input
                        type="file"
                        className="mt-3 h-10"
                        disabled={uploading || !leadId}
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file || !leadId) return;
                          setUploading(true);
                          try {
                            const fd = new FormData();
                            fd.append("file", file);
                            const res = await fetch(`/api/leads/${leadId}/documents`, {
                              method: "POST",
                              body: fd,
                            });
                            const d = await res.json();
                            if (res.ok) {
                              setDocuments(d.documents ?? []);
                              toast.success("Document uploaded");
                              await load(leadId);
                            } else {
                              toast.error(d.error ?? "Upload failed");
                            }
                          } finally {
                            setUploading(false);
                            e.target.value = "";
                          }
                        }}
                      />
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <h4 className="mb-2 text-[14px] font-semibold">Files</h4>
                      {documents.length === 0 ? (
                        <p className="py-8 text-center text-[13px] text-slate-500">No documents yet.</p>
                      ) : (
                        <ul className="space-y-2">
                          {documents.map((doc) => (
                            <li
                              key={doc.url}
                              className="flex items-center justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2 text-[13px]"
                            >
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-800">{doc.name}</p>
                                <p className="text-[11px] text-slate-500">
                                  {doc.uploadedAt
                                    ? new Date(doc.uploadedAt).toLocaleString("en-IN")
                                    : ""}
                                  {doc.size ? ` · ${(doc.size / 1024).toFixed(0)} KB` : ""}
                                </p>
                              </div>
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="shrink-0 text-[12px] font-semibold text-emerald-700 hover:underline"
                              >
                                Open
                              </a>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </section>

            {/* Right details */}
            <aside className="scrollbar-hide overflow-y-auto border-l border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Details — information management
                </p>
                <button
                  type="button"
                  className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  onClick={() => leadId && load(leadId)}
                  aria-label="Refresh"
                >
                  <RefreshCw className="size-3.5" />
                </button>
              </div>

              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Other details
                </p>
                <InfoRow label="Priority" value={lead?.priority ?? "—"} />
                <InfoRow label="Tags" value={lead?.tags?.join(", ") || "—"} />
                <InfoRow
                  label="Created"
                  value={
                    lead?.createdAt
                      ? new Date(lead.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—"
                  }
                />
              </div>

              <ActivityCard title="Last activity" activity={lastActivity} />
              <ActivityCard title="First activity" activity={firstActivity} />

              <div className="mt-3 rounded-lg border border-slate-200 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  First stage details
                </p>
                <InfoRow
                  label="Updated date"
                  value={
                    lead?.createdAt
                      ? new Date(lead.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "—"
                  }
                />
                <InfoRow
                  label="Stage name"
                  value={STAGES.find((s) => s.value === lead?.stage)?.label ?? lead?.stage ?? "—"}
                />
              </div>

              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="h-8 flex-1 gap-1" asChild>
                  <a href={`/visits?leadId=${lead?._id ?? ""}`}>
                    <CalendarPlus className="size-3.5" />
                    Visit
                  </a>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-red-600 hover:bg-red-50"
                  onClick={remove}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </aside>
          </div>
        )}
      </SheetContent>
    </Sheet>
    <AddTaskDialog
      open={taskOpen}
      onOpenChange={setTaskOpen}
      leadId={lead?._id}
      leadName={lead?.contact.name}
      onCreated={() => {
        if (leadId) load(leadId);
        onChanged();
      }}
    />
    </>
  );
}

function QuickAction({
  label,
  color,
  icon: Icon,
  onClick,
}: {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1">
      <span className={cn("inline-flex size-10 items-center justify-center rounded-full text-white", color)}>
        <Icon className="size-4" strokeWidth={2} />
      </span>
      <span className="text-[10px] font-medium text-slate-600">{label}</span>
    </button>
  );
}

function FieldLabel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("text-[11px] font-medium uppercase tracking-wider text-slate-400", className)}>
      {children}
    </p>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-slate-100 py-2 last:border-0">
      <p className="text-[10.5px] font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-0.5 text-[13px] text-slate-800">{value}</p>
    </div>
  );
}

function ActivityComposer({
  remark,
  setRemark,
  onSubmit,
  placeholder = "Enter remark…",
}: {
  remark: string;
  setRemark: (v: string) => void;
  onSubmit: () => void;
  placeholder?: string;
}) {
  return (
    <div className="mb-4 rounded-xl border border-slate-200 bg-white p-4">
      <FieldLabel>Add remark</FieldLabel>
      <Textarea
        className="mt-1"
        rows={3}
        value={remark}
        onChange={(e) => setRemark(e.target.value)}
        placeholder={placeholder}
      />
      <div className="mt-2 flex justify-end gap-2">
        <Button variant="outline" size="sm" onClick={() => setRemark("")}>
          Clear
        </Button>
        <Button size="sm" onClick={onSubmit}>
          Submit
        </Button>
      </div>
    </div>
  );
}

function ActivityList({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return <p className="py-8 text-center text-[13px] text-slate-500">No activity yet.</p>;
  }
  return (
    <ol className="space-y-3">
      {activities.map((a) => (
        <li key={a._id} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
          <p className="text-[13px] font-medium capitalize text-slate-900">
            {a.type.replace(/_/g, " ")}
          </p>
          {a.description ? (
            <p className="mt-0.5 text-[12.5px] text-slate-600">{a.description}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-slate-400">
            {new Date(a.occurredAt).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            {a.actorName ? ` · ${a.actorName}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

function ActivityCard({ title, activity }: { title: string; activity?: Activity }) {
  return (
    <div className="mt-3 rounded-lg border border-slate-200 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{title}</p>
      {activity ? (
        <>
          <p className="mt-2 text-[13px] font-medium capitalize text-slate-900">
            {activity.type.replace(/_/g, " ")}
            {activity.description ? ` — ${activity.description}` : ""}
          </p>
          <p className="mt-1 text-[11px] text-slate-400">
            {new Date(activity.occurredAt).toLocaleString("en-IN", {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </>
      ) : (
        <p className="mt-2 text-[12.5px] text-slate-500">No data</p>
      )}
    </div>
  );
}
