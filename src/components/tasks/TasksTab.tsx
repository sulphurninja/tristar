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
import { downloadCsv } from "@/lib/csv";
import { cn } from "@/lib/utils";
import { AddTaskModal } from "./AddTaskModal";
import { TaskAnalysisModal } from "./AnalysisModals";
import { TaskActionModal, type TaskActionMode } from "./TaskActionModal";
import {
  ACTIVITY_TYPES,
  CategoryBadge,
  DateRangeFilter,
  ENTITY_TYPES,
  LeadLink,
  leadHref,
  mobileOf,
  rangeParams,
  typeLabel,
  useColumns,
  useLookups,
  type RangeValue,
  type TaskRow,
} from "./shared";

interface Filters {
  projectId: string;
  activityType: string;
  date: RangeValue;
  preSales: string;
  team: string;
  assignedTo: string;
  status: string;
  assignedBy: string;
  entityType: string;
}
const EMPTY: Filters = {
  projectId: "",
  activityType: "",
  date: { range: "today", from: "", to: "" },
  preSales: "",
  team: "",
  assignedTo: "",
  status: "",
  assignedBy: "",
  entityType: "",
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
];

const COLUMNS = [
  { key: "created", label: "Created Date" },
  { key: "lead", label: "Lead" },
  { key: "mobile", label: "Mobile" },
  { key: "category", label: "Category" },
  { key: "assignedBy", label: "Assigned By" },
  { key: "assignedTo", label: "Assigned To" },
  { key: "preSales", label: "Pre Sales Agent" },
  { key: "schedule", label: "Schedule Date" },
  { key: "title", label: "Title" },
  { key: "remark", label: "Remark" },
  { key: "status", label: "Status" },
];
const ALL_COLS = COLUMNS.map((c) => c.key);

function statusBadge(t: TaskRow) {
  if (t.status === "completed") return <BdBadge color="#2fa66a">Completed</BdBadge>;
  if (t.status === "cancelled") return <BdBadge color="#8b90a0">Cancelled</BdBadge>;
  const overdue = t.scheduleAt && new Date(t.scheduleAt) < new Date();
  return overdue ? <BdBadge color="#e5484d">Overdue</BdBadge> : <BdBadge color="#e9a52a">Pending</BdBadge>;
}

