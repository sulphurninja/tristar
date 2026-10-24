"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Mail, MessageCircle, MessageSquare, MoreVertical, Phone, StickyNote, Trash2, ArrowLeftRight, UserPlus, UserMinus, Link2, Unlink, Pencil, Contact } from "lucide-react";
import { BdBadge, BdSelect } from "@/components/bd";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { DropMenu } from "@/components/leads/ui/primitives";
import {
  CATEGORY_OPTIONS,
  COUNTRY_OPTIONS,
  useLeadOptions,
} from "@/components/leads/types";
import { fmtDT } from "@/components/leads/list/LeadsTable";
import type { TabCtx } from "./types";

export type QuickAction = "wa" | "note" | "email" | "call" | "sms" | "task";
export type MenuAction =
  | "convert"
  | "transfer"
  | "addOwner"
  | "removeOwner"
  | "addCp"
  | "removeCp"
  | "edit"
  | "delete";

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p.replace(/[^A-Za-z]/g, "")[0]?.toUpperCase() ?? "")
    .join("") || "?";

const QUICK: Array<{ key: QuickAction; label: string; icon: React.ComponentType<{ className?: string }>; bg: string; fg: string }> = [
  { key: "wa", label: "WA", icon: MessageCircle, bg: "#dff6e8", fg: "#2fb67c" },
  { key: "note", label: "NOTE", icon: StickyNote, bg: "#e3e9fb", fg: "#4a6ccb" },
  { key: "email", label: "EMAIL", icon: Mail, bg: "#fde3e6", fg: "#e0566a" },
  { key: "call", label: "CALL", icon: Phone, bg: "#dff6e8", fg: "#2fb67c" },
  { key: "sms", label: "SMS", icon: MessageSquare, bg: "#fdebd6", fg: "#ec8a2c" },
  { key: "task", label: "TASK", icon: CalendarCheck, bg: "#e6e3fb", fg: "#7a66e0" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-3 mb-3 rounded-[3px] border border-[#e6e9f2] bg-white">
      <h4 className="px-4 pb-1 pt-4 text-[15px] font-semibold uppercase tracking-wide text-[#4a4f5f]">{title}</h4>
      <div className="px-4 pb-3">{children}</div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-[#eef0f6] py-3 last:border-0">
      <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-[#4a4f5f]">{label}</p>
      <div className="text-[14px] text-[#2b2f3a]">{children}</div>
    </div>
  );
}

function EmailField({ value, onSave, type = "text" }: { value: string; onSave: (v: string) => void; type?: string }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  return (
    <input
      value={v}
      type={type}
      placeholder="-"
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() !== value && onSave(v.trim())}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className="w-full border-0 border-b border-transparent bg-transparent p-0 text-[14px] outline-none placeholder:text-[#2b2f3a] hover:border-[#dfe3ee] focus:border-[#3a5dc2]"
    />
  );
}

function TagsField({ tags, onSave }: { tags: string[]; onSave: (t: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const t = draft.trim();
    if (t && !tags.includes(t)) onSave([...tags, t]);
    setDraft("");
  };
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-[2px] bg-[#eceff8] px-1.5 py-[2px] text-[12.5px]">
          {t}
          <button type="button" aria-label={`Remove ${t}`} onClick={() => onSave(tags.filter((x) => x !== t))} className="text-[#5a6072] hover:text-black">
            ×
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={tags.length ? "Add" : "Add tag"}
        className="min-w-[60px] flex-1 border-0 bg-transparent p-0 text-[13px] outline-none placeholder:text-[#9aa1b5]"
      />
    </div>
  );
}

export function LeftPanel({
  ctx,
  onQuick,
  onMenu,
}: {
  ctx: TabCtx;
  onQuick: (a: QuickAction) => void;
  onMenu: (a: MenuAction) => void;
}) {
  const { lead, patch } = ctx;
  const opts = useLeadOptions();
  const { users } = useDirectory();
  const userOpts = users.filter((u) => u.status !== "suspended").map((u) => ({ value: u._id, label: u.name }));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto rounded-[3px] bg-white pb-3 shadow-[0_1px_4px_rgba(30,50,110,0.06)]">
      <div className="bg-[#f1f3f9] px-3 pb-3 pt-3">
        <div className="flex items-start justify-between">
          <span className="rounded-full border border-[#e3e6ef] bg-white px-3 py-[3px] text-[12px] font-semibold">
            #{lead.leadNumber ?? lead._id.slice(-6)}
          </span>
          <DropMenu
            trigger={
              <button
                type="button"
                aria-label="Lead menu"
                className="flex size-9 items-center justify-center rounded-[3px] border border-[#e3e6ef] bg-white hover:bg-[#eef1fa]"
              >
                <MoreVertical className="size-4" />
              </button>
            }
            items={[
              { key: "convert", label: "Convert To Contact", icon: Contact, onSelect: () => onMenu("convert"), hidden: !!lead.isContact },
              { key: "transfer", label: "Transfer Lead", icon: ArrowLeftRight, onSelect: () => onMenu("transfer") },
              { key: "addOwner", label: "Add Owner", icon: UserPlus, onSelect: () => onMenu("addOwner") },
              { key: "removeOwner", label: "Remove Lead Owner", icon: UserMinus, onSelect: () => onMenu("removeOwner") },
              { key: "addCp", label: "Add Channel Partner", icon: Link2, onSelect: () => onMenu("addCp") },
              { key: "removeCp", label: "Remove Channel Partner", icon: Unlink, onSelect: () => onMenu("removeCp") },
              { key: "edit", label: "Edit", icon: Pencil, onSelect: () => onMenu("edit") },
              { key: "delete", label: "Delete", icon: Trash2, danger: true, onSelect: () => onMenu("delete") },
            ]}
          />
        </div>
        <div className="mt-1 flex flex-col items-center">
          <div className="flex size-[92px] items-center justify-center rounded-full border-4 border-white bg-[#6c757d] text-[32px] font-medium text-white shadow">
            {initialsOf(lead.contact.name)}
          </div>
          <h3 className="mt-2 text-center text-[17px] font-semibold text-[#2b2f3a]">{lead.contact.name}</h3>
          <div className="mt-1 flex gap-1.5">
            {lead.isContact ? <BdBadge color="#37c47f">Contact</BdBadge> : null}
            {lead.isReturning ? <BdBadge color="#d9453f">Returned</BdBadge> : null}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-1 px-3 pb-3 pt-3">
        {QUICK.map((a) => (
          <button key={a.key} type="button" onClick={() => onQuick(a.key)} className="group flex flex-col items-center gap-1.5" title={a.label}>
            <span className="flex size-9 items-center justify-center rounded-full transition group-hover:scale-110" style={{ background: a.bg, color: a.fg }}>
              <a.icon className="size-[17px]" />
            </span>
            <span className="text-[11px] font-medium uppercase text-[#5a6072]">{a.label}</span>
          </button>
        ))}
      </div>

      <div className="border-t border-[#eef0f6] px-3 py-3">
        <p className="mb-1.5 text-[11.5px] font-bold uppercase tracking-wide text-[#4a4f5f]">Lead Stage</p>
        <BdSelect
          value={lead.stage}
          clearable={false}
          onChange={(v) => v && v !== lead.stage && patch({ stage: v }, "Lead stage updated")}
          options={opts.stages.map((s) => ({ value: s.key, label: s.label }))}
        />
        <p className="mb-1.5 mt-3 text-[11.5px] font-bold uppercase tracking-wide text-[#4a4f5f]">Lead Category</p>
        <BdSelect
          value={lead.category ?? ""}
          placeholder=""
          onChange={(v) => patch({ category: v }, "Lead category updated")}
          options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))}
        />
      </div>

      <Section title="Contact Information">
        <Field label="E-Mail">
          <EmailField type="email" value={lead.contact.email ?? ""} onSave={(v) => patch({ contact: { email: v } }, "E-Mail updated")} />
        </Field>
        <Field label="Phone">
          <a href={`tel:${lead.contact.primaryPhone}`} className="text-[#3a5dc2] hover:underline">
            {lead.contact.primaryPhone}
          </a>
          {lead.contact.altPhone ? (
            <a href={`tel:${lead.contact.altPhone}`} className="ml-3 text-[#3a5dc2] hover:underline">
              {lead.contact.altPhone}
            </a>
          ) : null}
        </Field>
        <Field label="Country">
          <BdSelect
            value={lead.country ?? ""}
            placeholder=""
            onChange={(v) => patch({ country: v }, "Country updated")}
            options={COUNTRY_OPTIONS.map((c) => ({ value: c, label: c }))}
          />
        </Field>
      </Section>

      <Section title="Lead Information">
        <Field label="Pre Sales Agent">
          <BdSelect
            value={lead.preSalesAgentId?._id ?? ""}
            placeholder="-"
            onChange={(v) => patch({ preSalesAgentId: v || null }, "Pre sales agent updated")}
            options={userOpts}
          />
        </Field>
        <Field label="Assigned To">
          <BdSelect
            value={lead.assignedTo?._id ?? ""}
            placeholder="Unassigned"
            clearable={false}
            onChange={(v) => v && patch({ assignedTo: v }, "Lead transferred")}
            options={userOpts}
          />
          {(lead.coOwners ?? []).length ? (
            <p className="mt-1.5 text-[12.5px] text-[#6b7186]">Also owned by: {(lead.coOwners ?? []).map((c) => c.name).join(", ")}</p>
          ) : null}
        </Field>
        <Field label="Source">
          <BdSelect
            value={lead.source?.primary ?? ""}
            placeholder="-"
            clearable={false}
            onChange={(v) => v && patch({ source: { primary: v } }, "Source updated")}
            options={opts.sources}
          />
        </Field>
        <Field label="Project">
          <BdSelect
            value={lead.primaryProjectId?._id ?? ""}
            placeholder="-"
            onChange={(v) => patch({ primaryProjectId: v || null }, "Project updated")}
            options={opts.projects.map((p) => ({ value: p._id, label: p.name }))}
          />
        </Field>
        <Field label="Priority">
          <BdSelect
            value={lead.priority ?? "medium"}
            clearable={false}
            onChange={(v) => v && patch({ priority: v }, "Priority updated")}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "vip", label: "VIP" },
            ]}
          />
        </Field>
        <Field label="Tag">
          <TagsField tags={lead.tags ?? []} onSave={(t) => patch({ tags: t }, "Tags updated")} />
        </Field>
        <Field label="Created Date">{fmtDT(lead.createdAt)}</Field>
        <Field label="Assigned Date">{fmtDT(lead.assignedAt)}</Field>
        <Field label="Stage Reason">
          <EmailField value={lead.stageReason ?? ""} onSave={(v) => patch({ stageReason: v }, "Stage reason updated")} />
        </Field>
      </Section>
    </div>
  );
}
