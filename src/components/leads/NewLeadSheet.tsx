"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

interface Project {
  _id: string;
  name: string;
  code: string;
}
interface Stage {
  _id: string;
  key: string;
  label: string;
  order: number;
  type: "open" | "won" | "lost";
}
interface Pipeline {
  _id: string;
  name: string;
  isDefault: boolean;
  stages: Stage[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
  /** Pre-select this pipeline. Useful when launching from a Pipeline view. */
  defaultPipelineId?: string;
}

const SOURCES = [
  { value: "walkin", label: "Walk-in" },
  { value: "channel_partner", label: "Channel partner" },
  { value: "telecalling", label: "Telecalling" },
  { value: "website", label: "Website" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google_ads", label: "Google Ads" },
  { value: "magicbricks", label: "Magicbricks" },
  { value: "99acres", label: "99acres" },
  { value: "housing", label: "Housing.com" },
  { value: "referral", label: "Referral" },
  { value: "exhibition", label: "Exhibition" },
  { value: "other", label: "Other" },
];

export function NewLeadSheet({ open, onOpenChange, onCreated, defaultPipelineId }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    primaryPhone: "",
    email: "",
    primaryProjectId: "",
    pipelineId: "",
    stage: "",
    source: "other",
    priority: "medium",
    minBudget: "",
    maxBudget: "",
    configurations: "",
    description: "",
  });

  useEffect(() => {
    if (!open) return;
    fetch("/api/projects?limit=200")
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {});
    fetch("/api/pipelines")
      .then((r) => r.json())
      .then((d) => {
        const list: Pipeline[] = d.pipelines ?? [];
        setPipelines(list);
        const initialPipeline =
          list.find((p) => p._id === defaultPipelineId)?._id ??
          list.find((p) => p.isDefault)?._id ??
          list[0]?._id ??
          "";
        const initialStage =
          list
            .find((p) => p._id === initialPipeline)
            ?.stages.slice()
            .sort((a, b) => a.order - b.order)[0]?.key ?? "";
        setForm((f) => ({ ...f, pipelineId: initialPipeline, stage: initialStage }));
      })
      .catch(() => {});
  }, [open, defaultPipelineId]);

  const activeStages = useMemo(() => {
    const p = pipelines.find((x) => x._id === form.pipelineId);
    return p?.stages.slice().sort((a, b) => a.order - b.order) ?? [];
  }, [pipelines, form.pipelineId]);

  const reset = () =>
    setForm((f) => ({
      ...f,
      name: "",
      primaryPhone: "",
      email: "",
      primaryProjectId: "",
      source: "other",
      priority: "medium",
      minBudget: "",
      maxBudget: "",
      configurations: "",
      description: "",
    }));

  const submit = async () => {
    if (!form.name || !form.primaryPhone) {
      toast.error("Name and phone are required.");
      return;
    }
    if (!form.pipelineId) {
      toast.error("Choose a pipeline first.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contact: {
            name: form.name,
            primaryPhone: form.primaryPhone,
            email: form.email || undefined,
          },
          primaryProjectId: form.primaryProjectId || undefined,
          pipelineId: form.pipelineId,
          stage: form.stage || undefined,
          source: form.source,
          priority: form.priority,
          preferences: {
            configurations: form.configurations
              ? form.configurations
                  .split(",")
                  .map((c) => c.trim())
                  .filter(Boolean)
              : [],
            minBudget: form.minBudget ? Number(form.minBudget) : undefined,
            maxBudget: form.maxBudget ? Number(form.maxBudget) : undefined,
          },
          description: form.description || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Couldn't create lead.");
        return;
      }
      toast.success("Lead created");
      reset();
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
          <SheetTitle>New lead</SheetTitle>
          <SheetDescription>
            Capture a new prospect. We&apos;ll auto-generate a lead number and assign it to you.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Aarav Sharma"
              />
            </Field>
            <Field label="Phone" required>
              <Input
                value={form.primaryPhone}
                onChange={(e) => setForm({ ...form, primaryPhone: e.target.value })}
                placeholder="+91 98765 43210"
                inputMode="tel"
              />
            </Field>
          </div>
          <Field label="Email">
            <Input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="aarav@example.com"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Pipeline" required>
              <Select
                value={form.pipelineId}
                onValueChange={(v) => {
                  const p = pipelines.find((x) => x._id === v);
                  const firstStage =
                    p?.stages.slice().sort((a, b) => a.order - b.order)[0]?.key ?? "";
                  setForm({ ...form, pipelineId: v, stage: firstStage });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select pipeline" />
                </SelectTrigger>
                <SelectContent>
                  {pipelines.length === 0 ? (
                    <div className="px-2 py-3 text-[12px] text-slate-400">
                      No pipelines configured.
                    </div>
                  ) : (
                    pipelines.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.name}
                        {p.isDefault ? (
                          <span className="ml-2 rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-700">
                            Default
                          </span>
                        ) : null}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Stage">
              <Select
                value={form.stage}
                onValueChange={(v) => setForm({ ...form, stage: v })}
                disabled={activeStages.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select stage" />
                </SelectTrigger>
                <SelectContent>
                  {activeStages.map((s) => (
                    <SelectItem key={s._id} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Interested project">
              <Select
                value={form.primaryProjectId}
                onValueChange={(v) => setForm({ ...form, primaryProjectId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.length === 0 ? (
                    <div className="px-2 py-3 text-[12px] text-slate-400">
                      No projects yet. Add one in Projects.
                    </div>
                  ) : (
                    projects.map((p) => (
                      <SelectItem key={p._id} value={p._id}>
                        {p.name}{" "}
                        <span className="text-slate-400">· {p.code}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Source">
              <Select
                value={form.source}
                onValueChange={(v) => setForm({ ...form, source: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SOURCES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Priority">
              <Select
                value={form.priority}
                onValueChange={(v) => setForm({ ...form, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="vip">VIP</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Min budget (₹)">
              <Input
                type="number"
                value={form.minBudget}
                onChange={(e) => setForm({ ...form, minBudget: e.target.value })}
                placeholder="5000000"
              />
            </Field>
            <Field label="Max budget (₹)">
              <Input
                type="number"
                value={form.maxBudget}
                onChange={(e) => setForm({ ...form, maxBudget: e.target.value })}
                placeholder="8500000"
              />
            </Field>
          </div>

          <Field label="Configurations" hint="Comma-separated, e.g. 2BHK, 3BHK">
            <Input
              value={form.configurations}
              onChange={(e) => setForm({ ...form, configurations: e.target.value })}
              placeholder="2BHK, 3BHK"
            />
          </Field>

          <Field label="Notes">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Any context the team should know."
            />
          </Field>
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="ghost">Cancel</Button>
          </SheetClose>
          <Button onClick={submit} loading={saving}>
            Create lead
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-[12px] font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}
