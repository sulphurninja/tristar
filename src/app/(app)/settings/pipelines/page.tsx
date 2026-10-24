"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Plus,
  KanbanSquare,
  Pencil,
  Trash2,
  Star,
  StarOff,
  ArrowRight,
  CheckCircle2,
  Circle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { stageAccent, type StageColorKey } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";

interface Stage {
  _id: string;
  key: string;
  label: string;
  type: "open" | "won" | "lost";
  color: string;
  probability: number;
  order: number;
  isSystem?: boolean;
}

interface Pipeline {
  _id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  accent: string;
  stages: Stage[];
  createdAt: string;
}

type Counts = Record<string, Record<string, number>>;

const TEMPLATES = [
  {
    id: "residential",
    label: "Residential Sales",
    description: "Standard new-property sales workflow.",
    stages: [
      { key: "new", label: "New", type: "open", probability: 5, color: "slate" },
      { key: "qualified", label: "Qualified", type: "open", probability: 20, color: "sky" },
      {
        key: "site_visit_scheduled",
        label: "Visit Scheduled",
        type: "open",
        probability: 50,
        color: "violet",
      },
      {
        key: "site_visit_done",
        label: "Visit Done",
        type: "open",
        probability: 70,
        color: "violet",
      },
      {
        key: "negotiating",
        label: "Negotiating",
        type: "open",
        probability: 80,
        color: "orange",
      },
      { key: "booked", label: "Booked", type: "won", probability: 100, color: "emerald" },
      { key: "lost", label: "Lost", type: "lost", probability: 0, color: "rose" },
    ],
  },
  {
    id: "rental",
    label: "Rental",
    description: "Track rental enquiries from lead to lease signed.",
    stages: [
      { key: "new", label: "New", type: "open", probability: 5, color: "slate" },
      { key: "shortlisted", label: "Shortlisted", type: "open", probability: 25, color: "sky" },
      { key: "viewing_done", label: "Viewing Done", type: "open", probability: 60, color: "violet" },
      { key: "agreement", label: "Agreement", type: "open", probability: 85, color: "amber" },
      { key: "leased", label: "Leased", type: "won", probability: 100, color: "emerald" },
      { key: "dropped", label: "Dropped", type: "lost", probability: 0, color: "rose" },
    ],
  },
  {
    id: "resale",
    label: "Resale",
    description: "Re-sale of an existing unit through your team or partner.",
    stages: [
      { key: "lead", label: "Lead", type: "open", probability: 5, color: "slate" },
      { key: "owner_consent", label: "Owner Consent", type: "open", probability: 20, color: "sky" },
      { key: "inspection", label: "Inspection", type: "open", probability: 50, color: "violet" },
      { key: "offer_made", label: "Offer Made", type: "open", probability: 75, color: "amber" },
      { key: "registered", label: "Registered", type: "won", probability: 100, color: "emerald" },
      { key: "lost", label: "Lost", type: "lost", probability: 0, color: "rose" },
    ],
  },
  {
    id: "blank",
    label: "Custom (blank)",
    description: "Just New / Won / Lost — start with a clean slate.",
    stages: [
      { key: "new", label: "New", type: "open", probability: 10, color: "slate" },
      { key: "won", label: "Won", type: "won", probability: 100, color: "emerald" },
      { key: "lost", label: "Lost", type: "lost", probability: 0, color: "rose" },
    ],
  },
] as const;

