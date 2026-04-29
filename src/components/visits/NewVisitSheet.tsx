"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Lead {
  _id: string;
  contact: { name: string; primaryPhone: string };
  leadNumber?: string;
}
interface Project {
  _id: string;
  name: string;
  code: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  defaultLeadId?: string;
}

export function NewVisitSheet({ open, onOpenChange, onCreated, defaultLeadId }: Props) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    leadId: defaultLeadId ?? "",
    projectId: "",
    scheduledAt: "",
    durationMinutes: "60",
    mode: "in_person",
    virtualLink: "",
  });

  useEffect(() => {
    if (!open) return;
    Promise.all([
      fetch("/api/leads?limit=200").then((r) => r.json()),
      fetch("/api/projects?limit=200").then((r) => r.json()),
    ]).then(([l, p]) => {
      setLeads(l.leads ?? []);
      setProjects(p.projects ?? []);
    });
  }, [open]);

  useEffect(() => {
    if (defaultLeadId) setForm((f) => ({ ...f, leadId: defaultLeadId }));
  }, [defaultLeadId]);

  const submit = async () => {
    if (!form.leadId || !form.projectId || !form.scheduledAt) {
      toast.error("Lead, project and time are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId: form.leadId,
          projectId: form.projectId,
          scheduledAt: new Date(form.scheduledAt).toISOString(),
          durationMinutes: Number(form.durationMinutes),
          mode: form.mode,
          virtualLink: form.virtualLink || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Couldn't schedule visit.");
        return;
      }
      toast.success("Visit scheduled");
      onOpenChange(false);
      onCreated();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="lg">
        <SheetHeader>
          <SheetTitle>Schedule site visit</SheetTitle>
          <SheetDescription>
            We&apos;ll move the lead to &quot;Visit booked&quot; and prepare reminders.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          <Field label="Lead" required>
            <Select value={form.leadId} onValueChange={(v) => setForm({ ...form, leadId: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a lead" />
              </SelectTrigger>
              <SelectContent>
                {leads.length === 0 ? (
                  <div className="px-2 py-3 text-[12px] text-slate-400">
                    No leads yet. Add a lead first.
                  </div>
                ) : (
                  leads.map((l) => (
                    <SelectItem key={l._id} value={l._id}>
                      {l.contact.name}{" "}
                      <span className="text-slate-400">· {l.leadNumber}</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Project" required>
            <Select
              value={form.projectId}
              onValueChange={(v) => setForm({ ...form, projectId: v })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choose a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.length === 0 ? (
                  <div className="px-2 py-3 text-[12px] text-slate-400">
                    No projects yet. Add a project first.
                  </div>
                ) : (
                  projects.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name} <span className="text-slate-400">· {p.code}</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Date & time" required>
              <Input
                type="datetime-local"
                value={form.scheduledAt}
                onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
              />
            </Field>
            <Field label="Duration (min)">
              <Input
                type="number"
                value={form.durationMinutes}
                onChange={(e) =>
                  setForm({ ...form, durationMinutes: e.target.value })
                }
              />
            </Field>
          </div>

          <Field label="Mode">
            <Select value={form.mode} onValueChange={(v) => setForm({ ...form, mode: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_person">In-person</SelectItem>
                <SelectItem value="virtual">Virtual walkthrough</SelectItem>
                <SelectItem value="phygital">Phygital (in-person + virtual)</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          {form.mode !== "in_person" ? (
            <Field label="Meeting link">
              <Input
                value={form.virtualLink}
                onChange={(e) => setForm({ ...form, virtualLink: e.target.value })}
                placeholder="https://meet.google.com/…"
              />
            </Field>
          ) : null}
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="ghost">Cancel</Button>
          </SheetClose>
          <Button onClick={submit} loading={saving}>
            Schedule visit
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-[12px] font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </Label>
      {children}
    </div>
  );
}
