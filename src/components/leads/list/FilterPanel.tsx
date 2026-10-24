"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { BdButton, BdField, BdInput, BdSelect } from "@/components/bd";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { MultiSelect } from "@/components/leads/ui/primitives";
import { BUDGET_STEPS, CATEGORY_OPTIONS, formatBudget, useLeadOptions } from "@/components/leads/types";

/** Flat string map; multi values are comma separated. Mirrors the /api/leads query string. */
export type Filters = Record<string, string>;

export const FILTER_KEYS = [
  "projectId", "source", "stage", "category", "assignedTo", "preSalesAgent", "brokerId", "filterTeam", "tags",
  "returning", "unassigned", "hasChannelPartner", "priority",
  "createdFrom", "createdTo", "assignedFrom", "assignedUntil", "lastActivityFrom", "lastActivityTo",
  "followupFrom", "followupTo", "budgetMin", "budgetMax",
] as const;

export function countFilters(f: Filters) {
  return FILTER_KEYS.filter((k) => f[k]).length;
}

const csv = (s?: string) => (s ? s.split(",").filter(Boolean) : []);

function DateRange({
  label,
  from,
  to,
  onFrom,
  onTo,
}: {
  label: string;
  from?: string;
  to?: string;
  onFrom: (v: string) => void;
  onTo: (v: string) => void;
}) {
  return (
    <BdField label={label}>
      <div className="grid grid-cols-2 gap-2">
        <BdInput type="date" value={from ?? ""} onChange={(e) => onFrom(e.target.value)} aria-label={`${label} from`} />
        <BdInput type="date" value={to ?? ""} onChange={(e) => onTo(e.target.value)} aria-label={`${label} to`} />
      </div>
    </BdField>
  );
}

