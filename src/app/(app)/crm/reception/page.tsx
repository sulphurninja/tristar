"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, UserCheck, Users } from "lucide-react";
import { toast } from "sonner";
import {
  BdBadge,
  BdButton,
  BdCard,
  BdEmptyRow,
  BdField,
  BdInput,
  BdKpi,
  BdPage,
  BdSelect,
  BdTable,
  BdTableToolbar,
  BdTd,
  BdTh,
  formatBdDate,
} from "@/components/bd";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { BdModal } from "@/components/crm/BdModal";
import { ColumnPicker, type ColumnDef } from "@/components/crm/ColumnPicker";
import { DateRangeFields, rangeParams, type DateRangeValue } from "@/components/crm/DateRangeFields";
import { RowMenu } from "@/components/crm/RowMenu";
import { SOURCE_OPTIONS, useProjects } from "@/components/crm/ContactModals";
import { downloadCsv } from "@/components/crm/csv";

interface Visit {
  _id: string;
  visitorName: string;
  visitorPhone: string;
  visitorEmail?: string;
  visitorCount?: number;
  purpose?: string;
  projectId?: string;
  projectName?: string;
  meetWith?: string;
  meetWithName?: string;
  source?: string;
  visitStatus: "waiting" | "met" | "completed" | "left";
  checkInAt?: string;
  visitDate?: string;
  metAt?: string;
  checkOutAt?: string;
  remarks?: string;
  leadId?: { _id: string; leadNumber?: string; contact?: { name?: string } } | null;
}

const PURPOSES = [
  { value: "new_enquiry", label: "New Enquiry" },
  { value: "site_visit", label: "Site Visit" },
  { value: "meeting", label: "Meeting" },
  { value: "cp_visit", label: "CP Visit" },
  { value: "other", label: "Other" },
];
const STATUSES = [
  { value: "waiting", label: "Waiting" },
  { value: "met", label: "Met" },
  { value: "completed", label: "Completed" },
  { value: "left", label: "Left" },
];
const STATUS_COLOR: Record<string, string> = { waiting: "#e9b72a", met: "#3d7be8", completed: "#37c47f", left: "#9a9ca6" };
const label = (opts: Array<{ value: string; label: string }>, v?: string) => opts.find((o) => o.value === v)?.label ?? (v ? v.replace(/_/g, " ") : "-");
const time = (d?: string) => (d ? new Date(d).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true }) : "-");

const COLUMNS: ColumnDef[] = [
  { key: "visitor", label: "Visitor" },
  { key: "mobile", label: "Mobile" },
  { key: "purpose", label: "Purpose" },
  { key: "project", label: "Project" },
  { key: "meet", label: "Whom To Meet" },
  { key: "source", label: "Source" },
  { key: "status", label: "Status" },
  { key: "checkin", label: "Check In" },
  { key: "checkout", label: "Check Out" },
  { key: "lead", label: "Lead" },
  { key: "remarks", label: "Remarks" },
];

interface Filters {
  range: DateRangeValue;
  status: string;
  projectId: string;
  assignee: string;
  purpose: string;
}
const DEFAULT: Filters = { range: { range: "today", from: "", to: "" }, status: "", projectId: "", assignee: "", purpose: "" };

