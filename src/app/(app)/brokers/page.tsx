"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  BdPage,
  BdCard,
  BdStatCard,
  BdSelect,
  BdButton,
  BdField,
  BdInput,
  BdTable,
  BdTh,
  BdTd,
  BdEmptyRow,
  BdTableToolbar,
} from "@/components/bd";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import {
  BdKebab,
  BdFilterButton,
  BdSortToggle,
  BdColumnPicker,
  BdSidePanel,
  BdRowActions,
  BdCheck,
  BdModal,
  BdConfirm,
} from "@/components/bd/BdOverlays";
import { BrokerDetailSheet } from "@/components/brokers/BrokerDetailSheet";
import { CpFormDialog, CP_STAGES, type CpEditable } from "@/components/brokers/CpFormDialog";
import { CP_CATEGORIES } from "@/components/brokers/CompanyDialog";
import { toCsv, downloadCsv } from "@/lib/bd-csv";

interface Row extends CpEditable {
  cpId?: number;
  createdAt?: string;
  assignedAt?: string;
  company?: { _id: string; companyId: number; name: string; category?: string; reraNumber?: string } | null;
  sourcingManager?: { _id: string; name: string } | null;
  counts?: { leads: number; projects: number; sv: number; bookings: number };
}

interface SavedFilter {
  _id: string;
  name: string;
  filters: Filters;
}

interface Filters {
  team?: string;
  sourcingManager?: string;
  stage?: string;
  category?: string;
  rera?: string;
  dateFrom?: string;
  dateTo?: string;
  companyId?: string;
}

type CardKey = "" | "leads" | "untouched" | "nofollowup" | "overdue";

const ALL_COLUMNS = [
  { key: "sr", label: "SR. NO." },
  { key: "cpId", label: "CP ID" },
  { key: "date", label: "DATE" },
  { key: "assigned", label: "ASSIGNED DATE" },
  { key: "contact", label: "CONTACT PERSON" },
  { key: "mobile", label: "MOBILE" },
  { key: "email", label: "EMAIL" },
  { key: "stage", label: "STAGE" },
  { key: "manager", label: "SOURCING MANAGER" },
  { key: "company", label: "COMPANY" },
  { key: "category", label: "COMPANY CATEGORY" },
  { key: "rera", label: "RERA NUMBERS" },
  { key: "action", label: "ACTION" },
];