export function TasksTab({ openAdd, onAddClosed }: { openAdd: boolean; onAddClosed: () => void }) {
  const router = useRouter();
  const { users, teams } = useDirectory();
  const { projects } = useLookups();

  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [kpi, setKpi] = useState<"" | "today" | "upcoming" | "pending" | "completed">("today");
  const [kpiRange, setKpiRange] = useState<string>("");
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState<{ key: "created" | "schedule"; dir: "asc" | "desc" }>({ key: "created", dir: "desc" });

  const [rows, setRows] = useState<TaskRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ today: 0, upcoming: 0, pending: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cols, setCols] = useColumns("tristar.tasks.columns", ALL_COLS);

  const [addOpen, setAddOpen] = useState(false);
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [action, setAction] = useState<{ mode: TaskActionMode; tasks: TaskRow[] } | null>(null);

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

  /** Query string for the current filters (without paging). */
  const baseParams = useCallback(() => {
    const p = new URLSearchParams();
    const f = applied;
    if (f.projectId) p.set("projectId", f.projectId);
    if (f.activityType) p.set("activityType", f.activityType);
    rangeParams(f.date, p);
    if (kpiRange === "upcoming") {
      p.set("range", "upcoming");
    }
    if (f.preSales) p.set("preSales", f.preSales);
    if (f.team) p.set("team", f.team);
    if (f.assignedTo) p.set("agent", f.assignedTo);
    if (f.status) p.set("status", f.status);
    if (f.assignedBy) p.set("assignedBy", f.assignedBy);
    if (f.entityType) p.set("entityType", f.entityType);
    if (debouncedQ) p.set("q", debouncedQ);
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
      const res = await fetch(`/api/tasks?${p}`, { cache: "no-store" });
      const d = await res.json();
      if (my !== reqId.current) return;
      if (!res.ok) throw new Error(d.error ?? "Failed to load tasks");
      setRows(d.tasks ?? []);
      setTotal(d.total ?? 0);
      setTotalPages(d.totalPages ?? 1);
      setStats(d.stats ?? { today: 0, upcoming: 0, pending: 0, completed: 0 });
      setSelected(new Set());
    } catch (e) {
      if (my === reqId.current) toast.error(e instanceof Error ? e.message : "Failed to load tasks");
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
    if (k === "pending") next.status = "pending";
    if (k === "completed") next.status = "completed";
    setDraft(next);
    setApplied(next);
    setKpi(k);
    setKpiRange(k === "upcoming" ? "upcoming" : "");
    setPage(1);
  };

  const exportCsv = async () => {
    const p = baseParams();
    p.set("limit", "5000");
    p.set("sort", sort.key);
    p.set("dir", sort.dir);
    try {
      const d = await fetch(`/api/tasks?${p}`, { cache: "no-store" }).then((r) => r.json());
      const list: TaskRow[] = d.tasks ?? [];
      downloadCsv("tasks", [
        ["#", "Created Date", "Lead", "Mobile", "Category", "Assigned By", "Assigned To", "Pre Sales Agent", "Schedule Date", "Activity Type", "Title", "Remark", "Status"],
        ...list.map((t, i) => [
          i + 1,
          formatBdDate(t.createdAt),
          t.leadId?.contact?.name ?? "",
          mobileOf(t.leadId),
          t.leadId?.isContact ? "CONTACT" : "LEAD",
          t.assignedBy?.name ?? "",
          t.assignedTo?.name ?? "",
          t.leadId?.assignedTo?.name ?? "",
          formatBdDate(t.scheduleAt),
          typeLabel(t.type),
          t.title,
          t.remark ?? "",
          t.status,
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
  const colCount = 3 + cols.length + 1;

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
        <BdKpi label="Today's Task" value={stats.today} icon={User} active={kpi === "today"} onClick={() => pickKpi("today")} />
        <BdKpi label="Upcoming Task" value={stats.upcoming} icon={User} active={kpi === "upcoming"} onClick={() => pickKpi("upcoming")} />
        <BdKpi label="Pending Task" value={stats.pending} icon={User} active={kpi === "pending"} onClick={() => pickKpi("pending")} />
        <BdKpi label="Completed Task" value={stats.completed} icon={User} active={kpi === "completed"} onClick={() => pickKpi("completed")} />
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
          <BdField label="Activity type">
            <BdSelect placeholder="Select Activity Types" value={draft.activityType} onChange={(v) => set("activityType", v)} options={ACTIVITY_TYPES} />
          </BdField>
          <BdField label="Date Range">
            <DateRangeFilter value={draft.date} onChange={(v) => set("date", v)} />
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
          <BdField label="Status">
            <BdSelect placeholder="Select Status" value={draft.status} onChange={(v) => set("status", v)} options={STATUS_OPTIONS} />
          </BdField>
          <BdField label="Assigned By">
            <BdSelect placeholder="Select Sales Agent" value={draft.assignedBy} onChange={(v) => set("assignedBy", v)} options={agentOptions} />
          </BdField>
          <BdField label="Entity Type">
            <BdSelect placeholder="Select Entity Type" value={draft.entityType} onChange={(v) => set("entityType", v)} options={ENTITY_TYPES} />
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
            <BdButton onClick={() => setAction({ mode: "complete", tasks: selectedRows })}>Mark as Completed</BdButton>
            <BdButton onClick={() => setAction({ mode: "reassign", tasks: selectedRows })}>Reassign</BdButton>
            <BdButton variant="danger" onClick={() => setAction({ mode: "delete", tasks: selectedRows })}>
              Delete
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
        <BdTable minWidth={1500}>
          <thead>
            <tr>
              <BdTh className="w-10">
                <BdCheck
                  checked={allOnPage}
                  label="Select all"
                  onChange={(v) => setSelected(v ? new Set(rows.map((r) => r._id)) : new Set())}
                />
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
              {show("assignedBy") ? <BdTh>Assigned By</BdTh> : null}
              {show("assignedTo") ? <BdTh>Assigned To</BdTh> : null}
              {show("preSales") ? <BdTh>Pre Sales Agent</BdTh> : null}
              {show("schedule") ? (
                <BdTh>
                  <button type="button" onClick={() => toggleSort("schedule")} className="uppercase">
                    Schedule Date <SortIcon k="schedule" />
                  </button>
                </BdTh>
              ) : null}
              {show("title") ? <BdTh>Title</BdTh> : null}
              {show("remark") ? <BdTh>Remark</BdTh> : null}
              {show("status") ? <BdTh>Status</BdTh> : null}
              <BdTh className="text-center">Action</BdTh>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <BdEmptyRow colSpan={colCount} loading={loading} />
            ) : (
              rows.map((t, i) => (
                <tr key={t._id} className={cn(selected.has(t._id) && "bg-[#f1f4fc]")}>
                  <BdTd>
                    <BdCheck
                      checked={selected.has(t._id)}
                      onChange={(v) =>
                        setSelected((s) => {
                          const n = new Set(s);
                          if (v) n.add(t._id);
                          else n.delete(t._id);
                          return n;
                        })
                      }
                    />
                  </BdTd>
                  <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>
                  {show("created") ? <BdTd className="whitespace-nowrap">{formatBdDate(t.createdAt)}</BdTd> : null}
                  {show("lead") ? (
                    <BdTd>
                      <LeadLink lead={t.leadId} />
                    </BdTd>
                  ) : null}
                  {show("mobile") ? <BdTd className="whitespace-nowrap">{mobileOf(t.leadId)}</BdTd> : null}
                  {show("category") ? (
                    <BdTd>
                      <CategoryBadge lead={t.leadId} />
                    </BdTd>
                  ) : null}
                  {show("assignedBy") ? <BdTd>{t.assignedBy?.name ?? "-"}</BdTd> : null}
                  {show("assignedTo") ? <BdTd className="font-semibold">{t.assignedTo?.name ?? "-"}</BdTd> : null}
                  {show("preSales") ? <BdTd>{t.leadId?.assignedTo?.name ?? ""}</BdTd> : null}
                  {show("schedule") ? <BdTd className="whitespace-nowrap">{formatBdDate(t.scheduleAt)}</BdTd> : null}
                  {show("title") ? (
                    <BdTd className="max-w-[260px]">
                      <span className="line-clamp-2" title={t.title}>
                        {t.title}
                      </span>
                    </BdTd>
                  ) : null}
                  {show("remark") ? (
                    <BdTd className="max-w-[240px]">
                      <span className="line-clamp-2" title={t.remark}>
                        {t.remark ?? ""}
                      </span>
                    </BdTd>
                  ) : null}
                  {show("status") ? <BdTd>{statusBadge(t)}</BdTd> : null}
                  <BdTd className="text-center">
                    <BdRowActions
                      items={[
                        { label: "Mark As Completed", hidden: t.status === "completed", onSelect: () => setAction({ mode: "complete", tasks: [t] }) },
                        { label: "Reschedule", onSelect: () => setAction({ mode: "reschedule", tasks: [t] }) },
                        { label: "Reassign", onSelect: () => setAction({ mode: "reassign", tasks: [t] }) },
                        { label: "Add Remark", onSelect: () => setAction({ mode: "remark", tasks: [t] }) },
                        { label: "View Lead", hidden: !t.leadId, onSelect: () => router.push(leadHref(t.leadId?._id)) },
                        { label: "Delete", danger: true, onSelect: () => setAction({ mode: "delete", tasks: [t] }) },
                      ]}
                    />
                  </BdTd>
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 text-[12.5px] text-[#8b90a0]">
          <span>
            {total === 0 ? "No entries" : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, total)} of ${total} entries`}
          </span>
        </div>
      </section>

      <AddTaskModal
        open={addOpen}
        onClose={() => {
          setAddOpen(false);
          onAddClosed();
        }}
        onCreated={load}
      />
      <TaskAnalysisModal open={analysisOpen} onClose={() => setAnalysisOpen(false)} params={baseParams().toString()} />
      <TaskActionModal
        mode={action?.mode ?? null}
        tasks={action?.tasks ?? []}
        onClose={() => setAction(null)}
        onDone={load}
      />
    </div>
  );
}
