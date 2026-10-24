"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BdButton,
  BdCard,
  BdEmptyRow,
  BdField,
  BdPage,
  BdSelect,
  BdStatCard,
  BdTable,
  BdTableToolbar,
  BdTd,
  BdTh,
  formatBdDate,
} from "@/components/bd";
import { TeamAgentSelects, scopeQuery, type TeamAgentValue } from "@/components/bd/TeamAgentSelects";
import { ColumnPicker, type ColumnDef } from "./ColumnPicker";
import { DateRangeFields, rangeParams, type DateRangeValue } from "./DateRangeFields";
import { downloadCsv } from "./csv";

interface Row {
  _id: string;
  type: string;
  description?: string;
  actorName?: string;
  occurredAt: string;
  leadId?: {
    _id: string;
    contact?: { name?: string; primaryPhone?: string };
    leadNumber?: string;
    stage?: string;
    source?: { primary?: string };
  } | null;
}

const cap = (s?: string) => (s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "-");

const ACTIVITY_TYPES = [
  { value: "call_made,call_missed", label: "Calls" },
  { value: "meeting_logged", label: "Meetings" },
  { value: "site_visit_scheduled,site_visit_completed,site_visit_cancelled", label: "Site Visits" },
  { value: "stage_changed", label: "Stage Changes" },
  { value: "whatsapp_sent,whatsapp_received", label: "WhatsApp" },
  { value: "sms_sent,sms_received", label: "SMS" },
  { value: "email_sent,email_received", label: "Email" },
  { value: "followup_set", label: "Follow Ups" },
  { value: "comment_added", label: "Notes" },
];

const LOG_TYPES = [
  "lead_created",
  "lead_assigned",
  "lead_unassigned",
  "stage_changed",
  "pipeline_changed",
  "priority_changed",
  "field_updated",
  "tag_added",
  "tag_removed",
  "comment_added",
  "call_made",
  "call_missed",
  "whatsapp_sent",
  "whatsapp_received",
  "sms_sent",
  "email_sent",
  "site_visit_scheduled",
  "site_visit_completed",
  "site_visit_cancelled",
  "meeting_logged",
  "followup_set",
  "document_uploaded",
  "duplicate_detected",
  "merged",
  "imported",
  "exported",
  "automation_triggered",
  "campaign_targeted",
  "payment_received",
].map((t) => ({ value: t, label: cap(t) }));

const LOG_REPORT: Array<[string, string]> = [
  ["lead_created", "Lead Added"],
  ["lead_assigned", "Lead Assigned"],
  ["stage_changed", "Stage Changed"],
  ["call_made", "Calls Made"],
  ["whatsapp_sent", "WhatsApp Sent"],
  ["site_visit_scheduled", "Site Visit Scheduled"],
  ["field_updated", "Details Updated"],
  ["merged", "Merged"],
  ["comment_added", "Notes Added"],
];

const ACT_COLS: ColumnDef[] = [
  { key: "date", label: "Date" },
  { key: "lead", label: "Lead" },
  { key: "mobile", label: "Mobile" },
  { key: "type", label: "Type" },
  { key: "details", label: "Details" },
  { key: "exec", label: "Executive" },
  { key: "stage", label: "Stage" },
];
const LOG_COLS: ColumnDef[] = [
  { key: "date", label: "Date" },
  { key: "details", label: "Details" },
  { key: "exec", label: "Executive" },
  { key: "stage", label: "Stage" },
  { key: "source", label: "Source" },
  { key: "type", label: "Logs Type" },
];

interface Filters {
  range: DateRangeValue;
  scope: TeamAgentValue;
  type: string;
}
const DEFAULT: Filters = { range: { range: "today", from: "", to: "" }, scope: { team: "", agent: "" }, type: "" };