export default function PipelinesSettingsPage() {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/pipelines", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setPipelines(d.pipelines ?? []);
        setCounts(d.counts ?? {});
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalLeadsByPipeline = useMemo(() => {
    const out: Record<string, number> = {};
    for (const [pid, byStage] of Object.entries(counts)) {
      out[pid] = Object.values(byStage).reduce((a, b) => a + b, 0);
    }
    return out;
  }, [counts]);

  const setDefault = async (id: string) => {
    const res = await fetch(`/api/pipelines/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDefault: true }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error || "Couldn't set as default.");
      return;
    }
    toast.success("Default pipeline updated");
    load();
  };

  const toggleActive = async (p: Pipeline) => {
    const res = await fetch(`/api/pipelines/${p._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !p.isActive }),
    });
    if (!res.ok) {
      toast.error("Couldn't update pipeline.");
      return;
    }
    load();
  };

  const remove = async (p: Pipeline) => {
    if (!confirm(`Delete pipeline "${p.name}"? This can't be undone.`)) return;
    const res = await fetch(`/api/pipelines/${p._id}`, { method: "DELETE" });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      toast.error(j.error || "Couldn't delete pipeline.");
      return;
    }
    toast.success(`Deleted "${p.name}"`);
    load();
  };

  const create = async (payload: { name: string; description?: string; templateId: string }) => {
    setCreating(true);
    try {
      const tpl = TEMPLATES.find((t) => t.id === payload.templateId) ?? TEMPLATES[0];
      const res = await fetch("/api/pipelines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          description: payload.description,
          stages: tpl.stages,
        }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error || "Couldn't create pipeline.");
        return;
      }
      toast.success("Pipeline created");
      setCreateOpen(false);
      load();
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4 lg:p-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-semibold text-[#2b2f3a]">Pipelines</h1>
          <p className="mt-1 max-w-2xl text-[13px] text-slate-600">
            A pipeline is a workflow your leads move through (e.g. <em>Residential Sales</em>,
            <em> Rental</em>, <em> Resale</em>). Each pipeline has its own ordered stages — the
            columns you see on the Kanban board.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="gap-1.5">
          <Plus className="size-4" /> New pipeline
        </Button>
      </div>

      {loading ? (
        <div className="mt-10 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" /> Loading pipelines…
        </div>
      ) : pipelines.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-200 bg-white p-10 text-center">
          <KanbanSquare className="mx-auto size-8 text-slate-300" strokeWidth={1.5} />
          <h3 className="mt-3 text-base font-semibold text-slate-900">No pipelines yet</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm text-slate-600">
            Pipelines define the stages your leads move through. Create your first one to start.
          </p>
          <Button className="mt-4 gap-1.5" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Create pipeline
          </Button>
        </div>
      ) : (
        <ul className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          {pipelines.map((p) => {
            const totalLeads = totalLeadsByPipeline[p._id] ?? 0;
            const sortedStages = p.stages.slice().sort((a, b) => a.order - b.order);
            return (
              <li
                key={p._id}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xs transition-all hover:border-slate-300/70 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <KanbanSquare className="size-4 text-emerald-600" strokeWidth={2} />
                      <Link
                        href={`/settings/pipelines/${p._id}`}
                        className="text-[15px] font-semibold text-slate-900 hover:text-emerald-700"
                      >
                        {p.name}
                      </Link>
                      {p.isDefault ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                          Default
                        </span>
                      ) : null}
                      {!p.isActive ? (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-700">
                          Archived
                        </span>
                      ) : null}
                    </div>
                    {p.description ? (
                      <p className="mt-1 line-clamp-2 text-[12.5px] text-slate-600">
                        {p.description}
                      </p>
                    ) : null}
                  </div>
                  <div className="flex items-center gap-1">
                    {p.isDefault ? (
                      <Button variant="ghost" size="icon" className="text-slate-400" title="Default pipeline">
                        <Star className="size-4 fill-emerald-500 text-emerald-500" />
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        title="Set as default"
                        onClick={() => setDefault(p._id)}
                      >
                        <StarOff className="size-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      asChild
                      title="Edit pipeline"
                    >
                      <Link href={`/settings/pipelines/${p._id}`}>
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={p.isActive ? "Archive" : "Re-activate"}
                      onClick={() => toggleActive(p)}
                    >
                      {p.isActive ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : (
                        <Circle className="size-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Delete pipeline"
                      onClick={() => remove(p)}
                      disabled={p.isDefault}
                    >
                      <Trash2 className="size-4 text-rose-500" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1">
                  {sortedStages.map((s) => {
                    const c = stageAccent(s.color as StageColorKey);
                    const stageCount = counts[p._id]?.[s.key] ?? 0;
                    return (
                      <div
                        key={s._id}
                        title={`${s.label}${stageCount ? ` · ${stageCount} leads` : ""}`}
                        className={cn(
                          "flex shrink-0 items-center gap-1.5 rounded-md border border-slate-200/80 bg-slate-50/70 px-2 py-1",
                        )}
                      >
                        <span className={cn("size-1.5 rounded-full", c.dot)} />
                        <span className="whitespace-nowrap text-[11px] font-medium text-slate-700">
                          {s.label}
                        </span>
                        {stageCount > 0 ? (
                          <span className="rounded-full bg-white px-1.5 text-[10px] font-bold tabular-nums text-slate-700 ring-1 ring-slate-200">
                            {stageCount}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-[12px] text-slate-500">
                  <div className="flex items-center gap-3">
                    <span>
                      <span className="font-semibold tabular-nums text-slate-800">
                        {sortedStages.length}
                      </span>{" "}
                      stage{sortedStages.length === 1 ? "" : "s"}
                    </span>
                    <span>
                      <span className="font-semibold tabular-nums text-slate-800">
                        {totalLeads}
                      </span>{" "}
                      lead{totalLeads === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/leads/pipeline?pipeline=${p._id}`}
                      className="inline-flex items-center gap-0.5 text-[12px] font-semibold text-emerald-700 hover:underline"
                    >
                      View Kanban
                      <ArrowRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <CreatePipelineDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        creating={creating}
        onCreate={create}
      />
    </div>
  );
}

function CreatePipelineDialog({
  open,
  onOpenChange,
  onCreate,
  creating,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (payload: { name: string; description?: string; templateId: string }) => void;
  creating: boolean;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [templateId, setTemplateId] = useState<(typeof TEMPLATES)[number]["id"]>("residential");

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setTemplateId("residential");
    }
  }, [open]);

  const tpl = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Create pipeline</DialogTitle>
          <DialogDescription>
            Pick a starter template — you can rename, reorder, add and remove stages later.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Pipeline name</Label>
            <Input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Resale Mumbai, Rental Pune"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Description (optional)</Label>
            <Textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What kind of leads flow through this pipeline?"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Starter template</Label>
            <Select value={templateId} onValueChange={(v) => setTemplateId(v as typeof templateId)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11.5px] text-slate-500">{tpl.description}</p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Preview stages
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {tpl.stages.map((s) => {
                const c = stageAccent(s.color as StageColorKey);
                return (
                  <span
                    key={s.key}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11.5px] font-medium text-slate-700",
                    )}
                  >
                    <span className={cn("size-1.5 rounded-full", c.dot)} />
                    {s.label}
                  </span>
                );
              })}
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => onCreate({ name: name.trim(), description: description.trim(), templateId })}
            loading={creating}
            disabled={!name.trim() || creating}
          >
            Create pipeline
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