export function FilterPanel({
  open,
  onClose,
  value,
  onApply,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  value: Filters;
  onApply: (f: Filters) => void;
  onSave: (f: Filters) => void;
}) {
  const opts = useLeadOptions();
  const { users, teams } = useDirectory();
  const [draft, setDraft] = useState<Filters>(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  const set = (k: string, v: string) => setDraft((d) => ({ ...d, [k]: v }));
  const setMulti = (k: string) => (v: string[]) => set(k, v.join(","));
  const userOpts = users.filter((u) => u.status !== "suspended").map((u) => ({ value: u._id, label: u.name }));
  const budgetOpts = BUDGET_STEPS.map((n) => ({ value: String(n), label: formatBudget(n) }));

  return (
    <>
      {open ? <div className="fixed inset-0 z-[57] bg-[#1b2440]/25" onClick={onClose} /> : null}
      <aside
        className={`fixed bottom-0 right-0 top-0 z-[58] flex w-[420px] max-w-full flex-col bg-white shadow-[-8px_0_30px_rgba(30,50,110,0.18)] transition-transform duration-200 ${open ? "translate-x-0" : "translate-x-full"}`}
        aria-hidden={!open}
      >
        <div className="flex items-center justify-between border-b border-[#eef0f6] px-5 py-4">
          <h3 className="text-[17px] font-medium text-[#2b2f3a]">Filter Leads</h3>
          <button type="button" onClick={onClose} aria-label="Close filters" className="rounded p-1 text-[#7c8296] hover:bg-[#f0f2f8]">
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <BdField label="Project">
            <MultiSelect value={csv(draft.projectId)} onChange={setMulti("projectId")} placeholder="Select Project" searchable
              options={opts.projects.map((p) => ({ value: p._id, label: p.name }))} />
          </BdField>
          <BdField label="Source">
            <MultiSelect value={csv(draft.source)} onChange={setMulti("source")} placeholder="Select Source" options={opts.sources} />
          </BdField>
          <BdField label="Lead Stage">
            <MultiSelect value={csv(draft.stage)} onChange={setMulti("stage")} placeholder="Select Lead Stage"
              options={opts.stages.map((s) => ({ value: s.key, label: s.label }))} />
          </BdField>
          <BdField label="Lead Category">
            <MultiSelect value={csv(draft.category)} onChange={setMulti("category")} placeholder="Select Category"
              options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))} />
          </BdField>
          <BdField label="Team">
            <BdSelect value={draft.filterTeam ?? ""} onChange={(v) => set("filterTeam", v)} placeholder="Select Team"
              options={teams.map((t) => ({ value: t._id, label: t.name }))} />
          </BdField>
          <BdField label="Assigned To">
            <MultiSelect value={csv(draft.assignedTo)} onChange={setMulti("assignedTo")} placeholder="Select Sales Agent" searchable options={userOpts} />
          </BdField>
          <BdField label="Pre Sales Agent">
            <MultiSelect value={csv(draft.preSalesAgent)} onChange={setMulti("preSalesAgent")} placeholder="Select Pre Sales Agent" searchable options={userOpts} />
          </BdField>
          <BdField label="Channel Partner">
            <MultiSelect value={csv(draft.brokerId)} onChange={setMulti("brokerId")} placeholder="Select Channel Partner" searchable
              options={opts.brokers.map((b) => ({ value: b._id, label: b.firmName ? `${b.name} - ${b.firmName}` : b.name }))} />
          </BdField>
          <BdField label="Tag">
            <MultiSelect value={csv(draft.tags)} onChange={setMulti("tags")} placeholder="Select Tag" searchable
              options={opts.tags.map((t) => ({ value: t, label: t }))} />
          </BdField>
          <div className="grid grid-cols-2 gap-3">
            <BdField label="Returning">
              <BdSelect value={draft.returning ?? ""} onChange={(v) => set("returning", v)} placeholder="Any"
                options={[{ value: "1", label: "Returning only" }, { value: "0", label: "Not returning" }]} />
            </BdField>
            <BdField label="Priority">
              <BdSelect value={draft.priority ?? ""} onChange={(v) => set("priority", v)} placeholder="Any"
                options={[{ value: "low", label: "Low" }, { value: "medium", label: "Medium" }, { value: "high", label: "High" }, { value: "vip", label: "VIP" }]} />
            </BdField>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-[#3a5dc2]" checked={draft.unassigned === "1"} onChange={(e) => set("unassigned", e.target.checked ? "1" : "")} />
              Unassigned leads
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" className="accent-[#3a5dc2]" checked={draft.hasChannelPartner === "1"} onChange={(e) => set("hasChannelPartner", e.target.checked ? "1" : "")} />
              Has channel partner
            </label>
          </div>
          <DateRange label="Created Date" from={draft.createdFrom} to={draft.createdTo} onFrom={(v) => set("createdFrom", v)} onTo={(v) => set("createdTo", v)} />
          <DateRange label="Assigned Date" from={draft.assignedFrom} to={draft.assignedUntil} onFrom={(v) => set("assignedFrom", v)} onTo={(v) => set("assignedUntil", v)} />
          <DateRange label="Last Activity Date" from={draft.lastActivityFrom} to={draft.lastActivityTo} onFrom={(v) => set("lastActivityFrom", v)} onTo={(v) => set("lastActivityTo", v)} />
          <DateRange label="Next Followup Date" from={draft.followupFrom} to={draft.followupTo} onFrom={(v) => set("followupFrom", v)} onTo={(v) => set("followupTo", v)} />
          <BdField label="Budget">
            <div className="grid grid-cols-2 gap-2">
              <BdSelect value={draft.budgetMin ?? ""} onChange={(v) => set("budgetMin", v)} placeholder="Min" options={budgetOpts} />
              <BdSelect value={draft.budgetMax ?? ""} onChange={(v) => set("budgetMax", v)} placeholder="Max" options={budgetOpts} />
            </div>
          </BdField>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-[#eef0f6] px-5 py-3">
          <BdButton variant="light" onClick={() => setDraft({})}>
            Reset
          </BdButton>
          <div className="flex gap-2">
            <BdButton variant="light" disabled={!countFilters(draft)} onClick={() => onSave(draft)}>
              Save Filter
            </BdButton>
            <BdButton
              onClick={() => {
                onApply(draft);
                onClose();
              }}
            >
              Apply
            </BdButton>
          </div>
        </div>
      </aside>
    </>
  );
}