export default function ReceptionPage() {
  const router = useRouter();
  const { users } = useDirectory();
  const projects = useProjects();
  const [draft, setDraft] = useState<Filters>(DEFAULT);
  const [applied, setApplied] = useState<Filters>(DEFAULT);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [cols, setCols] = useState<string[]>(COLUMNS.map((c) => c.key).filter((k) => k !== "remarks" && k !== "source"));
  const [rows, setRows] = useState<Visit[]>([]);
  const [total, setTotal] = useState(0);
  const [kpis, setKpis] = useState({ total: 0, waiting: 0, met: 0, completed: 0, left: 0 });
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [q, applied, pageSize]);

  const query = useCallback(
    (limit: number, skip: number) => {
      const u = new URLSearchParams();
      rangeParams(applied.range, u);
      if (applied.status) u.set("status", applied.status);
      if (applied.projectId) u.set("projectId", applied.projectId);
      if (applied.assignee) u.set("assignee", applied.assignee);
      if (applied.purpose) u.set("purpose", applied.purpose);
      if (q) u.set("q", q);
      u.set("limit", String(limit));
      u.set("skip", String(skip));
      return u;
    },
    [applied, q],
  );

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/reception?${query(pageSize, (page - 1) * pageSize)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.visits ?? []);
        setTotal(d.total ?? 0);
        setKpis(d.kpis ?? { total: 0, waiting: 0, met: 0, completed: 0, left: 0 });
      })
      .finally(() => setLoading(false));
  }, [query, page, pageSize]);
  useEffect(load, [load]);

  const act = async (id: string, body: Record<string, unknown>, okMsg: string) => {
    const res = await fetch(`/api/reception/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(j.error || "Action failed.");
    else {
      toast.success(j.message || okMsg);
      load();
    }
  };
  const remove = async (v: Visit) => {
    if (!window.confirm(`Delete the visit record of "${v.visitorName}"?`)) return;
    const res = await fetch(`/api/reception/${v._id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(j.error || "Couldn't delete.");
    else {
      toast.success("Visitor record deleted");
      load();
    }
  };

  const exportCsv = async () => {
    const d = await fetch(`/api/reception?${query(1000, 0)}`, { cache: "no-store" }).then((r) => r.json());
    const list: Visit[] = d.visits ?? [];
    if (!list.length) return toast.info("Nothing to export for these filters.");
    downloadCsv(
      "reception.csv",
      ["Visitor", "Mobile", "Purpose", "Project", "Whom To Meet", "Source", "Status", "Check In", "Check Out", "Lead", "Remarks"],
      list.map((v) => [
        v.visitorName,
        v.visitorPhone,
        label(PURPOSES, v.purpose),
        v.projectName,
        v.meetWithName,
        v.source,
        label(STATUSES, v.visitStatus),
        formatBdDate(v.checkInAt),
        v.checkOutAt ? formatBdDate(v.checkOutAt) : "",
        v.leadId?.leadNumber,
        v.remarks,
      ]),
    );
  };

  const isToday = applied.range.range === "today";
  const show = (k: string) => cols.includes(k);
  const setStatusFilter = (s: string) => {
    const next = { ...applied, status: applied.status === s ? "" : s };
    setApplied(next);
    setDraft(next);
  };

  return (
    <BdPage>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BdKpi label={isToday ? "Today's Visitors" : "Total Visitors"} value={kpis.total} icon={Users} tone="violet" onClick={() => setStatusFilter("")} active={!applied.status} />
        <BdKpi label="Waiting" value={kpis.waiting} icon={Clock} tone="yellow" onClick={() => setStatusFilter("waiting")} active={applied.status === "waiting"} />
        <BdKpi label="Met" value={kpis.met} icon={UserCheck} tone="blue" onClick={() => setStatusFilter("met")} active={applied.status === "met"} />
        <BdKpi label="Completed" value={kpis.completed} icon={CheckCircle2} tone="green" onClick={() => setStatusFilter("completed")} active={applied.status === "completed"} />
      </div>

      <BdCard bodyClassName="!p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <DateRangeFields value={draft.range} onChange={(range) => setDraft((d) => ({ ...d, range }))} />
          <BdField label="Status">
            <BdSelect value={draft.status} onChange={(status) => setDraft((d) => ({ ...d, status }))} placeholder="Select Status" options={STATUSES} />
          </BdField>
          <BdField label="Project">
            <BdSelect
              value={draft.projectId}
              onChange={(projectId) => setDraft((d) => ({ ...d, projectId }))}
              placeholder="Select Project"
              options={projects.map((p) => ({ value: p._id, label: p.name }))}
            />
          </BdField>
          <BdField label="Whom To Meet">
            <BdSelect
              value={draft.assignee}
              onChange={(assignee) => setDraft((d) => ({ ...d, assignee }))}
              placeholder="Select Sales Agent"
              options={users.filter((u) => u.status !== "suspended").map((u) => ({ value: u._id, label: u.name }))}
            />
          </BdField>
          <BdField label="Purpose">
            <BdSelect value={draft.purpose} onChange={(purpose) => setDraft((d) => ({ ...d, purpose }))} placeholder="Select Purpose" options={PURPOSES} />
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
          <BdButton onClick={() => setAddOpen(true)}>Add Visitor</BdButton>
        </div>
      </BdCard>

      <BdCard title="Reception">
        <BdTableToolbar
          page={page}
          totalPages={Math.ceil(total / pageSize)}
          onPage={setPage}
          search={search}
          onSearch={setSearch}
          pageSize={pageSize}
          onPageSize={setPageSize}
          left={<span className="text-[12.5px] text-[#8b90a0]">{total} total</span>}
          right={<ColumnPicker columns={COLUMNS} visible={cols} onChange={setCols} />}
        />
        <BdTable minWidth={1000}>
          <thead>
            <tr>
              <BdTh>#</BdTh>
              {COLUMNS.filter((c) => show(c.key)).map((c) => (
                <BdTh key={c.key}>{c.label}</BdTh>
              ))}
              <BdTh>Action</BdTh>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <BdEmptyRow colSpan={cols.length + 2} loading={loading} />
            ) : (
              rows.map((v, i) => {
                const open = v.visitStatus === "waiting" || v.visitStatus === "met";
                return (
                  <tr key={v._id}>
                    <BdTd className="text-[#8b90a0]">{(page - 1) * pageSize + i + 1}</BdTd>
                    {show("visitor") ? (
                      <BdTd className="font-medium">
                        {v.visitorName}
                        {(v.visitorCount ?? 1) > 1 ? <span className="ml-1 text-[11.5px] font-normal text-[#8b90a0]">+{(v.visitorCount ?? 1) - 1}</span> : null}
                      </BdTd>
                    ) : null}
                    {show("mobile") ? <BdTd className="whitespace-nowrap">{v.visitorPhone}</BdTd> : null}
                    {show("purpose") ? <BdTd>{label(PURPOSES, v.purpose)}</BdTd> : null}
                    {show("project") ? <BdTd>{v.projectName ?? "-"}</BdTd> : null}
                    {show("meet") ? <BdTd>{v.meetWithName ?? "-"}</BdTd> : null}
                    {show("source") ? <BdTd className="capitalize">{(v.source ?? "-").replace(/_/g, " ")}</BdTd> : null}
                    {show("status") ? (
                      <BdTd>
                        <BdBadge color={STATUS_COLOR[v.visitStatus]}>{label(STATUSES, v.visitStatus).toUpperCase()}</BdBadge>
                      </BdTd>
                    ) : null}
                    {show("checkin") ? <BdTd className="whitespace-nowrap">{isToday ? time(v.checkInAt) : formatBdDate(v.checkInAt)}</BdTd> : null}
                    {show("checkout") ? (
                      <BdTd className="whitespace-nowrap">{v.checkOutAt ? (isToday ? time(v.checkOutAt) : formatBdDate(v.checkOutAt)) : "-"}</BdTd>
                    ) : null}
                    {show("lead") ? (
                      <BdTd>
                        {v.leadId ? (
                          <button type="button" className="text-[#3a5dc2] hover:underline" onClick={() => router.push(`/leads?open=${v.leadId!._id}`)}>
                            {v.leadId.leadNumber ?? "Lead"}
                          </button>
                        ) : (
                          "-"
                        )}
                      </BdTd>
                    ) : null}
                    {show("remarks") ? <BdTd className="max-w-[240px] truncate">{v.remarks ?? "-"}</BdTd> : null}
                    <BdTd>
                      <RowMenu
                        items={[
                          { label: "Mark Met", hidden: v.visitStatus !== "waiting", onClick: () => act(v._id, { action: "mark_met" }, "Marked as met") },
                          { label: "Check Out", hidden: !open, onClick: () => act(v._id, { action: "check_out" }, "Visitor checked out") },
                          { label: "Convert To Lead", hidden: !!v.leadId, onClick: () => act(v._id, { action: "convert_to_lead" }, "Converted to lead") },
                          { label: "Open Lead", hidden: !v.leadId, onClick: () => router.push(`/leads?open=${v.leadId!._id}`) },
                          { label: "Delete", danger: true, onClick: () => remove(v) },
                        ]}
                      />
                    </BdTd>
                  </tr>
                );
              })
            )}
          </tbody>
        </BdTable>
      </BdCard>

      <AddVisitorModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={load} />
    </BdPage>
  );
}