export function ActivityFeedPage({ mode }: { mode: "activities" | "logs" }) {
  const isLogs = mode === "logs";
  const router = useRouter();
  const [draft, setDraft] = useState<Filters>(DEFAULT);
  const [applied, setApplied] = useState<Filters>(DEFAULT);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const COLS = isLogs ? LOG_COLS : ACT_COLS;
  const [cols, setCols] = useState<string[]>(COLS.map((c) => c.key).filter((k) => k !== "mobile"));
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [report, setReport] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [q, applied, pageSize]);

  const query = useCallback(
    (limit: number, skip: number) => {
      const u = scopeQuery(applied.scope);
      rangeParams(applied.range, u);
      u.set("limit", String(limit));
      u.set("skip", String(skip));
      if (q) u.set("q", q);
      if (applied.type) u.set(isLogs ? "type" : "types", applied.type);
      return u;
    },
    [applied, q, isLogs],
  );

  const endpoint = isLogs ? "/api/crm/logs" : "/api/crm/activities";

  const load = useCallback(() => {
    setLoading(true);
    fetch(`${endpoint}?${query(pageSize, (page - 1) * pageSize)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.logs ?? d.activities ?? []);
        setTotal(d.total ?? 0);
        setReport(d.report ?? {});
      })
      .finally(() => setLoading(false));
  }, [endpoint, query, page, pageSize]);
  useEffect(load, [load]);

  const exportCsv = async () => {
    const all: Row[] = [];
    for (let skip = 0; skip < 10000; skip += 1000) {
      const d = await fetch(`${endpoint}?${query(1000, skip)}`, { cache: "no-store" }).then((r) => r.json());
      const batch: Row[] = d.logs ?? d.activities ?? [];
      all.push(...batch);
      if (batch.length < 1000) break;
    }
    if (!all.length) {
      toast.info("Nothing to export for these filters.");
      return;
    }
    downloadCsv(
      `${mode}.csv`,
      ["Date", "Lead", "Mobile", "Lead #", "Type", "Details", "Executive", "Stage", "Source"],
      all.map((r) => [
        formatBdDate(r.occurredAt),
        r.leadId?.contact?.name,
        r.leadId?.contact?.primaryPhone,
        r.leadId?.leadNumber,
        cap(r.type),
        r.description,
        r.actorName,
        cap(r.leadId?.stage),
        cap(r.leadId?.source?.primary),
      ]),
    );
  };

  const show = (k: string) => cols.includes(k);
  const typeOptions = isLogs ? LOG_TYPES : ACTIVITY_TYPES;
  const r = report;

  return (
    <BdPage>
      <BdCard bodyClassName="!p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DateRangeFields value={draft.range} onChange={(range) => setDraft((d) => ({ ...d, range }))} />
          <BdField label={isLogs ? "Logs Type" : "Activity Type"}>
            <BdSelect
              value={draft.type}
              onChange={(type) => setDraft((d) => ({ ...d, type }))}
              placeholder={isLogs ? "Select Logs Type" : "Select Activity Type"}
              options={typeOptions}
            />
          </BdField>
          <BdField label="Team / Sales Agent" className="sm:col-span-2">
            <TeamAgentSelects
              value={draft.scope}
              onChange={(scope) => setDraft((d) => ({ ...d, scope }))}
              className="!gap-3 flex-nowrap"
              selectClassName="!w-full min-w-0 flex-1"
            />
          </BdField>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <BdButton onClick={() => setApplied(draft)}>Search</BdButton>
          <BdButton
            variant="light"
            onClick={() => {
              setDraft(DEFAULT);
              setApplied(DEFAULT);
              setSearch("");
            }}
          >
            Clear
          </BdButton>
          <BdButton variant="light" onClick={exportCsv}>
            Export CSV
          </BdButton>
        </div>
      </BdCard>

      {isLogs ? (
        <BdCard title="Logs Report">
          <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
            {LOG_REPORT.map(([k, label]) => (
              <div key={k} className="flex items-center justify-between border-l-[3px] border-[#3a5dc2] pl-3 text-[13.5px]">
                <span className="text-[#2b2f3a]">{label}</span>
                <span className="font-medium tabular-nums text-[#2b2f3a]">{r[k] ?? 0}</span>
              </div>
            ))}
          </div>
        </BdCard>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
          <BdStatCard title="Total Activities" value={r.total ?? 0} />
          <BdStatCard title="Calls" value={(r.callsMade ?? 0) + (r.callsMissed ?? 0)} caption={`${r.callsMissed ?? 0} missed`} />
          <BdStatCard title="Meetings" value={r.meetings ?? 0} />
          <BdStatCard
            title="Site Visits"
            value={(r.siteVisitScheduled ?? 0) + (r.siteVisitCompleted ?? 0)}
            caption={`${r.siteVisitScheduled ?? 0} scheduled · ${r.siteVisitCompleted ?? 0} done`}
          />
          <BdStatCard title="Stage Changes" value={r.stageChanges ?? 0} />
          <BdStatCard title="WhatsApp" value={r.whatsapp ?? 0} />
        </div>
      )}

      <BdCard title={isLogs ? "Logs" : "Activities"}>
        <BdTableToolbar
          page={page}
          totalPages={Math.ceil(total / pageSize)}
          onPage={setPage}
          search={search}
          onSearch={setSearch}
          pageSize={pageSize}
          onPageSize={setPageSize}
          left={<span className="text-[12.5px] text-[#8b90a0]">{total} total</span>}
          right={<ColumnPicker columns={COLS} visible={cols} onChange={setCols} />}
        />
        <BdTable minWidth={860}>
          <thead>
            <tr>
              <BdTh>#</BdTh>
              {COLS.filter((c) => show(c.key)).map((c) => (
                <BdTh key={c.key}>{c.label}</BdTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <BdEmptyRow colSpan={cols.length + 1} loading={loading} />
            ) : (
              rows.map((a, i) => {
                const leadName = a.leadId?.contact?.name;
                const leadLink = a.leadId?._id ? (
                  <button
                    type="button"
                    onClick={() => router.push(`/leads?open=${a.leadId!._id}`)}
                    className="text-left font-medium text-[#3a5dc2] hover:underline"
                  >
                    {leadName ?? a.leadId.leadNumber ?? "Lead"}
                  </button>
                ) : (
                  <span>{leadName ?? "System"}</span>
                );
                return (
                  <tr key={a._id}>
                    <BdTd className="text-[#8b90a0]">{(page - 1) * pageSize + i + 1}</BdTd>
                    {show("date") ? <BdTd className="whitespace-nowrap">{formatBdDate(a.occurredAt)}</BdTd> : null}
                    {!isLogs && show("lead") ? <BdTd>{leadLink}</BdTd> : null}
                    {!isLogs && show("mobile") ? <BdTd className="whitespace-nowrap">{a.leadId?.contact?.primaryPhone ?? "-"}</BdTd> : null}
                    {!isLogs && show("type") ? <BdTd>{cap(a.type)}</BdTd> : null}
                    {show("details") ? (
                      isLogs ? (
                        <BdTd className="max-w-[420px]">
                          <div className="font-medium">{leadLink}</div>
                          <div className="text-[12px] text-[#8b90a0]">{a.description ?? cap(a.type)}</div>
                        </BdTd>
                      ) : (
                        <BdTd className="max-w-[360px]">{a.description ?? "-"}</BdTd>
                      )
                    ) : null}
                    {show("exec") ? <BdTd>{a.actorName ?? "-"}</BdTd> : null}
                    {show("stage") ? <BdTd>{cap(a.leadId?.stage)}</BdTd> : null}
                    {isLogs && show("source") ? <BdTd>{cap(a.leadId?.source?.primary)}</BdTd> : null}
                    {isLogs && show("type") ? <BdTd>{cap(a.type)}</BdTd> : null}
                  </tr>
                );
              })
            )}
          </tbody>
        </BdTable>
      </BdCard>
    </BdPage>
  );
}
