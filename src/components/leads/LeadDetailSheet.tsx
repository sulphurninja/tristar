"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Phone,
  MessageSquare,
  Mail,
  CalendarPlus,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetBody,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
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
import { formatPhone } from "@/lib/utils";

const STAGES = [
  { value: "new", label: "New" },
  { value: "attempted_1", label: "Attempted 1" },
  { value: "attempted_2", label: "Attempted 2" },
  { value: "warm", label: "Warm" },
  { value: "hot", label: "Hot" },
  { value: "interested", label: "Interested" },
  { value: "site_visit_scheduled", label: "Visit booked" },
  { value: "site_visit_done", label: "Visit done" },
  { value: "negotiating", label: "Negotiating" },
  { value: "booked", label: "Booked" },
  { value: "lost", label: "Lost" },
  { value: "not_interested", label: "Not interested" },
  { value: "cnr", label: "Could not reach" },
  { value: "duplicate", label: "Duplicate" },
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
  };
  primaryProjectId?: { _id: string; name: string; code: string } | string | null;
  assignedTo?: { _id: string; name: string; email: string } | string | null;
  createdAt: string;
  lastContactedAt?: string;
}

interface Activity {
  _id: string;
  type: string;
  description?: string;
  occurredAt: string;
  actorName?: string;
}

interface Props {
  leadId: string | null;
  onOpenChange: (v: boolean) => void;
  onChanged: () => void;
}