function fmtDate(d?: string) {
  if (!d) return "";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleString("en-US", { month: "short", day: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
}

function fmtMobile(p?: string) {
  if (!p) return "-";
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `+91-${d}`;
  if (d.length === 12 && d.startsWith("91")) return `+91-${d.slice(2)}`;
  return p.startsWith("+") ? p : `+${p}`;
}

function BrokersInner() {
  const sp = useSearchParams();
  const router = useRouter();
  const { users, teams } = useDirectory();

  const [draft, setDraft] = useState({ team: "", manager: "" });
  const [filters, setFilters] = useState<Filters>({ companyId: sp.get("companyId") ?? "" });
  const [panelFilters, setPanelFilters] = useState<Filters>({});
  const [card, setCard] = useState<CardKey>("");
  const [q, setQ] = useState("");
  const [qDebounced, setQDebounced] = useState("");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [cols, setCols] = useState<string[]>(ALL_COLUMNS.map((c) => c.key));

  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [cards, setCards] = useState({ leads: 0, untouched: 0, nofollowup: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState("");

  const [selected, setSelected] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(sp.get("new") === "1");
  const [editing, setEditing] = useState<Row | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [saved, setSaved] = useState<SavedFilter[]>([]);
  const [savedId, setSavedId] = useState("");
  const [saveName, setSaveName] = useState("");
  const [saveOpen, setSaveOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [bulkManager, setBulkManager] = useState("");
  const [bulkStage, setBulkStage] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQDebounced(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const queryString = useCallback(
    (extra?: Record<string, string>) => {
      const u = new URLSearchParams();
      if (filters.team) u.set("team", filters.team);
      if (filters.sourcingManager) u.set("sourcingManager", filters.sourcingManager);
      for (const k of ["stage", "category", "rera", "dateFrom", "dateTo", "companyId"] as const) {
        if (filters[k]) u.set(k, filters[k] as string);
      }
      if (card) u.set("card", card);
      if (qDebounced) u.set("q", qDebounced);
      u.set("sort", dir);
      for (const [k, v] of Object.entries(extra ?? {})) u.set(k, v);
      return u;
    },
    [filters, card, qDebounced, dir],
  );

  const load = useCallback(() => {
    setLoading(true);
    const u = queryString({ limit: String(pageSize), skip: String((page - 1) * pageSize) });
    fetch(`/api/brokers?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.brokers ?? []);
        setTotal(d.total ?? 0);
        if (d.cards) setCards(d.cards);
      })
      .catch(() => toast.error("Could not load channel partners"))
      .finally(() => setLoading(false));
  }, [queryString, page, pageSize]);

  useEffect(load, [load]);
  useEffect(() => setPage(1), [filters, card, qDebounced, dir, pageSize]);
  useEffect(() => setSelected([]), [rows]);

  useEffect(() => {
    fetch("/api/brokers/filters", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSaved(d.filters ?? []))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!filters.companyId) {
      setCompanyName("");
      return;
    }
    fetch(`/api/cp-companies/${filters.companyId}`)
      .then((r) => r.json())
      .then((d) => setCompanyName(d.company?.name ?? ""))
      .catch(() => undefined);
  }, [filters.companyId]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const managers = useMemo(
    () =>
      users
        .filter((u) => u.status !== "suspended")
        .filter((u) => !draft.team || String(u.teamId ?? "") === draft.team),
    [users, draft.team],
  );
  const show = (k: string) => cols.includes(k);
  const visibleCols = ALL_COLUMNS.filter((c) => show(c.key));
  const activeFilterCount =
    ["stage", "category", "rera", "dateFrom", "dateTo", "companyId"].filter((k) => filters[k as keyof Filters]).length;

  const applyTop = () => {
    setFilters((f) => ({ ...f, team: draft.team, sourcingManager: draft.manager }));
    setSavedId("");
  };

  const applyPanel = () => {
    setFilters((f) => ({ ...f, ...panelFilters }));
    setSavedId("");
    setFilterOpen(false);
  };

  const clearPanel = () => {
    setPanelFilters({});
    setFilters((f) => ({ team: f.team, sourcingManager: f.sourcingManager }));
    setSavedId("");
    if (sp.get("companyId")) router.replace("/brokers");
  };

  const applySaved = (id: string) => {
    setSavedId(id);
    const s = saved.find((x) => x._id === id);
    if (!s) return;
    setDraft({ team: s.filters.team ?? "", manager: s.filters.sourcingManager ?? "" });
    setFilters(s.filters);
    setPanelFilters(s.filters);
  };

  const saveFilter = async () => {
    if (!saveName.trim()) return toast.error("Enter a name for the filter");
    const res = await fetch("/api/brokers/filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: saveName, filters: { ...filters, ...panelFilters } }),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(d.error ?? "Could not save filter");
    setSaved((p) => [...p, d.filter]);
    setSavedId(d.filter._id);
    setSaveOpen(false);
    setSaveName("");
    toast.success("Filter saved");
  };

  const removeSaved = async () => {
    if (!savedId) return;
    const res = await fetch(`/api/brokers/filters/${savedId}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not delete filter");
    setSaved((p) => p.filter((s) => s._id !== savedId));
    setSavedId("");
    toast.success("Filter deleted");
  };

  const exportCsv = async () => {
    const t = toast.loading("Preparing export…");
    try {
      const u = queryString({ export: "1" });
      const d = await fetch(`/api/brokers?${u}`, { cache: "no-store" }).then((r) => r.json());
      const list: Row[] = d.brokers ?? [];
      const csv = toCsv(
        ["CP ID", "Date", "Assigned Date", "Contact Person", "Mobile", "Email", "Stage", "Sourcing Manager", "Company ID", "Company", "Company Category", "RERA Numbers", "Leads", "Projects", "SV", "Bookings"],
        list.map((b) => [
          b.cpId ?? "",
          fmtDate(b.createdAt),
          fmtDate(b.assignedAt),
          b.name,
          b.phone,
          b.email ?? "",
          b.stage ?? "",
          b.sourcingManager?.name ?? "",
          b.company?.companyId ?? "",
          b.company?.name ?? "",
          b.company?.category ?? "",
          b.rera?.number ?? b.company?.reraNumber ?? "",
          b.counts?.leads ?? 0,
          b.counts?.projects ?? 0,
          b.counts?.sv ?? 0,
          b.counts?.bookings ?? 0,
        ]),
      );
      downloadCsv("channel-partners.csv", csv);
      toast.success(`Exported ${list.length} channel partners`, { id: t });
    } catch {
      toast.error("Export failed", { id: t });
    }
  };

  const bulk = async (body: Record<string, unknown>, okMsg: string) => {
    setBusy(true);
    try {
      const res = await fetch("/api/brokers/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, ...body }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(d.error ?? "Action failed");
      toast.success(d.skipped ? `${okMsg} (${d.skipped} skipped: have bookings)` : okMsg);
      setBulkManager("");
      setBulkStage("");
      setDeleteIds(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const deleteOne = async (id: string) => {
    setBusy(true);
    try {
      const res = await fetch(`/api/brokers/${id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(d.error ?? "Could not delete");
      toast.success("Channel partner deleted");
      setDeleteIds(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  const allChecked = rows.length > 0 && selected.length === rows.length;
  const toggleCard = (k: CardKey) => setCard((c) => (c === k ? "" : k));
  const fieldSel = "bd-input";

  return (
    <BdPage>
      <BdCard
        title="Channel Partners"
        actions={
          <>
            <BdSelect
              className="w-[260px] sm:w-[425px]"
              placeholder="Select Team"
              value={draft.team}
              onChange={(team) => setDraft({ team, manager: "" })}
              options={teams.map((t) => ({ value: t._id, label: t.name }))}
            />
            <BdSelect
              className="w-[260px] sm:w-[425px]"
              placeholder="Select Sourcing Manager"
              value={draft.manager}
              onChange={(manager) => setDraft((d) => ({ ...d, manager }))}
              options={managers.map((u) => ({ value: u._id, label: u.name }))}
            />
            <BdButton onClick={applyTop}>Apply</BdButton>
          </>
        }
        bodyClassName="hidden"
      >
        {null}
      </BdCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BdStatCard title="Leads" value={cards.leads} caption="Lead claimed but not contacted" active={card === "leads"} onClick={() => toggleCard("leads")} />
        <BdStatCard title="Untouched Channel Partner" value={cards.untouched} caption="Channel Partner claimed but not contacted" active={card === "untouched"} onClick={() => toggleCard("untouched")} />
        <BdStatCard title="No Followups Channel Partner" value={cards.nofollowup} caption="Contacted but no future followups" active={card === "nofollowup"} onClick={() => toggleCard("nofollowup")} />
        <BdStatCard title="Overdue Task Channel Partner" value={cards.overdue} caption="Channel Partner with overdue followups" active={card === "overdue"} onClick={() => toggleCard("overdue")} />
      </div>

      <BdCard
        title={
          <span>
            Channel Partner ({total})
            {companyName ? <span className="ml-3 text-[13px] text-[#8b90a0]">Company: {companyName}</span> : null}
          </span>
        }
        actions={
          <>
            <div className="flex items-center gap-1">
              <BdSelect
                className="w-[200px]"
                placeholder="Select Advance Filter"
                value={savedId}
                clearable={false}
                onChange={applySaved}
                options={saved.map((s) => ({ value: s._id, label: s.name }))}
              />
              {savedId ? (
                <button type="button" onClick={removeSaved} className="px-1 text-[12px] text-[#e5484d] hover:underline">
                  Delete
                </button>
              ) : null}
            </div>
            <BdKebab
              items={[
                { label: "Export CSV", onSelect: exportCsv },
                { label: "Refresh", onSelect: load },
                { label: "Add Channel Partner", onSelect: () => { setEditing(null); setFormOpen(true); } },
              ]}
            />
            <BdFilterButton
              active={activeFilterCount > 0 || !!card}
              onClick={() => {
                setPanelFilters(filters);
                setFilterOpen(true);
              }}
            />
          </>
        }
      >
        {selected.length > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-[3px] bg-[#eef1fa] px-3 py-2 text-[13px]">
            <span className="font-medium">{selected.length} selected</span>
            <BdSelect
              className="w-[220px]"
              placeholder="Assign Sourcing Manager"
              value={bulkManager}
              onChange={setBulkManager}
              options={users.filter((u) => u.status !== "suspended").map((u) => ({ value: u._id, label: u.name }))}
            />
            <BdButton disabled={!bulkManager || busy} onClick={() => bulk({ action: "assign", sourcingManagerId: bulkManager }, "Sourcing manager assigned")}>
              Assign
            </BdButton>
            <BdSelect className="w-[160px]" placeholder="Change Stage" value={bulkStage} onChange={setBulkStage} options={CP_STAGES.map((s) => ({ value: s, label: s }))} />
            <BdButton disabled={!bulkStage || busy} onClick={() => bulk({ action: "stage", stage: bulkStage }, "Stage updated")}>
              Update
            </BdButton>
            <BdButton variant="danger" disabled={busy} onClick={() => setDeleteIds(selected)}>
              Delete
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
          onPageSize={setPageSize}
          right={
            <>
              <BdColumnPicker columns={ALL_COLUMNS} value={cols} onChange={setCols} />
              <BdSortToggle dir={dir} onToggle={() => setDir((d) => (d === "asc" ? "desc" : "asc"))} />
            </>
          }
        />

        <BdTable minWidth={1500}>
          <thead>
            <tr>
              <BdTh className="w-8">
                <BdCheck checked={allChecked} onChange={(v) => setSelected(v ? rows.map((r) => r._id) : [])} label="Select all" />
              </BdTh>
              {visibleCols.map((c) => (
                <BdTh key={c.key}>{c.label}</BdTh>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <BdEmptyRow colSpan={visibleCols.length + 1} loading={loading} />
            ) : (
              rows.map((b, i) => (
                <tr key={b._id}>
                  <BdTd>
                    <BdCheck
                      checked={selected.includes(b._id)}
                      onChange={(v) => setSelected((s) => (v ? [...s, b._id] : s.filter((x) => x !== b._id)))}
                    />
                  </BdTd>
                  {show("sr") && <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>}
                  {show("cpId") && <BdTd>{b.cpId ?? "-"}</BdTd>}
                  {show("date") && <BdTd className="whitespace-nowrap">{fmtDate(b.createdAt) || "-"}</BdTd>}
                  {show("assigned") && <BdTd className="whitespace-nowrap">{fmtDate(b.assignedAt)}</BdTd>}
                  {show("contact") && (
                    <BdTd>
                      <button type="button" onClick={() => setActiveId(b._id)} className="text-left text-[#2d5bd6] underline">
                        {b.name}
                      </button>
                      <p className="mt-1 whitespace-nowrap text-[12px] font-bold">
                        Leads: {b.counts?.leads ?? 0}| Project: {b.counts?.projects ?? 0}| SV: {b.counts?.sv ?? 0}| Booking: {b.counts?.bookings ?? 0}
                      </p>
                    </BdTd>
                  )}
                  {show("mobile") && <BdTd className="whitespace-nowrap">{fmtMobile(b.phone)}</BdTd>}
                  {show("email") && <BdTd>{b.email || "-"}</BdTd>}
                  {show("stage") && <BdTd>{b.stage || "Open"}</BdTd>}
                  {show("manager") && <BdTd className="whitespace-nowrap">{b.sourcingManager?.name ?? "-"}</BdTd>}
                  {show("company") && (
                    <BdTd className="min-w-[180px]">{b.company ? `${b.company.name} (${b.company.companyId})` : "-"}</BdTd>
                  )}
                  {show("category") && <BdTd>{b.company?.category || "-"}</BdTd>}
                  {show("rera") && <BdTd>{b.rera?.number || b.company?.reraNumber || "-"}</BdTd>}
                  {show("action") && (
                    <BdTd>
                      <BdRowActions
                        items={[
                          { label: "View", onSelect: () => setActiveId(b._id) },
                          { label: "Edit", onSelect: () => { setEditing(b); setFormOpen(true); } },
                          { label: "Delete", danger: true, onSelect: () => setDeleteIds([b._id]) },
                        ]}
                      />
                    </BdTd>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
      </BdCard>

      <BdSidePanel
        open={filterOpen}
        title="Filters"
        onClose={() => setFilterOpen(false)}
        footer={
          <>
            <BdButton variant="light" onClick={() => setSaveOpen(true)}>
              Save Filter
            </BdButton>
            <BdButton variant="light" onClick={clearPanel}>
              Clear
            </BdButton>
            <BdButton onClick={applyPanel}>Apply</BdButton>
          </>
        }
      >
        <BdField label="Stage">
          <BdSelect placeholder="Select Stage" value={panelFilters.stage ?? ""} onChange={(v) => setPanelFilters((p) => ({ ...p, stage: v }))} options={CP_STAGES.map((s) => ({ value: s, label: s }))} />
        </BdField>
        <BdField label="Company Category">
          <BdSelect placeholder="Select Category" value={panelFilters.category ?? ""} onChange={(v) => setPanelFilters((p) => ({ ...p, category: v }))} options={CP_CATEGORIES.map((s) => ({ value: s, label: s }))} />
        </BdField>
        <BdField label="RERA">
          <BdSelect
            placeholder="Select"
            value={panelFilters.rera ?? ""}
            onChange={(v) => setPanelFilters((p) => ({ ...p, rera: v }))}
            options={[
              { value: "yes", label: "Has RERA number" },
              { value: "no", label: "No RERA number" },
            ]}
          />
        </BdField>
        <BdField label="Created From">
          <input type="date" className={fieldSel} value={panelFilters.dateFrom ?? ""} onChange={(e) => setPanelFilters((p) => ({ ...p, dateFrom: e.target.value }))} />
        </BdField>
        <BdField label="Created To">
          <input type="date" className={fieldSel} value={panelFilters.dateTo ?? ""} onChange={(e) => setPanelFilters((p) => ({ ...p, dateTo: e.target.value }))} />
        </BdField>
      </BdSidePanel>

      <BdModal
        open={saveOpen}
        title="Save Filter"
        onClose={() => setSaveOpen(false)}
        width={420}
        footer={
          <>
            <BdButton variant="light" onClick={() => setSaveOpen(false)}>
              Cancel
            </BdButton>
            <BdButton onClick={saveFilter}>Save</BdButton>
          </>
        }
      >
        <BdField label="Filter Name">
          <BdInput value={saveName} onChange={(e) => setSaveName(e.target.value)} placeholder="Filter name" autoFocus />
        </BdField>
      </BdModal>

      <BdConfirm
        open={!!deleteIds}
        message={`Delete ${deleteIds?.length ?? 0} channel partner${(deleteIds?.length ?? 0) === 1 ? "" : "s"}? This cannot be undone.`}
        busy={busy}
        onClose={() => setDeleteIds(null)}
        onConfirm={() => (deleteIds?.length === 1 ? deleteOne(deleteIds[0]) : bulk({ action: "delete" }, "Deleted"))}
      />

      <CpFormDialog
        open={formOpen}
        broker={editing}
        defaultCompanyId={filters.companyId || undefined}
        onClose={() => {
          setFormOpen(false);
          setEditing(null);
        }}
        onSaved={load}
      />
      <BrokerDetailSheet
        brokerId={activeId}
        brokerIds={rows.map((b) => b._id)}
        onBrokerChange={setActiveId}
        onOpenChange={(v) => !v && setActiveId(null)}
        onChanged={load}
      />
    </BdPage>
  );
}

export default function BrokersPage() {
  return (
    <Suspense fallback={null}>
      <BrokersInner />
    </Suspense>
  );
}