interface Existing {
  _id: string;
  leadNumber?: string;
  contact: { name: string };
  stage?: string;
}

function AddVisitorModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const { users } = useDirectory();
  const projects = useProjects();
  const blank = {
    visitorName: "",
    visitorPhone: "",
    visitorEmail: "",
    visitorCount: "1",
    purpose: "new_enquiry",
    projectId: "",
    meetWith: "",
    source: "walkin",
    remarks: "",
    leadMode: "create",
  };
  const [f, setF] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<Existing | null>(null);
  const set = (p: Partial<typeof blank>) => setF((x) => ({ ...x, ...p }));

  useEffect(() => {
    if (open) {
      setF(blank);
      setExisting(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (f.visitorPhone.replace(/\D/g, "").length < 7) {
      setExisting(null);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/reception/lookup?phone=${encodeURIComponent(f.visitorPhone)}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setExisting(d.lead ?? null))
        .catch(() => setExisting(null));
    }, 350);
    return () => clearTimeout(t);
  }, [f.visitorPhone]);

  const save = async () => {
    if (!f.visitorName.trim() || !f.visitorPhone.trim()) return toast.error("Visitor name and mobile are required.");
    setSaving(true);
    try {
      const res = await fetch("/api/reception", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, visitorCount: Number(f.visitorCount) || 1 }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(j.error || "Couldn't add visitor.");
      toast.success(j.leadCreated ? "Visitor checked in and lead created" : j.leadMatched ? "Visitor checked in and linked to existing lead" : "Visitor checked in");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BdModal
      open={open}
      onClose={onClose}
      title="Add Visitor"
      footer={
        <>
          <BdButton variant="light" onClick={onClose}>
            Cancel
          </BdButton>
          <BdButton onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Check In"}
          </BdButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <BdField label="Visitor Name *">
          <BdInput value={f.visitorName} onChange={(e) => set({ visitorName: e.target.value })} placeholder="Visitor Name" />
        </BdField>
        <BdField label="Mobile *">
          <BdInput value={f.visitorPhone} onChange={(e) => set({ visitorPhone: e.target.value })} placeholder="Mobile" />
        </BdField>
        {existing ? (
          <div className="rounded-[3px] border border-[#cfd8f1] bg-[#eef3ff] px-3 py-2 text-[12.5px] text-[#2b2f3a] sm:col-span-2">
            Existing {existing.leadNumber ? `${existing.leadNumber} — ` : ""}
            <b>{existing.contact?.name}</b> found with this mobile ({(existing.stage ?? "").replace(/_/g, " ")}). The visit will be linked to it.
          </div>
        ) : null}
        <BdField label="Email">
          <BdInput type="email" value={f.visitorEmail} onChange={(e) => set({ visitorEmail: e.target.value })} placeholder="Email" />
        </BdField>
        <BdField label="No. Of Visitors">
          <BdInput type="number" min={1} value={f.visitorCount} onChange={(e) => set({ visitorCount: e.target.value })} />
        </BdField>
        <BdField label="Purpose">
          <BdSelect value={f.purpose} clearable={false} onChange={(v) => set({ purpose: v || "new_enquiry" })} options={PURPOSES} />
        </BdField>
        <BdField label="Project">
          <BdSelect value={f.projectId} onChange={(v) => set({ projectId: v })} placeholder="Select Project" options={projects.map((p) => ({ value: p._id, label: p.name }))} />
        </BdField>
        <BdField label="Whom To Meet">
          <BdSelect
            value={f.meetWith}
            onChange={(v) => set({ meetWith: v })}
            placeholder="Select Sales Agent"
            options={users.filter((u) => u.status !== "suspended").map((u) => ({ value: u._id, label: u.name }))}
          />
        </BdField>
        <BdField label="Source">
          <BdSelect value={f.source} clearable={false} onChange={(v) => set({ source: v || "walkin" })} options={[{ value: "walkin", label: "Walk-in" }, ...SOURCE_OPTIONS.filter((s) => s.value !== "walkin")]} />
        </BdField>
        <BdField label="Lead" className="sm:col-span-2">
          <BdSelect
            value={f.leadMode}
            clearable={false}
            onChange={(v) => set({ leadMode: v || "none" })}
            options={[
              { value: "create", label: "Link existing lead, or create a new lead" },
              { value: "match", label: "Link existing lead only" },
              { value: "none", label: "Do not link a lead" },
            ]}
          />
        </BdField>
        <BdField label="Remarks" className="sm:col-span-2">
          <textarea value={f.remarks} onChange={(e) => set({ remarks: e.target.value })} rows={2} className="bd-input !h-auto py-2" placeholder="Remarks" />
        </BdField>
      </div>
    </BdModal>
  );
}
