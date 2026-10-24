"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  Loader2,
  ArrowRight,
  Star,
  Save,
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
import { stageAccent, STAGE_COLOR_KEYS, type StageColorKey } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";

interface Stage {
  _id: string;
  key: string;
  label: string;
  description?: string;
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
}

export default function PipelineDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;

  const [pipeline, setPipeline] = useState<Pipeline | null>(null);
  const [stageCounts, setStageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [savingMeta, setSavingMeta] = useState(false);
  const [meta, setMeta] = useState({ name: "", description: "" });

  const [stageDialog, setStageDialog] = useState<{
    open: boolean;
    mode: "create" | "edit";
    stage?: Stage;
  }>({ open: false, mode: "create" });

  const load = useCallback(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/pipelines/${id}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) {
          toast.error(d.error);
          router.push("/settings/pipelines");
          return;
        }
        setPipeline(d.pipeline);
        setStageCounts(d.stageCounts ?? {});
        setMeta({
          name: d.pipeline?.name ?? "",
          description: d.pipeline?.description ?? "",
        });
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    load();
  }, [load]);

  const orderedStages = useMemo(
    () => (pipeline?.stages ?? []).slice().sort((a, b) => a.order - b.order),
    [pipeline],
  );

  /* ---- meta save ---- */
  const saveMeta = async () => {
    if (!pipeline) return;
    setSavingMeta(true);
    try {
      const res = await fetch(`/api/pipelines/${pipeline._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: meta.name.trim(), description: meta.description.trim() }),
      });
      const j = await res.json();
      if (!res.ok) {
        toast.error(j.error || "Couldn't save.");
        return;
      }
      toast.success("Pipeline updated");
      load();
    } finally {
      setSavingMeta(false);
    }
  };

  /* ---- stage CRUD ---- */

  const submitStage = async (
    payload: Omit<Stage, "_id" | "order"> & { stageId?: string },
  ) => {
    if (!pipeline) return;
    const isEdit = Boolean(payload.stageId);
    const url = isEdit
      ? `/api/pipelines/${pipeline._id}/stages/${payload.stageId}`
      : `/api/pipelines/${pipeline._id}/stages`;
    const res = await fetch(url, {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: payload.key,
        label: payload.label,
        description: payload.description,
        type: payload.type,
        probability: payload.probability,
        color: payload.color,
      }),
    });
    const j = await res.json();
    if (!res.ok) {
      toast.error(j.error || "Couldn't save stage.");
      return;
    }
    toast.success(isEdit ? "Stage updated" : "Stage added");
    setStageDialog({ open: false, mode: "create" });
    load();
  };

  const removeStage = async (stage: Stage) => {
    if (!pipeline) return;
    if (!confirm(`Delete stage "${stage.label}"? This can't be undone.`)) return;
    const res = await fetch(`/api/pipelines/${pipeline._id}/stages/${stage._id}`, {
      method: "DELETE",
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) {
      toast.error(j.error || "Couldn't delete stage.");
      return;
    }
    toast.success("Stage deleted");
    load();
  };

  /* ---- reorder ---- */

  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const reorderTo = async (sourceId: string, targetId: string) => {
    if (!pipeline || sourceId === targetId) return;
    const ids = orderedStages.map((s) => s._id);
    const fromIdx = ids.indexOf(sourceId);
    const toIdx = ids.indexOf(targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    ids.splice(toIdx, 0, ids.splice(fromIdx, 1)[0]);

    /* optimistic */
    const updated = ids
      .map((sid, idx) => {
        const s = orderedStages.find((x) => x._id === sid)!;
        return { ...s, order: idx };
      });
    setPipeline({ ...pipeline, stages: updated });

    const res = await fetch(`/api/pipelines/${pipeline._id}/stages/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stageIds: ids }),
    });
    if (!res.ok) {
      toast.error("Couldn't save new order.");
      load();
    }
  };

  /* ----- render ----- */

  if (loading || !pipeline) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="size-4 animate-spin" /> Loading pipeline…
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-5">
      <Link
        href="/settings/pipelines"
        className="inline-flex items-center gap-1 text-[12.5px] font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="size-3.5" /> Back to pipelines
      </Link>

      {/* Header */}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-semibold text-[#2b2f3a]">
              {pipeline.name}
            </h1>
            {pipeline.isDefault ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                <Star className="size-2.5 fill-emerald-700 text-emerald-700" /> Default
              </span>
            ) : null}
          </div>
          {pipeline.description ? (
            <p className="mt-1 max-w-2xl text-[13px] text-slate-600">{pipeline.description}</p>
          ) : null}
        </div>

        <Button asChild variant="outline" className="gap-1.5">
          <Link href={`/leads/pipeline?pipeline=${pipeline._id}`}>
            View on Kanban <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>

      {/* Meta editor */}
      <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xs">
        <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">
          Pipeline details
        </h2>
        <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">Name</Label>
            <Input
              value={meta.name}
              onChange={(e) => setMeta({ ...meta, name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5 lg:col-span-1">
            <Label className="text-[12px] font-medium text-slate-700">Description</Label>
            <Textarea
              rows={2}
              value={meta.description}
              onChange={(e) => setMeta({ ...meta, description: e.target.value })}
            />
          </div>
        </div>
        <div className="mt-3 flex justify-end">
          <Button onClick={saveMeta} loading={savingMeta} className="gap-1.5">
            <Save className="size-4" /> Save changes
          </Button>
        </div>
      </div>

      {/* Stages editor */}
      <div className="mt-6 rounded-2xl border border-slate-200/70 bg-white p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">
              Stages
            </h2>
            <p className="mt-1 text-[12.5px] text-slate-500">
              These become the columns on the Kanban board. Drag the handle to reorder.
            </p>
          </div>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={() => setStageDialog({ open: true, mode: "create" })}
          >
            <Plus className="size-4" /> Add stage
          </Button>
        </div>

        {orderedStages.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 p-8 text-center text-sm text-slate-500">
            No stages yet. Add at least one to start using this pipeline.
          </div>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200/70">
            {orderedStages.map((s, idx) => {
              const c = stageAccent(s.color as StageColorKey);
              const used = stageCounts[s.key] ?? 0;
              const isDropTarget = dragOverId === s._id && dragId !== s._id;
              return (
                <li
                  key={s._id}
                  draggable
                  onDragStart={(e) => {
                    setDragId(s._id);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/stage-id", s._id);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    setDragOverId(s._id);
                  }}
                  onDragLeave={() => setDragOverId((x) => (x === s._id ? null : x))}
                  onDrop={async (e) => {
                    e.preventDefault();
                    setDragOverId(null);
                    const src = e.dataTransfer.getData("text/stage-id") || dragId;
                    if (src) await reorderTo(src, s._id);
                    setDragId(null);
                  }}
                  onDragEnd={() => {
                    setDragId(null);
                    setDragOverId(null);
                  }}
                  className={cn(
                    "flex items-center gap-3 bg-white px-4 py-3 transition-colors",
                    isDropTarget && "bg-emerald-50/60",
                    dragId === s._id && "opacity-60",
                  )}
                >
                  <button
                    type="button"
                    aria-label="Drag to reorder"
                    className="cursor-grab text-slate-300 transition-colors hover:text-slate-500"
                    title="Drag to reorder"
                  >
                    <GripVertical className="size-4" />
                  </button>
                  <span
                    className="text-[11px] font-bold tabular-nums text-slate-400"
                    aria-hidden
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className={cn("size-2 rounded-full", c.dot)} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[13.5px] font-semibold text-slate-900">
                        {s.label}
                      </span>
                      <span className="rounded-full bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                        {s.key}
                      </span>
                      {s.isSystem ? (
                        <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                          System
                        </span>
                      ) : null}
                      <span
                        className={cn(
                          "rounded-full px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          s.type === "won"
                            ? "bg-emerald-50 text-emerald-700"
                            : s.type === "lost"
                              ? "bg-rose-50 text-rose-700"
                              : "bg-slate-100 text-slate-600",
                        )}
                      >
                        {s.type}
                      </span>
                      <span className="text-[10.5px] font-semibold text-slate-400 tabular-nums">
                        {s.probability}%
                      </span>
                    </div>
                    {s.description ? (
                      <p className="mt-0.5 line-clamp-1 text-[11.5px] text-slate-500">
                        {s.description}
                      </p>
                    ) : null}
                  </div>

                  <span className="text-[11.5px] tabular-nums text-slate-500">
                    {used} {used === 1 ? "lead" : "leads"}
                  </span>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setStageDialog({ open: true, mode: "edit", stage: s })}
                      title="Edit stage"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      title={s.isSystem ? "System stages can't be deleted" : "Delete stage"}
                      onClick={() => removeStage(s)}
                      disabled={s.isSystem}
                    >
                      <Trash2 className="size-4 text-rose-500" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <StageDialog
        state={stageDialog}
        onOpenChange={(v) => setStageDialog((s) => ({ ...s, open: v }))}
        onSubmit={submitStage}
      />
    </div>
  );
}

/* ------------------------------ Stage dialog ------------------------------ */

function StageDialog({
  state,
  onOpenChange,
  onSubmit,
}: {
  state: { open: boolean; mode: "create" | "edit"; stage?: Stage };
  onOpenChange: (v: boolean) => void;
  onSubmit: (payload: Omit<Stage, "_id" | "order"> & { stageId?: string }) => void;
}) {
  const isEdit = state.mode === "edit" && Boolean(state.stage);
  const [form, setForm] = useState({
    key: "",
    label: "",
    description: "",
    type: "open" as "open" | "won" | "lost",
    color: "slate" as StageColorKey,
    probability: 10,
  });

  useEffect(() => {
    if (!state.open) return;
    if (isEdit && state.stage) {
      setForm({
        key: state.stage.key,
        label: state.stage.label,
        description: state.stage.description ?? "",
        type: state.stage.type,
        color: (state.stage.color as StageColorKey) ?? "slate",
        probability: state.stage.probability ?? 0,
      });
    } else {
      setForm({
        key: "",
        label: "",
        description: "",
        type: "open",
        color: "slate",
        probability: 10,
      });
    }
  }, [state.open, isEdit, state.stage]);

  const slugifyKey = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 64);

  return (
    <Dialog open={state.open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit stage" : "Add stage"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the stage's label, color, type or close-probability."
              : "Stages become columns on the Kanban board. The stage key is a stable identifier."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Label</Label>
              <Input
                autoFocus
                value={form.label}
                onChange={(e) => {
                  const label = e.target.value;
                  setForm((f) => ({
                    ...f,
                    label,
                    key: isEdit ? f.key : slugifyKey(label),
                  }));
                }}
                placeholder="e.g. Qualified, Visit Done"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">
                Key
                {isEdit ? (
                  <span className="ml-1 text-[10.5px] text-slate-400">(cannot change)</span>
                ) : null}
              </Label>
              <Input
                value={form.key}
                disabled={isEdit}
                onChange={(e) => setForm({ ...form, key: slugifyKey(e.target.value) })}
                placeholder="qualified"
                className="font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] font-medium text-slate-700">
              Description (optional)
            </Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="When does a lead reach this stage?"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Type</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as typeof form.type })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open (active)</SelectItem>
                  <SelectItem value="won">Won (closed - won)</SelectItem>
                  <SelectItem value="lost">Lost (closed - lost)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Probability (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={form.probability}
                onChange={(e) =>
                  setForm({ ...form, probability: Number(e.target.value || 0) })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] font-medium text-slate-700">Color</Label>
              <Select
                value={form.color}
                onValueChange={(v) => setForm({ ...form, color: v as StageColorKey })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STAGE_COLOR_KEYS.map((k) => {
                    const c = stageAccent(k);
                    return (
                      <SelectItem key={k} value={k}>
                        <span className="inline-flex items-center gap-2">
                          <span className={cn("size-2 rounded-full", c.dot)} />
                          <span className="capitalize">{k}</span>
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              onSubmit({
                key: form.key,
                label: form.label,
                description: form.description,
                type: form.type,
                color: form.color,
                probability: form.probability,
                stageId: isEdit ? state.stage?._id : undefined,
              } as Omit<Stage, "_id" | "order"> & { stageId?: string })
            }
            disabled={!form.key.trim() || !form.label.trim()}
          >
            {isEdit ? "Save stage" : "Add stage"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
