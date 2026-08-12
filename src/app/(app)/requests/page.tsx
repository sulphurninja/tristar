"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ClipboardList,
  Plus,
  Check,
  X,
  Clock,
  Filter,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { useAuth } from "@/contexts/AuthContext";
import { hasRole, type Role } from "@/lib/roles";

interface RequestRow {
  _id: string;
  type: string;
  title: string;
  description?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  raisedBy?: { _id: string; name: string };
  assignedTo?: { _id: string; name: string };
  createdAt: string;
  decidedAt?: string;
}

const TYPES = [
  { value: "reassignment", label: "Lead reassignment" },
  { value: "status_override", label: "Status override" },
  { value: "lead_delete", label: "Delete lead" },
  { value: "data_export", label: "Data export" },
  { value: "duplicate_claim", label: "Claim duplicate" },
  { value: "site_visit_extension", label: "Site visit extension" },
  { value: "discount_approval", label: "Discount approval" },
  { value: "other", label: "Other" },
];

const TYPE_LABEL: Record<string, string> = TYPES.reduce(
  (acc, t) => ({ ...acc, [t.value]: t.label }),
  {} as Record<string, string>,
);

export default function RequestsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [items, setItems] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);

  const load = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab !== "all") params.set("status", tab);
    fetch(`/api/requests?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.requests ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const decide = async (id: string, status: "approved" | "rejected") => {
    const res = await fetch(`/api/requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Request ${status}`);
      load();
    } else {
      const j = await res.json();
      toast.error(j.error || "Couldn't update request.");
    }
  };

  const canApprove = user ? hasRole(user.role as Role, "manager") : false;

  return (
    <div className="flex flex-1 flex-col bg-white">
      <div className="sticky top-0 z-20 flex flex-wrap items-center gap-3 border-b border-slate-200/70 bg-white px-7 py-3 lg:px-10">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>
        <Button variant="outline" className="ml-auto gap-1.5">
          <Filter className="size-4" strokeWidth={1.75} />
          Filter
        </Button>
        <Button onClick={() => setOpenNew(true)} className="gap-1.5">
          <Plus className="size-4" strokeWidth={2} />
          New request
        </Button>
      </div>

      <div className="flex-1 px-7 py-6 lg:px-10">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-16 animate-pulse rounded-md bg-slate-100" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="size-5 text-emerald-600" strokeWidth={1.75} />}
            title="No requests"
            description={
              tab === "pending"
                ? "Nothing pending — your team is on top of it."
                : "Nothing here yet."
            }
            action={
              <Button onClick={() => setOpenNew(true)} className="gap-1.5">
                <Plus className="size-4" strokeWidth={2} /> Raise a request
              </Button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {items.map((r) => (
              <li
                key={r._id}
                className="rounded-xl border border-slate-200/70 bg-white p-4 shadow-xs"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-slate-900">{r.title}</p>
                      <StatusPill
                        tone={
                          r.status === "approved"
                            ? "success"
                            : r.status === "rejected"
                              ? "danger"
                              : r.status === "cancelled"
                                ? "neutral"
                                : "warning"
                        }
                        dot
                      >
                        {r.status}
                      </StatusPill>
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-600">
                        {TYPE_LABEL[r.type] ?? r.type}
                      </span>
                    </div>
                    {r.description ? (
                      <p className="mt-1 text-[12.5px] leading-relaxed text-slate-600">
                        {r.description}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-3 text-[11.5px] text-slate-500">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3" />
                        {new Date(r.createdAt).toLocaleString("en-IN", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </span>
                      <span>by {r.raisedBy?.name ?? "—"}</span>
                      {r.assignedTo ? (
                        <span>· to {r.assignedTo.name}</span>
                      ) : null}
                    </div>
                  </div>
                  {r.status === "pending" && canApprove ? (
                    <div className="flex items-center gap-1.5">
                      <Button
                        size="sm"
                        className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                        onClick={() => decide(r._id, "approved")}
                      >
                        <Check className="size-3.5" strokeWidth={2} /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => decide(r._id, "rejected")}
                      >
                        <X className="size-3.5" strokeWidth={2} /> Reject
                      </Button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <NewRequestDialog open={openNew} onOpenChange={setOpenNew} onCreated={load} />
    </div>
  );
}

function NewRequestDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ type: "reassignment", title: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setForm({ type: "reassignment", title: "", description: "" });
  }, [open]);

  const submit = async () => {
    if (!form.title) {
      toast.error("Add a title.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't raise request.");
        return;
      }
      toast.success("Request raised");
      onCreated();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Title</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Reassign lead TS-2026-00012 to Aman"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Why this needs approval."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Raise request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
