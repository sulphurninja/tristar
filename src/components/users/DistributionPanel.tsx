"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Pencil, Plus, Shuffle, Trash2, UserRound } from "lucide-react";
import { BdButton, BdCard, BdField, BdInput } from "@/components/bd";
import { MultiCombobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Rule {
  _id: string;
  name: string;
  active: boolean;
  sources: string[];
  projectIds: string[];
  agentIds: string[];
  pointer: number;
  assignedCount: number;
  lastAssignedAt?: string;
}
interface Opt {
  value: string;
  label: string;
}
export interface DistUser {
  _id: string;
  name: string;
  status: string;
  onHoliday?: boolean;
}

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Something went wrong");
  return d;
}

/** Round-robin lead distribution rules (Users → Distribution). */
export function DistributionPanel({ users }: { users: DistUser[] }) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [sources, setSources] = useState<Opt[]>([]);
  const [projects, setProjects] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Rule | "new" | null>(null);

  const load = useCallback(async () => {
    try {
      const [r, s, p] = await Promise.all([api("/api/distribution"), api("/api/sources"), api("/api/projects?limit=200")]);
      setRules(r.rules ?? []);
      setSources((s.sources ?? []).map((x: { key: string; label: string }) => ({ value: x.key, label: x.label })));
      setProjects((p.projects ?? []).map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load distribution");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const userById = new Map(users.map((u) => [u._id, u]));
  const label = (list: Opt[], v: string) => list.find((o) => o.value === v)?.label ?? v;

  const toggle = async (r: Rule, active: boolean) => {
    setRules((rs) => rs.map((x) => (x._id === r._id ? { ...x, active } : x)));
    try {
      await api(`/api/distribution/${r._id}`, { method: "PATCH", body: JSON.stringify({ active }) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update");
      load();
    }
  };
  const remove = async (r: Rule) => {
    if (!confirm(`Delete the rule “${r.name}”?`)) return;
    try {
      await api(`/api/distribution/${r._id}`, { method: "DELETE" });
      toast.success("Rule deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete");
    }
  };

  return (
    <>
      <BdCard
        title="Lead distribution"
        description="New leads without an owner are shared out in turn (round-robin). The first matching rule wins. People on holiday or inactive are skipped."
        actions={
          <BdButton onClick={() => setEditing("new")}>
            <Plus className="size-4" /> New rule
          </BdButton>
        }
      >
        {loading ? (
          <div className="h-40 animate-pulse rounded-xl bg-muted/60" />
        ) : rules.length === 0 ? (
          <div className="ts-blueprint flex flex-col items-center gap-3 rounded-xl px-6 py-14 text-center">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white text-primary ring-1 ring-border">
              <Shuffle className="size-5" />
            </span>
            <div>
              <p className="text-[14px] font-medium">No rules yet</p>
              <p className="mx-auto mt-1 max-w-md text-[12.5px] text-muted-foreground">
                Example: “Marketing Ads leads for MIRAYA go to Akanksha, Amol and Amruta in turn.” Applies to imports, the
                reception desk and new leads added without an owner.
              </p>
            </div>
            <BdButton onClick={() => setEditing("new")}>
              <Plus className="size-4" /> Create your first rule
            </BdButton>
          </div>
        ) : (
          <ol className="space-y-3">
            {rules.map((r, idx) => {
              const next = r.agentIds.length ? userById.get(r.agentIds[r.pointer % r.agentIds.length]) : undefined;
              return (
                <li key={r._id} className="rounded-xl border border-border bg-white p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-muted text-[12px] font-semibold tabular-nums text-muted-foreground">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold">{r.name}</p>
                      <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                        {r.sources.length ? r.sources.map((s) => label(sources, s)).join(", ") : "Any source"} ·{" "}
                        {r.projectIds.length ? r.projectIds.map((p) => label(projects, p)).join(", ") : "Any project"}
                      </p>
                      <div className="mt-2.5 flex flex-wrap gap-1.5">
                        {r.agentIds.map((id) => {
                          const u = userById.get(id);
                          const off = !u || u.status !== "active" || u.onHoliday;
                          return (
                            <span
                              key={id}
                              title={off ? "Skipped (inactive or on holiday)" : undefined}
                              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] ring-1 ${
                                off ? "bg-muted text-muted-foreground ring-border line-through" : "bg-primary-50 text-primary-700 ring-primary/15"
                              }`}
                            >
                              <UserRound className="size-3" /> {u?.name ?? "Removed user"}
                            </span>
                          );
                        })}
                      </div>
                      <p className="mt-2 text-[12px] text-muted-foreground">
                        {r.assignedCount} lead{r.assignedCount === 1 ? "" : "s"} distributed
                        {next ? <> · next up: <b className="text-foreground">{next.name}</b></> : null}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Switch checked={r.active} onCheckedChange={(v) => toggle(r, v)} aria-label="Rule active" />
                      <button type="button" title="Edit" onClick={() => setEditing(r)} className="ml-2 inline-flex size-8 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-muted hover:text-foreground">
                        <Pencil className="size-4" />
                      </button>
                      <button type="button" title="Delete" onClick={() => remove(r)} className="inline-flex size-8 items-center justify-center rounded-[8px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </BdCard>

      <RuleDialog
        rule={editing}
        users={users}
        sources={sources}
        projects={projects}
        onClose={() => setEditing(null)}
        onSaved={load}
      />
    </>
  );
}

function RuleDialog({
  rule,
  users,
  sources,
  projects,
  onClose,
  onSaved,
}: {
  rule: Rule | "new" | null;
  users: DistUser[];
  sources: Opt[];
  projects: Opt[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [src, setSrc] = useState<string[]>([]);
  const [proj, setProj] = useState<string[]>([]);
  const [agents, setAgents] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const existing = rule && rule !== "new" ? rule : null;

  useEffect(() => {
    if (!rule) return;
    setName(existing?.name ?? "");
    setSrc(existing?.sources ?? []);
    setProj(existing?.projectIds ?? []);
    setAgents(existing?.agentIds ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rule]);

  const save = async () => {
    if (!name.trim()) return toast.error("Give the rule a name.");
    if (!agents.length) return toast.error("Pick at least one agent.");
    setSaving(true);
    try {
      const body = JSON.stringify({ name, sources: src, projectIds: proj, agentIds: agents });
      if (existing) await api(`/api/distribution/${existing._id}`, { method: "PATCH", body });
      else await api("/api/distribution", { method: "POST", body });
      toast.success(existing ? "Rule saved" : "Rule created");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!rule} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit rule" : "New distribution rule"}</DialogTitle>
          <DialogDescription>Leave sources or projects empty to match everything.</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <BdField label="Rule name">
            <BdInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Ads leads — MIRAYA" />
          </BdField>
          <BdField label="When the source is">
            <MultiCombobox value={src} onChange={setSrc} options={sources} placeholder="Any source" />
          </BdField>
          <BdField label="And the project is">
            <MultiCombobox value={proj} onChange={setProj} options={projects} placeholder="Any project" />
          </BdField>
          <BdField label="Share leads between" hint="They get leads in this order, one each, then it starts again.">
            <MultiCombobox
              value={agents}
              onChange={setAgents}
              options={users.filter((u) => u.status !== "deleted").map((u) => ({ value: u._id, label: u.name }))}
              placeholder="Pick agents"
            />
          </BdField>
        </DialogBody>
        <DialogFooter>
          <BdButton variant="light" onClick={onClose}>
            Cancel
          </BdButton>
          <BdButton onClick={save} disabled={saving}>
            {saving ? "Saving…" : existing ? "Save rule" : "Create rule"}
          </BdButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
