"use client";

import { useEffect, useState } from "react";
import { FileText, Pencil, RefreshCw } from "lucide-react";
import { BdSelect } from "@/components/bd";
import { EMPLOYMENT_TYPES } from "@/components/leads/types";
import { fmtDT } from "@/components/leads/list/LeadsTable";
import { cn } from "@/lib/utils";
import type { Detail, TabCtx } from "./types";

interface FieldDef {
  key: string;
  label: string;
  kind: "text" | "number" | "select";
  options?: string[];
  display?: (raw: unknown) => string;
}

function SectionCard({
  title,
  children,
  onEdit,
  editing,
  actions,
}: {
  title: string;
  children: React.ReactNode;
  onEdit?: () => void;
  editing?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      <div className="mb-2 flex items-center justify-between px-1">
        <h4 className="text-[12.5px] font-bold uppercase tracking-wide text-[#4a4f5f]">{title}</h4>
        {onEdit && !editing ? (
          <button type="button" onClick={onEdit} aria-label={`Edit ${title}`} className="rounded p-1 text-[#7c8296] hover:bg-[#eef1fa] hover:text-[#3a5dc2]">
            <Pencil className="size-3.5" />
          </button>
        ) : null}
        {actions}
      </div>
      <div className="rounded-[3px] border border-[#e6e9f2] bg-white">{children}</div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[120px_1fr] items-center gap-3 border-b border-[#eef0f6] px-3 py-2.5 last:border-0">
      <p className="text-[11.5px] font-bold uppercase leading-tight tracking-wide text-[#4a4f5f]">{label}</p>
      <div className="min-w-0 break-words text-[14px] text-[#2b2f3a]">{children}</div>
    </div>
  );
}

/** Section whose values can be edited together and saved with one PATCH. */
function EditableSection({
  title,
  prefix,
  fields,
  source,
  ctx,
}: {
  title: string;
  prefix: "employment" | "otherDetails";
  fields: FieldDef[];
  source: Record<string, unknown>;
  ctx: TabCtx;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setDraft(Object.fromEntries(fields.map((f) => [f.key, source[f.key] == null ? "" : String(source[f.key])])));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(source), editing]);

  const save = async () => {
    setBusy(true);
    const payload: Record<string, unknown> = {};
    for (const f of fields) payload[f.key] = f.kind === "number" ? (draft[f.key] === "" ? null : Number(draft[f.key])) : draft[f.key];
    const ok = await ctx.patch({ [prefix]: payload }, `${title.toLowerCase().replace(/^./, (c) => c.toUpperCase())} saved`);
    setBusy(false);
    if (ok) setEditing(false);
  };

  return (
    <SectionCard title={title} editing={editing} onEdit={() => setEditing(true)}>
      {fields.map((f) => (
        <Row key={f.key} label={f.label}>
          {editing ? (
            f.kind === "select" ? (
              <BdSelect
                value={draft[f.key] ?? ""}
                onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v }))}
                options={(f.options ?? []).map((o) => ({ value: o, label: o }))}
                clearable={f.key !== "loan"}
                placeholder="-"
              />
            ) : (
              <input
                type={f.kind === "number" ? "number" : "text"}
                value={draft[f.key] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: e.target.value }))}
                className="bd-input !h-8"
              />
            )
          ) : (
            (() => {
              const raw = source[f.key];
              if (raw == null || raw === "") return "-";
              return f.display ? f.display(raw) : String(raw);
            })()
          )}
        </Row>
      ))}
      {editing ? (
        <div className="flex justify-end gap-2 px-3 py-2.5">
          <button type="button" className="bd-btn-light" onClick={() => setEditing(false)} disabled={busy}>
            Cancel
          </button>
          <button type="button" className="bd-btn" onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      ) : null}
    </SectionCard>
  );
}

const inr = (raw: unknown) => {
  const n = Number(raw);
  return Number.isFinite(n) ? `₹ ${n.toLocaleString("en-IN")}` : "-";
};

export function RightPanel({
  ctx,
  detail,
  refreshing,
  onRefresh,
}: {
  ctx: TabCtx;
  detail: Detail;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const { lead } = ctx;
  const cp = lead.brokerId;
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto rounded-[3px] bg-white shadow-[0_1px_4px_rgba(30,50,110,0.06)]">
      <div className="flex items-center gap-3 border-b border-[#eef0f6] px-4 py-3.5">
        <span className="flex size-10 items-center justify-center rounded-[6px] bg-[#3a5dc2] text-white">
          <FileText className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[16px] font-semibold uppercase leading-tight text-[#2b2f3a]">Details</h3>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[#6b7186]">Information Management</p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          aria-label="Refresh details"
          className="flex size-8 items-center justify-center rounded-full bg-[#eef1fa] text-[#3a5dc2] hover:bg-[#dfe6f8]"
        >
          <RefreshCw className={cn("size-4", refreshing && "animate-spin")} />
        </button>
      </div>

      <div className="px-3 pt-4">
        <EditableSection
          title="Employment Details"
          prefix="employment"
          ctx={ctx}
          source={(lead.employment ?? {}) as Record<string, unknown>}
          fields={[
            { key: "company", label: "Company Name", kind: "text" },
            { key: "type", label: "Employment Type", kind: "select", options: EMPLOYMENT_TYPES },
            { key: "designation", label: "Designation", kind: "text" },
            { key: "income", label: "Income", kind: "number", display: inr },
          ]}
        />

        <SectionCard title="Channel Partner">
          <Row label="Name">{cp?.name ?? "-"}</Row>
          <Row label="Company Name">{cp?.firmName || "-"}</Row>
          <Row label="Mobile">
            {cp?.phone ? (
              <a href={`tel:${cp.phone}`} className="text-[#3a5dc2] hover:underline">
                {cp.phone}
              </a>
            ) : (
              "-"
            )}
          </Row>
          <Row label="Sourcing Manager">{cp?.rmName || "-"}</Row>
          <Row label="CP Tag Remaining Days">{detail.cpRemainingDays == null ? "-" : detail.cpRemainingDays}</Row>
        </SectionCard>

        <EditableSection
          title="Other Details"
          prefix="otherDetails"
          ctx={ctx}
          source={(lead.otherDetails ?? { loan: "No" }) as Record<string, unknown>}
          fields={[
            { key: "ethnicity", label: "Ethnicity", kind: "text" },
            { key: "loan", label: "Loan", kind: "select", options: ["Yes", "No"] },
          ]}
        />

        <SectionCard title="Last Activity">
          <Row label="Title">
            {detail.lastActivity ? (
              <>
                {detail.lastActivity.description || detail.lastActivity.type.replace(/_/g, " ")}
                <span className="mt-0.5 block text-[12px] text-[#8b90a0]">{fmtDT(detail.lastActivity.occurredAt)}</span>
              </>
            ) : (
              "-"
            )}
          </Row>
        </SectionCard>
      </div>
    </div>
  );
}
