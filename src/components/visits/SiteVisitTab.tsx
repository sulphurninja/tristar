"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, User } from "lucide-react";
import { toast } from "sonner";
import {
  BdBadge,
  BdButton,
  BdCountChip,
  BdEmptyRow,
  BdField,
  BdKpi,
  BdSelect,
  BdTable,
  BdTableToolbar,
  BdTd,
  BdTh,
  formatBdDate,
} from "@/components/bd";
import { BdCheck, BdColumnPicker, BdKebab, BdRowActions } from "@/components/bd/BdOverlays";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { VisitAnalysisModal } from "@/components/tasks/AnalysisModals";
import {
  CategoryBadge,
  DateRangeFilter,
  ENTITY_TYPES,
  LeadLink,
  leadHref,
  mobileOf,
  ordinal,
  rangeParams,
  useColumns,
  useLookups,
  type RangeValue,
  type VisitRow,
} from "@/components/tasks/shared";
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { AddVisitModal, VISIT_TYPES } from "./AddVisitModal";
import { VisitActionModal, type VisitActionMode } from "./VisitActionModal";

interface Filters {
  projectId: string;
  source: string;
  preSales: string;
  team: string;
  assignedTo: string;
  brokerId: string;
  sourcingManager: string;
  status: string;
  visitStatus: string;
  visitType: string;
  entityType: string;
  assignedBy: string;
  frequency: string;
  cpPresent: string;
  date: RangeValue;
}
const EMPTY: Filters = {
  projectId: "",
  source: "",
  preSales: "",
  team: "",
  assignedTo: "",
  brokerId: "",
  sourcingManager: "",
  status: "",
  visitStatus: "",
  visitType: "",
  entityType: "",
  assignedBy: "",
  frequency: "",
  cpPresent: "all",
  date: { range: "today", from: "", to: "" },
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];
const VISIT_STATUS_OPTIONS = [
  { value: "scheduled", label: "Scheduled" },
  { value: "confirmed", label: "Confirmed" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Visited" },
  { value: "no_show", label: "No Show" },
  { value: "cancelled", label: "Cancelled" },
];
const FREQUENCY_OPTIONS = [
  { value: "1", label: "1st Visit" },
  { value: "2", label: "2nd Visit" },
  { value: "3", label: "3rd Visit" },
  { value: "4+", label: "4th Visit or more" },
];
const CP_OPTIONS = [
  { value: "all", label: "All" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const COLUMNS = [
  { key: "created", label: "Created Date" },
  { key: "lead", label: "Lead" },
  { key: "mobile", label: "Mobile" },
  { key: "category", label: "Category" },
  { key: "frequency", label: "Visit Frequency" },
  { key: "project", label: "Project" },
  { key: "schedule", label: "Schedule Date" },
  { key: "title", label: "Title" },
  { key: "remark", label: "Remark" },
  { key: "assignedBy", label: "Assigned By" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "status", label: "Status" },
];
const ALL_COLS = COLUMNS.map((c) => c.key);

function visitStatus(v: VisitRow) {
  switch (v.status) {
    case "done":
      return <BdBadge color="#2fa66a">Visited</BdBadge>;
    case "cancelled":
      return <BdBadge color="#8b90a0">Cancelled</BdBadge>;
    case "no_show":
      return <BdBadge color="#e5484d">No Show</BdBadge>;
    case "confirmed":
      return <BdBadge color="#3a5dc2">Confirmed</BdBadge>;
    case "in_progress":
      return <BdBadge color="#7a66e0">In Progress</BdBadge>;
    default:
      return <BdBadge color="#e9a52a">Scheduled</BdBadge>;
  }
}

export function SiteVisitTab({ openAdd, onAddClosed }: { openAdd: boolean; onAddClosed: () => void }) {
  const router = useRouter();
  const { users, teams } = useDirectory();
  const { projects, brokers, sources } = useLookups();

  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [kpi, setKpi] = useState<"" | "today" | "upcoming" | "pending" | "completed">("today");
  const [kpiRange, setKpiRange] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<{ key: "created" | "schedule"; dir: "asc" | "desc" }>({ key: "schedule", dir: "desc" });

  const [rows, setRows] = useState<VisitRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ today: 0, upcoming: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cols, setCols] = useColumns("tristar.visits.columns", ALL_COLS);

  const [addOpen, setAddOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [action, setAction] = useState<{ mode: VisitActionMode; visits: VisitRow[] } | null>(null);

  useEffect(() => {
    if (openAdd) setAddOpen(true);
  }, [openAdd]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const baseParams = useCallback(() => {
    const p = new URLSearchParams();
    const f = applied;
    const map: Array<[string, string]> = [
      ["projectId", f.projectId],
      ["source", f.source],
      ["preSales", f.preSales],
      ["team", f.team],
      ["agent", f.assignedTo],
      ["brokerId", f.brokerId],
      ["sourcingManager", f.sourcingManager],
      ["status", f.status],
      ["visitStatus", f.visitStatus],
      ["visitType", f.visitType],
      ["entityType", f.entityType],
      ["assignedBy", f.assignedBy],
      ["frequency", f.frequency],
      ["cpPresent", f.cpPresent === "all" ? "" : f.cpPresent],
      ["q", debouncedQ],
    ];
    for (const [k, v] of map) if (v) p.set(k, v);
    if (f.date.range) rangeParams(f.date, p);
    else p.set("range", kpiRange || "all");
    return p;
  }, [applied, kpiRange, debouncedQ]);

  const reqId = useRef(0);
  const load = useCallback(async () => {
    const my = ++reqId.current;
    setLoading(true);
    const p = baseParams();
    p.set("limit", String(pageSize));
    p.set("page", String(page));
    p.set("sort", sort.key);
    p.set("dir", sort.dir);
    try {
      const res = await fetch(`/api/visits?${p}`, { cache: "no-store" });
      const d = await res.json();
      if (my !== reqId.current) return;
      if (!res.ok) throw new Error(d.error ?? "Failed to load site visits");
      setRows(d.visits ?? []);
      setTotal(d.total ?? 0);
      setTotalPages(d.totalPages ?? 1);
      setStats(d.stats ?? { today: 0, upcoming: 0, pending: 0, completed: 0 });
      setSelected(new Set());
    } catch (e) {
      if (my === reqId.current) toast.error(e instanceof Error ? e.message : "Failed to load site visits");
    } finally {
      if (my === reqId.current) setLoading(false);
    }
  }, [baseParams, page, pageSize, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const apply = () => {
    setApplied(draft);
    setKpi("");
    setKpiRange("");
    setPage(1);
  };
  const clear = () => {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setKpi("today");
    setKpiRange("");
    setQ("");
    setPage(1);
  };
  const pickKpi = (k: "today" | "upcoming" | "pending" | "completed") => {
    const next: Filters = { ...EMPTY, date: { range: "", from: "", to: "" } };
    if (k === "today") next.date = { range: "today", from: "", to: "" };
    if (k === "pending" || k === "upcoming") next.status = "pending";
    if (k === "completed") next.status = "completed";
    setDraft(next);
    setApplied(next);
    setKpi(k);
    setKpiRange(k === "upcoming" ? "later" : "");
    setPage(1);
  };

  const titleOf = (v: VisitRow) => `SITE VISIT with ${(v.leadId?.contact?.name ?? "").toUpperCase()}`;

  const exportCsv = async () => {
    const p = baseParams();
    p.set("limit", "5000");
    p.set("sort", sort.key);
    p.set("dir", sort.dir);
    try {
      const d = await fetch(`/api/visits?${p}`, { cache: "no-store" }).then((r) => r.json());
      const list: VisitRow[] = d.visits ?? [];
      downloadCsv("site-visits", [
        ["#", "Created Date", "Lead", "Mobile", "Category", "Visit Frequency", "Project", "Schedule Date", "Title", "Remark", "Assigned By", "Assigned To", "CP Present", "Channel Partner", "Status"],
        ...list.map((v, i) => [
          i + 1,
          formatBdDate(v.createdAt),
          v.leadId?.contact?.name ?? "",
          mobileOf(v.leadId),
          v.leadId?.isContact ? "CONTACT" : "LEAD",
          ordinal(v.frequency),
          v.projectId?.name ?? "",
          formatBdDate(v.scheduledAt),
          titleOf(v),
          v.remark ?? "",
          v.assignedBy?.name ?? "",
          v.assignedTo?.name ?? "",
          v.cpPresent ? "Yes" : "No",
          v.brokerId?.name ?? v.leadId?.brokerId?.name ?? "",
          v.status,
        ]),
      ]);
    } catch {
      toast.error("Export failed.");
    }
  };

  const toggleSort = (key: "created" | "schedule") =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }));

  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r._id));
  const selectedRows = useMemo(() => rows.filter((r) => selected.has(r._id)), [rows, selected]);
  const show = (k: string) => cols.includes(k);
  const colCount = 3 + cols.length;

  const agentOptions = useMemo(
    () => users.filter((u) => u.status !== "suspended").map((u) => ({ value: u._id, label: u.name })),
    [users],
  );
  const teamAgents = useMemo(
    () =>
      users
        .filter((u) => u.status !== "suspended")
        .filter((u) => !draft.team || String(u.teamId ?? "") === draft.team)
        .map((u) => ({ value: u._id, label: u.name })),
    [users, draft.team],
  );
  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setDraft((d) => ({ ...d, [k]: v }));

  const SortIcon = ({ k }: { k: "created" | "schedule" }) =>
    sort.key === k ? (sort.dir === "asc" ? <ArrowUp className="inline size-3" /> : <ArrowDown className="inline size-3" />) : null;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BdKpi label="Today's Site Visit" value={stats.today} icon={User} active={kpi === "today"} onClick={() => pickKpi("today")} />
        <BdKpi label="Upcoming Site Visit" value={stats.upcoming} icon={User} active={kpi === "upcoming"} onClick={() => pickKpi("upcoming")} />
        <BdKpi label="Pending Site Visit" value={stats.pending} icon={User} active={kpi === "pending"} onClick={() => pickKpi("pending")} />
        <BdKpi label="Completed Site Visit" value={stats.completed} icon={User} active={kpi === "completed"} onClick={() => pickKpi("completed")} />
      </div>

      <section className="bd-card rounded-[3px] p-5">
        <div className="mb-4">
          <BdCountChip>
            {total} <User className="size-3" />
          </BdCountChip>
        </div>
        <form
          className="grid gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault();
            apply();
          }}
        >
          <BdField label="Project">
            <BdSelect placeholder="Search & Select Project" value={draft.projectId} onChange={(v) => set("projectId", v)} options={projects} />
          </BdField>
          <BdField label="Lead Source">
            <BdSelect placeholder="Select Source" value={draft.source} onChange={(v) => set("source", v)} options={sources} />
          </BdField>
          <BdField label="Pre Sales Agent">
            <BdSelect placeholder="Select Pre Sales Agent" value={draft.preSales} onChange={(v) => set("preSales", v)} options={agentOptions} />
          </BdField>
          <BdField label="Teams">
            <BdSelect
              placeholder="Select Team"
              value={draft.team}
              onChange={(v) => setDraft((d) => ({ ...d, team: v, assignedTo: "" }))}
              options={teams.map((t) => ({ value: t._id, label: t.name }))}
            />
          </BdField>
          <BdField label="Assigned To">
            <BdSelect placeholder="Select Sales Agent" value={draft.assignedTo} onChange={(v) => set("assignedTo", v)} options={teamAgents} />
          </BdField>
          <BdField label="Channel Partner">
            <BdSelect placeholder="Search & Select Channel Partner" value={draft.brokerId} onChange={(v) => set("brokerId", v)} options={brokers} />
          </BdField>
          <BdField label="Sourcing Manager">
            <BdSelect placeholder="Select Sourcing Manager" value={draft.sourcingManager} onChange={(v) => set("sourcingManager", v)} options={agentOptions} />
          </BdField>
          <BdField label="Status">
            <BdSelect placeholder="Select Status" value={draft.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} />
          </BdField>
          <BdField label="Site Visit Status">
            <BdSelect placeholder="Select Site Visit Status" value={draft.visitStatus} onChange={(v) => set("visitStatus", v)} options={VISIT_STATUS_OPTIONS} />
          </BdField>
          <BdField label="Select Site Visit Type">
            <BdSelect placeholder="Select Site Visit Type" value={draft.visitType} onChange={(v) => set("visitType", v)} options={VISIT_TYPES} />
          </BdField>
          <BdField label="Entity Type">
            <BdSelect placeholder="Select Entity Type" value={draft.entityType} onChange={(v) => set("entityType", v)} options={ENTITY_TYPES.slice(0, 2)} />
          </BdField>
          <BdField label="Assigned By">
            <BdSelect placeholder="Select Sales Agent" value={draft.assignedBy} onChange={(v) => set("assignedBy", v)} options={agentOptions} />
          </BdField>
          <BdField label="Visit Frequency">
            <BdSelect placeholder="Select Visit Frequency" value={draft.frequency} onChange={(v) => set("frequency", v)} options={FREQUENCY_OPTIONS} />
          </BdField>
          <BdField label="CP Present">
            <BdSelect placeholder="All" value={draft.cpPresent} onChange={(v) => set("cpPresent", v || "all")} options={CP_OPTIONS} />
          </BdField>
          <BdField label="Date Range">
            <DateRangeFilter value={draft.date} onChange={(v) => set("date", v)} />
          </BdField>
          <div className="flex items-end justify-end gap-2 sm:col-span-2 xl:col-span-3">
            <BdButton type="submit">Search</BdButton>
            <BdButton onClick={clear}>Clear</BdButton>
            <BdButton onClick={() => setAddOpen(true)}>Add</BdButton>
            <BdButton onClick={() => setAnalysisOpen(true)}>Analysis</BdButton>
            <BdKebab
              items={[
                { label: "Export CSV", onSelect: exportCsv },
                { label: "Refresh", onSelect: load },
              ]}
            />
          </div>
        </form>
      </section>

      <section className="bd-card rounded-[3px] p-5">
        {selectedRows.length ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-[3px] bg-[#eef1fa] px-3 py-2 text-[13px]">
            <span className="font-medium text-[#2b2f3a]">{selectedRows.length} selected</span>
            <BdButton onClick={() => setAction({ mode: "complete", visits: selectedRows })}>Mark Completed</BdButton>
            <BdButton onClick={() => setAction({ mode: "reassign", visits: selectedRows })}>Reassign</BdButton>
            <BdButton variant="danger" onClick={() => setAction({ mode: "cancel", visits: selectedRows })}>
              Cancel
            </BdButton>
            <BdButton variant="light" onClick={() => setSelected(new Set())}>
              Clear selection
            </BdButton>
          </div>
        ) : null}
        <BdTableToolbar
          page={page}
          totalPages={totalPages}
          onPage={setPage}
          search={q}
          onSearch={setQ}
          pageSize={pageSize}
          onPageSize={(n) => {
            setPageSize(n);
            setPage(1);
          }}
          right={<BdColumnPicker columns={COLUMNS} value={cols} onChange={setCols} />}
        />
        <BdTable minWidth={1650}>
          <thead>
            <tr>
              <BdTh className="w-10">
                <BdCheck checked={allOnPage} label="Select all" onChange={(v) => setSelected(v ? new Set(rows.map((r) => r._id)) : new Set())} />
              </BdTh>
              <BdTh className="w-10">#</BdTh>
              {show("created") ? (
                <BdTh>
                  <button type="button" onClick={() => toggleSort("created")} className="uppercase">
                    Created Date <SortIcon k="created" />
                  </button>
                </BdTh>
              ) : null}
              {show("lead") ? <BdTh>Lead</BdTh> : null}
              {show("mobile") ? <BdTh>Mobile</BdTh> : null}
              {show("category") ? <BdTh>Category</BdTh> : null}
              {show("frequency") ? <BdTh>Visit Frequency</BdTh> : null}
              {show("project") ? <BdTh>Project</BdTh> : null}
              {show("schedule") ? (
                <BdTh>
                  <button type="button" onClick={() => toggleSort("schedule")} className="uppercase">
                    Schedule Date <SortIcon k="schedule" />
                  </button>
                </BdTh>
              ) : null}
              {show("title") ? <BdTh>Title</BdTh> : null}
              {show("remark") ? <BdTh>Remark</BdTh> : null}
              {show("assignedBy") ? <BdTh>Assigned By</BdTh> : null}
              {show("assignedTo") ? <BdTh>Assigned To</BdTh> : null}
              {show("status") ? <BdTh>Status</BdTh> : null}
              <BdTh className="text-center">Action</BdTh>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <BdEmptyRow colSpan={colCount + 1} loading={loading} />
            ) : (
              rows.map((v, i) => (
                <tr key={v._id} className={cn(selected.has(v._id) && "bg-[#f1f4fc]")}>
                  <BdTd>
                    <BdCheck
                      checked={selected.has(v._id)}
                      onChange={(on) =>
                        setSelected((s) => {
                          const n = new Set(s);
                          if (on) n.add(v._id);
                          else n.delete(v._id);
                          return n;
                        })
                      }
                    />
                  </BdTd>
                  <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>
                  {show("created") ? <BdTd className="whitespace-nowrap">{formatBdDate(v.createdAt)}</BdTd> : null}
                  {show("lead") ? (
                    <BdTd>
                      <LeadLink lead={v.leadId} />
                    </BdTd>
                  ) : null}
                  {show("mobile") ? <BdTd className="whitespace-nowrap">{mobileOf(v.leadId)}</BdTd> : null}
                  {show("category") ? (
                    <BdTd>
                      <CategoryBadge lead={v.leadId} />
                    </BdTd>
                  ) : null}
                  {show("frequency") ? <BdTd className="whitespace-nowrap">{v.frequency ? ordinal(v.frequency) : ""}</BdTd> : null}
                  {show("project") ? <BdTd className="whitespace-nowrap uppercase">{v.projectId?.name ?? "-"}</BdTd> : null}
                  {show("schedule") ? <BdTd className="whitespace-nowrap">{formatBdDate(v.scheduledAt)}</BdTd> : null}
                  {show("title") ? (
                    <BdTd className="max-w-[240px]">
                      <span className="line-clamp-2" title={titleOf(v)}>
                        {titleOf(v)}
                      </span>
                    </BdTd>
                  ) : null}
                  {show("remark") ? (
                    <BdTd className="max-w-[240px]">
                      <span className="line-clamp-2" title={v.remark}>
                        {v.remark ?? ""}
                      </span>
                    </BdTd>
                  ) : null}
                  {show("assignedBy") ? <BdTd>{v.assignedBy?.name ?? "-"}</BdTd> : null}
                  {show("assignedTo") ? <BdTd className="font-semibold">{v.assignedTo?.name ?? "-"}</BdTd> : null}
                  {show("status") ? <BdTd>{visitStatus(v)}</BdTd> : null}
                  <BdTd className="text-center">
                    <BdRowActions
                      items={[
                        { label: "Mark Completed", hidden: v.status === "done", onSelect: () => setAction({ mode: "complete", visits: [v] }) },
                        { label: "Reschedule", onSelect: () => setAction({ mode: "reschedule", visits: [v] }) },
                        { label: "Cancel", hidden: v.status === "cancelled", onSelect: () => setAction({ mode: "cancel", visits: [v] }) },
                        { label: "No Show", hidden: v.status === "no_show" || v.status === "done", onSelect: () => setAction({ mode: "noshow", visits: [v] }) },
                        { label: "Reassign", onSelect: () => setAction({ mode: "reassign", visits: [v] }) },
                        { label: "Add Remark", onSelect: () => setAction({ mode: "remark", visits: [v] }) },
                        { label: "View Lead", hidden: !v.leadId, onSelect: () => router.push(leadHref(v.leadId?._id)) },
                        { label: "Delete", danger: true, onSelect: () => setAction({ mode: "delete", visits: [v] }) },
                      ]}
                    />
                  </BdTd>
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
        <div className="pt-3 text-[12.5px] text-[#8b90a0]">
          {total === 0 ? "No entries" : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, total)} of ${total} entries`}
        </div>
      </section>

      <AddVisitModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          onAddClosed();
        }}
        onCreated={load}
      />
      <VisitAnalysisModal open={analysisOpen} onClose={() => setAnalysisOpen(false)} params={baseParams().toString()} />
      <VisitActionModal mode={action?.mode ?? null} visits={action?.visits ?? []} onClose={() => setAction(null)} onDone={load} />
    </div>
  );
}
