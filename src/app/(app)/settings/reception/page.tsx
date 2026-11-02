"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, Building2, MonitorSmartphone, Plus, RotateCcw, Trash2 } from "lucide-react";
import { BdButton, BdCard, BdField, BdInput, BdPage, BdPageHeader, BdTabs } from "@/components/bd";
import { Combobox } from "@/components/ui/combobox";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import { FormLayoutEditor } from "@/components/settings/FormLayoutEditor";
import { DEFAULT_RECEPTION, RECEPTION_SECTIONS, type ReceptionConfig } from "@/lib/reception-config";
import { ROLE_LABELS, type Role } from "@/lib/roles";

type Tab = "form" | "projects" | "kiosk";

interface Opt {
  _id: string;
  name: string;
  role?: string;
  status?: string;
}

const BUDGET_SUGGESTIONS = ["50 L", "75 L", "1 Cr", "1.25 Cr", "1.5 Cr", "2 Cr", "2.5 Cr", "3 Cr", "4 Cr", "5 Cr+"];
const CONFIG_SUGGESTIONS = ["1 BHK", "2 BHK", "2.5 BHK", "3 BHK", "4 BHK", "Penthouse", "Villa", "Office", "Shop", "Plot"];

export default function ReceptionSettingsPage() {
  const [tab, setTab] = useState<Tab>("form");
  const [config, setConfig] = useState<ReceptionConfig>(DEFAULT_RECEPTION);
  const [saved, setSaved] = useState<ReceptionConfig>(DEFAULT_RECEPTION);
  const [projects, setProjects] = useState<Opt[]>([]);
  const [users, setUsers] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/reception/config", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/projects", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/users", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([c, p, u]) => {
        setConfig(c.config);
        setSaved(c.config);
        setProjects(p.projects ?? []);
        setUsers((u.users ?? []).filter((x: Opt) => x.status !== "suspended"));
      })
      .catch(() => toast.error("Couldn't load reception settings"))
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(saved), [config, saved]);
  const projectOpts = projects.map((p) => ({ value: p._id, label: p.name }));
  const agentOpts = users.map((u) => ({ value: u._id, label: u.name, hint: ROLE_LABELS[u.role as Role] }));
  const setOpt = <K extends keyof ReceptionConfig["options"]>(k: K, v: ReceptionConfig["options"][K]) =>
    setConfig((c) => ({ ...c, options: { ...c.options, [k]: v } }));

  const save = async () => {
    if (config.projects.some((p) => !p.projectId)) return toast.error("Pick a project for every desk, or remove the empty one.");
    setSaving(true);
    try {
      const res = await fetch("/api/reception/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setConfig(d.config);
      setSaved(d.config);
      toast.success("Reception app updated", { description: "Open kiosks pick it up on the next visitor." });
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BdPage>
      <BdPageHeader
        eyebrow="Settings"
        title="Reception app"
        description="Set up the check-in screen your front desk uses on a tablet. Every walk-in becomes a lead and the assigned agent gets a task instantly."
        actions={
          <>
            <Link href="/reception" target="_blank" className="bd-btn-light">
              <MonitorSmartphone className="size-4" /> Open reception app <ArrowUpRight className="size-3.5" />
            </Link>
            <BdButton variant="ghost" disabled={!dirty || saving} onClick={() => setConfig(saved)}>
              <RotateCcw className="size-3.5" /> Discard
            </BdButton>
            <BdButton disabled={!dirty || saving} onClick={save}>
              {saving ? "Saving…" : "Save changes"}
            </BdButton>
          </>
        }
      />

      <BdTabs<Tab>
        tabs={[
          { key: "form", label: "Visitor form" },
          { key: "projects", label: `Project desks · ${config.projects.length}` },
          { key: "kiosk", label: "Kiosk behaviour" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {loading ? (
        <div className="h-80 animate-pulse rounded-xl bg-muted/60" />
      ) : tab === "form" ? (
        <>
          <p className="text-[13px] text-muted-foreground">
            Each section becomes one step on the kiosk. Turn off a section to skip that step entirely.
          </p>
          <FormLayoutEditor
            sections={RECEPTION_SECTIONS}
            value={config.form}
            onChange={(form) => setConfig((c) => ({ ...c, form }))}
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <BdCard title="Purpose choices" description="Shown when the Purpose field is on.">
              <TagInput value={config.purposes} onChange={(purposes) => setConfig((c) => ({ ...c, purposes }))} />
            </BdCard>
            <BdCard title="Buying timeline choices" description="Shown when the Buying timeline field is on.">
              <TagInput value={config.timelines} onChange={(timelines) => setConfig((c) => ({ ...c, timelines }))} />
            </BdCard>
          </div>
        </>
      ) : tab === "projects" ? (
        <BdCard
          title="Project desks"
          description="For each project, pick who meets walk-ins by default and the budgets and configurations visitors can choose from."
          actions={
            <BdButton
              onClick={() =>
                setConfig((c) => ({ ...c, projects: [...c.projects, { projectId: "", agentId: undefined, budgets: [], configurations: [] }] }))
              }
            >
              <Plus className="size-4" /> Add project
            </BdButton>
          }
        >
          {config.projects.length === 0 ? (
            <div className="ts-blueprint flex flex-col items-center gap-3 rounded-xl px-6 py-14 text-center">
              <span className="flex size-10 items-center justify-center rounded-xl bg-white text-muted-foreground ring-1 ring-border">
                <Building2 className="size-5" />
              </span>
              <p className="max-w-sm text-[13px] text-muted-foreground">
                No project desks yet. Visitors can still pick any project; adding a desk lets you set a default agent and budget choices.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {config.projects.map((d, i) => {
                const update = (patch: Partial<typeof d>) =>
                  setConfig((c) => ({ ...c, projects: c.projects.map((x, j) => (j === i ? { ...x, ...patch } : x)) }));
                const taken = new Set(config.projects.filter((_, j) => j !== i).map((x) => x.projectId));
                return (
                  <div key={i} className="rounded-xl border border-border bg-muted/20 p-4">
                    <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
                      <BdField label="Project">
                        <Combobox
                          value={d.projectId}
                          onChange={(v) => update({ projectId: v })}
                          options={projectOpts.filter((p) => !taken.has(p.value))}
                          placeholder="Select project"
                        />
                      </BdField>
                      <BdField label="Default closing manager" hint="Gets the walk-in task when reception doesn't choose someone.">
                        <Combobox
                          value={d.agentId ?? ""}
                          onChange={(v) => update({ agentId: v || undefined })}
                          options={agentOpts}
                          placeholder="No default"
                          clearable
                        />
                      </BdField>
                      <div className="flex items-start pt-6">
                        <button
                          type="button"
                          title="Remove desk"
                          onClick={() => setConfig((c) => ({ ...c, projects: c.projects.filter((_, j) => j !== i) }))}
                          className="inline-flex size-9 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      <BdField label="Budget choices">
                        <TagInput value={d.budgets} onChange={(budgets) => update({ budgets })} placeholder="e.g. 1.25 Cr" suggestions={BUDGET_SUGGESTIONS} />
                      </BdField>
                      <BdField label="Configurations">
                        <TagInput
                          value={d.configurations}
                          onChange={(configurations) => update({ configurations })}
                          placeholder="e.g. 2 BHK"
                          suggestions={CONFIG_SUGGESTIONS}
                        />
                      </BdField>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </BdCard>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <BdCard title="Welcome screen">
            <div className="space-y-4">
              <BdField label="Title">
                <BdInput value={config.options.welcomeTitle} onChange={(e) => setOpt("welcomeTitle", e.target.value)} />
              </BdField>
              <BdField label="Message">
                <textarea
                  rows={3}
                  value={config.options.welcomeMessage}
                  onChange={(e) => setOpt("welcomeMessage", e.target.value)}
                  className="bd-input resize-none"
                />
              </BdField>
              <BdField label="Reset after check-in" hint="Seconds the thank-you screen stays before the next visitor.">
                <Combobox
                  value={String(config.options.resetSeconds)}
                  onChange={(v) => setOpt("resetSeconds", Number(v))}
                  options={[5, 8, 12, 20, 30, 60].map((n) => ({ value: String(n), label: `${n} seconds` }))}
                />
              </BdField>
            </div>
          </BdCard>
          <BdCard title="Automation">
            <ul className="divide-y divide-border/70">
              {(
                [
                  ["welcomeBack", "Recognise returning visitors", "Look up the mobile number and pre-fill their details."],
                  ["autoAssignProjectAgent", "Use the project's default agent", "If reception doesn't pick a closing manager, the project desk's default gets the task."],
                  ["logSiteVisit", "Log a site visit on check-in", "Adds an in-progress site visit to the lead so visit reports stay accurate."],
                ] as const
              ).map(([k, label, hint]) => (
                <li key={k} className="flex items-start gap-4 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium">{label}</p>
                    <p className="mt-0.5 text-[12px] text-muted-foreground">{hint}</p>
                  </div>
                  <Switch checked={config.options[k]} onCheckedChange={(v) => setOpt(k, v)} aria-label={label} />
                </li>
              ))}
            </ul>
          </BdCard>
        </div>
      )}
    </BdPage>
  );
}
