"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const NONE = "__none";

interface ProjectOpt {
  _id: string;
  name: string;
  code?: string;
}

interface LeadOpt {
  _id: string;
  contact?: { name?: string };
  leadNumber?: string;
}

interface BrokerOpt {
  _id: string;
  name?: string;
  firmName?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

function defaultBookedAtLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export function AddBookingDialog({ open, onOpenChange, onCreated }: Props) {
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [leads, setLeads] = useState<LeadOpt[]>([]);
  const [brokers, setBrokers] = useState<BrokerOpt[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [amount, setAmount] = useState("");
  const [projectId, setProjectId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [brokerId, setBrokerId] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");
  const [bookedAt, setBookedAt] = useState(defaultBookedAtLocal);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCustomerName("");
    setAmount("");
    setProjectId("");
    setLeadId("");
    setBrokerId("");
    setSource("");
    setNotes("");
    setBookedAt(defaultBookedAtLocal());

    Promise.all([
      fetch("/api/projects?limit=100", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/leads?limit=50", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/brokers?limit=50", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([p, l, b]) => {
        setProjects(p.projects ?? []);
        setLeads(l.leads ?? []);
        setBrokers(b.brokers ?? []);
      })
      .catch(() => {});
  }, [open]);

  const submit = async () => {
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          amount: Number(amount),
          projectId: projectId || undefined,
          leadId: leadId || undefined,
          brokerId: brokerId || undefined,
          source: source.trim() || undefined,
          notes: notes.trim() || undefined,
          bookedAt: bookedAt ? new Date(bookedAt).toISOString() : undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Failed to create booking");
      toast.success("Booking created");
      onOpenChange(false);
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create booking");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0">
        <DialogHeader className="border-b border-slate-100 px-5 py-4">
          <DialogTitle className="text-[16px] font-semibold text-slate-800">
            Add booking
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[min(70vh,640px)] space-y-3 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Customer name *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Amount *</Label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select
              value={projectId || NONE}
              onValueChange={(v) => setProjectId(v === NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select project" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                    {p.code ? ` (${p.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Lead</Label>
              <Select
                value={leadId || NONE}
                onValueChange={(v) => setLeadId(v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {leads.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.contact?.name ?? "Lead"}
                      {l.leadNumber ? ` · ${l.leadNumber}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Broker</Label>
              <Select
                value={brokerId || NONE}
                onValueChange={(v) => setBrokerId(v === NONE ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>None</SelectItem>
                  {brokers.map((b) => (
                    <SelectItem key={b._id} value={b._id}>
                      {b.name ?? b.firmName ?? "Broker"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Source</Label>
              <Input
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="Lead source"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Booked at</Label>
              <Input
                type="datetime-local"
                value={bookedAt}
                onChange={(e) => setBookedAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          <Button onClick={submit} disabled={saving} className="min-w-24">
            {saving ? "Saving…" : "Submit"}
          </Button>
          <DialogClose asChild>
            <Button variant="secondary" disabled={saving}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