export function LeadDetailSheet({ leadId, onOpenChange, onChanged }: Props) {
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState("");
  const [logging, setLogging] = useState(false);
  const open = !!leadId;

  useEffect(() => {
    if (!leadId) {
      setLead(null);
      setActivities([]);
      return;
    }
    setLoading(true);
    fetch(`/api/leads/${leadId}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.lead) {
          setLead(d.lead);
          setActivities(d.activities ?? []);
        }
      })
      .finally(() => setLoading(false));
  }, [leadId]);

  const updateField = async (field: string, value: string) => {
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
      /* Refresh timeline */
      const a = await fetch(`/api/leads/${leadId}`).then((r) => r.json());
      setActivities(a.activities ?? []);
    } else {
      toast.error("Couldn't update");
    }
  };

  const logComment = async () => {
    if (!comment.trim() || !leadId) return;
    setLogging(true);
    try {
      await fetch(`/api/leads/${leadId}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "comment_added", description: comment }),
      });
      const a = await fetch(`/api/leads/${leadId}`).then((r) => r.json());
      setActivities(a.activities ?? []);
      setComment("");
      toast.success("Comment added");
    } finally {
      setLogging(false);
    }
  };

  const logQuickAction = async (
    type: "call_made" | "whatsapp_sent" | "email_sent",
    description: string,
  ) => {
    if (!leadId) return;
    await fetch(`/api/leads/${leadId}/activities`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, description, channel: type.split("_")[0] }),
    });
    const a = await fetch(`/api/leads/${leadId}`).then((r) => r.json());
    setActivities(a.activities ?? []);
    toast.success("Logged");
  };

  const remove = async () => {
    if (!leadId) return;
    if (!confirm("Delete this lead? This can't be undone.")) return;
    const res = await fetch(`/api/leads/${leadId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Deleted");
      onOpenChange(false);
      onChanged();
    } else {
      toast.error("Couldn't delete");
    }
  };

  const project =
    typeof lead?.primaryProjectId === "object" ? lead?.primaryProjectId : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="2xl">
        <SheetHeader className="pb-4">
          <div className="flex items-start gap-3">
            <div className="flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-700 text-[14px] font-bold text-white">
              {(lead?.contact.name ?? "?").charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="truncate text-[19px]">
                {lead?.contact.name ?? (loading ? "Loading…" : "—")}
              </SheetTitle>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[12.5px] text-slate-500">
                <span className="font-mono text-[11.5px]">{lead?.leadNumber}</span>
                {lead?.contact.primaryPhone ? (
                  <>
                    <span className="text-slate-300">·</span>
                    <span>{formatPhone(lead.contact.primaryPhone)}</span>
                  </>
                ) : null}
                {lead?.contact.email ? (
                  <>
                    <span className="text-slate-300">·</span>
                    <span>{lead.contact.email}</span>
                  </>
                ) : null}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div>
              <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                Stage
              </p>
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
            </div>
            <div>
              <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
                Priority
              </p>
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
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-lg"
              onClick={() => logQuickAction("call_made", "Outbound call logged.")}
            >
              <Phone className="size-4" strokeWidth={1.75} />
              Call
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-lg"
              onClick={() => logQuickAction("whatsapp_sent", "WhatsApp sent.")}
            >
              <MessageSquare className="size-4" strokeWidth={1.75} />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 gap-1.5 rounded-lg"
              onClick={() => logQuickAction("email_sent", "Email sent.")}
            >
              <Mail className="size-4" strokeWidth={1.75} />
              Email
            </Button>
          </div>
        </SheetHeader>

        <SheetBody className="px-0 py-0">
          <Tabs defaultValue="overview" className="flex h-full flex-col">
            <div className="border-b border-slate-200 px-6 pt-4">
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="timeline">Timeline</TabsTrigger>
                <TabsTrigger value="preferences">Preferences</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="overview" className="mt-0 flex-1 overflow-y-auto px-6 py-5">
              <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-[13px]">
                <Detail label="Project of interest">
                  {project ? (
                    <span>
                      {project.name}{" "}
                      <span className="text-slate-400">· {project.code}</span>
                    </span>
                  ) : (
                    <span className="text-slate-400">Not set</span>
                  )}
                </Detail>
                <Detail label="Assigned to">
                  {typeof lead?.assignedTo === "object" && lead?.assignedTo
                    ? lead.assignedTo.name
                    : "Unassigned"}
                </Detail>
                <Detail label="Last contacted">
                  {lead?.lastContactedAt
                    ? new Date(lead.lastContactedAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })
                    : "Never"}
                </Detail>
                <Detail label="Created">
                  {lead?.createdAt
                    ? new Date(lead.createdAt).toLocaleString("en-IN", {
                        dateStyle: "medium",
                      })
                    : "—"}
                </Detail>
                {lead?.preferences?.minBudget || lead?.preferences?.maxBudget ? (
                  <Detail label="Budget" full>
                    ₹{(lead.preferences.minBudget ?? 0).toLocaleString("en-IN")} —
                    ₹{(lead.preferences.maxBudget ?? 0).toLocaleString("en-IN")}
                  </Detail>
                ) : null}
                {lead?.preferences?.configurations?.length ? (
                  <Detail label="Configurations" full>
                    <div className="flex flex-wrap gap-1.5">
                      {lead.preferences.configurations.map((c) => (
                        <StatusPill key={c} tone="info">
                          {c}
                        </StatusPill>
                      ))}
                    </div>
                  </Detail>
                ) : null}
                {lead?.description ? (
                  <Detail label="Notes" full>
                    {lead.description}
                  </Detail>
                ) : null}
              </dl>

              <div className="mt-6 border-t border-slate-200 pt-5">
                <p className="mb-2 text-[12px] font-semibold text-slate-700">Add a comment</p>
                <Textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What did you discuss? Next steps?"
                />
                <div className="mt-2 flex items-center justify-end">
                  <Button size="sm" onClick={logComment} loading={logging}>
                    Log comment
                  </Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="mt-0 flex-1 overflow-y-auto px-6 py-5">
              {activities.length === 0 ? (
                <p className="text-center text-[13px] text-slate-500">
                  No activity yet.
                </p>
              ) : (
                <ol className="relative space-y-4">
                  <span className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                  {activities.map((a) => (
                    <li key={a._id} className="relative pl-6">
                      <span className="absolute left-0 top-1.5 size-3.5 rounded-full bg-white ring-2 ring-emerald-500" />
                      <p className="text-[13px] text-slate-700">
                        <span className="font-medium text-slate-900">
                          {a.type.replace(/_/g, " ")}
                        </span>
                        {a.description ? <span className="ml-1.5 text-slate-500">— {a.description}</span> : null}
                      </p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {new Date(a.occurredAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </li>
                  ))}
                </ol>
              )}
            </TabsContent>

            <TabsContent value="preferences" className="mt-0 flex-1 overflow-y-auto px-6 py-5">
              <p className="text-[13px] text-slate-500">
                Detailed preferences editing coming soon.
              </p>
            </TabsContent>
          </Tabs>
        </SheetBody>

        <SheetFooter>
          <Button
            variant="ghost"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={remove}
          >
            <Trash2 className="size-4" strokeWidth={1.75} />
            Delete
          </Button>
          <div className="flex-1" />
          <Button
            asChild
            variant="outline"
            className="gap-1.5"
          >
            <a href={`/visits?leadId=${lead?._id ?? ""}`}>
              <CalendarPlus className="size-4" strokeWidth={1.75} />
              Schedule visit
            </a>
          </Button>
          <SheetClose asChild>
            <Button variant="default" className="gap-1.5">
              <Sparkles className="size-4" strokeWidth={1.75} />
              Done
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Detail({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-[13px] text-slate-700">{children}</dd>
    </div>
  );
}
