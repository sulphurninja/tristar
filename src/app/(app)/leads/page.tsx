"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDownUp, ChevronDown, Filter, MoreVertical, Search, X } from "lucide-react";
import { toast } from "sonner";
import { BdButton, BdCard, BdField, BdInput, BdPage, BdPagination, BdSelect } from "@/components/bd";
import type { TeamAgentValue } from "@/components/bd/TeamAgentSelects";
import { LeadsOverview, type Overview } from "@/components/leads/list/LeadsOverview";
import { COLUMNS, LeadsTable } from "@/components/leads/list/LeadsTable";
import { ColumnPicker } from "@/components/leads/list/ColumnPicker";
import { FilterPanel, countFilters, FILTER_KEYS, type Filters } from "@/components/leads/list/FilterPanel";
import { SavedFilterPicker, type SavedFilter } from "@/components/leads/list/SavedFilterPicker";
import { LeadDrawer } from "@/components/leads/drawer/LeadDrawer";
import { NewLeadSheet } from "@/components/leads/NewLeadSheet";
import { EditLeadDialog } from "@/components/leads/dialogs/EditLeadDialog";
import { SiteVisitDialog, TaskDialog } from "@/components/leads/dialogs/ActionDialogs";
import { ConfirmDialog, UserPickDialog } from "@/components/leads/dialogs/simple";
import { DropMenu, Modal, ModalActions, api, type MenuItem } from "@/components/leads/ui/primitives";
import { useLeadOptions, type LeadRow } from "@/components/leads/types";

const COLS_KEY = "tristar.leads.columns.v1";
const defaultCols = () => COLUMNS.filter((c) => c.defaultOn).map((c) => c.key);

type RowDialog =
  | { kind: "edit" | "task" | "visit" | "transfer" | "delete"; lead: LeadRow }
  | null;
type BulkDialog = "transfer" | "stage" | "addTag" | "delete" | null;

function LeadsPageInner() {
  const router = useRouter();
  const { can } = useAuth();
  const sp = useSearchParams();
  const opts = useLeadOptions();

  /*
   * Deep links (dashboard cards, reports, other pages) can preset the list:
   * ?view=&card=&team=&agent=&q=&open=<id>&new=1 plus any advanced filter key
   * (stage, returning, unassigned, createdFrom, createdTo, …).
   */
  const initial = useRef(
    (() => {
      const preset: Filters = {};
      for (const k of FILTER_KEYS) {
        const v = sp.get(k);
        if (v) preset[k] = v;
      }
      const q = sp.get("q") ?? "";
      const card = sp.get("card") ?? "";
      const deepLinked = !!q || !!card || Object.keys(preset).length > 0;
      return {
        q,
        card,
        preset,
        view: sp.get("view") ?? (deepLinked ? "all" : "active"),
        scope: { team: sp.get("team") ?? "", agent: sp.get("agent") ?? "" },
        open: sp.get("open") ?? sp.get("leadId") ?? "",
        isNew: sp.get("new") === "1",
      };
    })(),
  ).current;

  const [view, setView] = useState(initial.view);
  const [scope, setScope] = useState<TeamAgentValue>(initial.scope);
  const [card, setCard] = useState(initial.card);
  const [q, setQ] = useState(initial.q);
  const [qApplied, setQApplied] = useState(initial.q);
  const [filters, setFilters] = useState<Filters>(initial.preset);
  const [savedId, setSavedId] = useState("");
  const [savedReload, setSavedReload] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sort, setSort] = useState("createdAt");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [visible, setVisible] = useState<string[]>(defaultCols());

  const [rows, setRows] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [ovLoading, setOvLoading] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [filterOpen, setFilterOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(initial.open || null);
  const [newOpen, setNewOpen] = useState(false);
  useEffect(() => {
    if (initial.isNew) router.replace("/leads/new");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [rowDlg, setRowDlg] = useState<RowDialog>(null);
  const [bulkDlg, setBulkDlg] = useState<BulkDialog>(null);
  const [saveName, setSaveName] = useState<Filters | null>(null);


  /* Persisted column choice (per browser). */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(COLS_KEY);
      if (raw) {
        const arr = (JSON.parse(raw) as string[]).filter((k) => COLUMNS.some((c) => c.key === k));
        if (arr.length) setVisible(arr.includes("name") ? arr : [...arr, "name"]);
      }
    } catch {
      /* ignore */
    }
  }, []);
  const changeCols = (v: string[]) => {
    setVisible(v);
    try {
      localStorage.setItem(COLS_KEY, JSON.stringify(v));
    } catch {
      /* ignore */
    }
  };

  /* Debounce search box. */
  useEffect(() => {
    const t = setTimeout(() => {
      setQApplied(q.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const scopeQs = useMemo(() => {
    const u = new URLSearchParams();
    u.set("view", view);
    if (scope.team) u.set("team", scope.team);
    if (scope.agent) u.set("agent", scope.agent);
    return u;
  }, [view, scope]);

  const listQs = useMemo(() => {
    const u = new URLSearchParams(scopeQs);
    if (card) u.set("card", card);
    if (qApplied) u.set("q", qApplied);
    for (const k of FILTER_KEYS) if (filters[k]) u.set(k, filters[k]);
    return u;
  }, [scopeQs, card, qApplied, filters]);

  const loadList = useCallback(() => {
    const u = new URLSearchParams(listQs);
    u.set("sort", sort);
    u.set("dir", dir);
    u.set("limit", String(pageSize));
    u.set("skip", String((page - 1) * pageSize));
    setLoading(true);
    const ctl = new AbortController();
    fetch(`/api/leads?${u}`, { cache: "no-store", signal: ctl.signal })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) throw new Error(d.error);
        setRows(d.leads ?? []);
        setTotal(d.total ?? 0);
      })
      .catch((e) => {
        if (e?.name !== "AbortError") toast.error(e instanceof Error ? e.message : "Could not load leads");
      })
      .finally(() => setLoading(false));
    return () => ctl.abort();
  }, [listQs, sort, dir, page, pageSize]);

  useEffect(() => loadList(), [loadList]);

  const loadOverview = useCallback(() => {
    setOvLoading(true);
    fetch(`/api/leads/analysis?${scopeQs}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (!d.error) setOverview(d);
      })
      .finally(() => setOvLoading(false));
  }, [scopeQs]);
  useEffect(loadOverview, [loadOverview]);

  const refreshAll = useCallback(() => {
    loadList();
    loadOverview();
  }, [loadList, loadOverview]);

  /* Any filter change goes back to page 1 and clears the selection. */
  const resetPaging = () => {
    setPage(1);
    setSelected(new Set());
  };
  const applyFilters = (f: Filters) => {
    const clean: Filters = {};
    for (const k of FILTER_KEYS) if (f[k]) clean[k] = f[k];
    setFilters(clean);
    setSavedId("");
    resetPaging();
  };
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const activeFilters = countFilters(filters) + (card ? 1 : 0);

  const onSort = (field: string) => {
    if (sort === field) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(field);
      setDir(field === "name" ? "asc" : "desc");
    }
    setPage(1);
  };

  /* Only offer actions the user's permissions allow; the API enforces the same rules. */
  const rowActions = (l: LeadRow): MenuItem[] =>
    [
      { key: "view", label: "View", onSelect: () => setOpenId(l._id) },
      can("leads.edit") && { key: "edit", label: "Edit", onSelect: () => setRowDlg({ kind: "edit", lead: l }) },
      can("tasks.manage") && { key: "task", label: "Add task", onSelect: () => setRowDlg({ kind: "task", lead: l }) },
      can("visits.manage") && {
        key: "visit",
        label: "Schedule site visit",
        onSelect: () => setRowDlg({ kind: "visit", lead: l }),
      },
      can("leads.edit") && { key: "transfer", label: "Transfer", onSelect: () => setRowDlg({ kind: "transfer", lead: l }) },
      can("leads.delete") && {
        key: "delete",
        label: "Delete",
        danger: true,
        onSelect: () => setRowDlg({ kind: "delete", lead: l }),
      },
    ].filter(Boolean) as MenuItem[];

  const exportCsv = () => {
    const u = new URLSearchParams(listQs);
    u.set("sort", sort);
    u.set("dir", dir);
    window.location.href = `/api/leads/export?${u}`;
  };

  const runBulk = async (payload: Record<string, unknown>, msg: string) => {
    await api("/api/leads/bulk", { method: "POST", json: { ids: Array.from(selected), ...payload } });
    toast.success(msg);
    setSelected(new Set());
    refreshAll();
  };

  const drawerIds = useMemo(() => rows.map((r) => r._id), [rows]);

  return (
    <BdPage>
      <LeadsOverview
        data={overview}
        loading={ovLoading}
        view={view}
        onView={(v) => {
          setView(v);
          setCard("");
          resetPaging();
        }}
        scope={scope}
        onScope={(s) => {
          setScope(s);
          resetPaging();
        }}
        card={card}
        onCard={(k) => {
          setCard(k);
          resetPaging();
        }}
        stageFilter={filters.stage ?? ""}
        onStage={(key) => applyFilters({ ...filters, stage: filters.stage === key ? "" : key })}
      />

      <BdCard bodyClassName="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-3 border-b border-border/70 pb-4">
          {activeFilters > 0 ? (
            <button
              type="button"
              onClick={() => {
                setFilters({});
                setCard("");
                setSavedId("");
                resetPaging();
              }}
              className="mr-auto inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-[12.5px] text-primary hover:bg-primary-100"
            >
              <X className="size-3" /> Clear {activeFilters} active filter{activeFilters > 1 ? "s" : ""}
            </button>
          ) : null}
          <SavedFilterPicker
            activeId={savedId}
            reloadKey={savedReload}
            onPick={(f: SavedFilter | null) => {
              if (!f) {
                setSavedId("");
                setFilters({});
              } else {
                setSavedId(f._id);
                const clean: Filters = {};
                for (const k of FILTER_KEYS) if (f.params?.[k]) clean[k] = f.params[k];
                setFilters(clean);
              }
              resetPaging();
            }}
          />
          <DropMenu
            trigger={
              <button type="button" className="bd-btn-light inline-flex items-center gap-1.5">
                Add <ChevronDown className="size-3.5" />
              </button>
            }
            items={
              [
                can("leads.create") && { key: "add", label: "Add lead", onSelect: () => router.push("/leads/new") },
                can("leads.bulk") && { key: "import", label: "Import leads", onSelect: () => router.push("/leads/bulk-update") },
                { key: "pipeline", label: "Pipeline view", onSelect: () => router.push("/leads/pipeline") },
              ].filter(Boolean) as MenuItem[]
            }
          />
          <DropMenu
            trigger={
              <button type="button" aria-label="More" className="bd-btn-light inline-flex !px-2.5">
                <MoreVertical className="size-4" />
              </button>
            }
            items={
              [
                can("leads.export") && { key: "export", label: "Export CSV", onSelect: exportCsv },
                { key: "refresh", label: "Refresh", onSelect: refreshAll },
                can("leads.bulk") && { key: "bulk", label: "Bulk update from file", onSelect: () => router.push("/leads/bulk-update") },
              ].filter(Boolean) as MenuItem[]
            }
          />
          <button
            type="button"
            aria-label="Filter"
            onClick={() => setFilterOpen(true)}
            className="bd-btn-light relative !w-[34px] !px-0"
          >
            <Filter className="size-4" />
            {activeFilters > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-[#2b2f3a] text-[10px]">
                {activeFilters}
              </span>
            ) : null}
          </button>
        </div>

        {selected.size > 0 ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg bg-primary-50 px-4 py-2.5 text-[13.5px]">
            <b>{selected.size}</b> selected
            <span className="mx-1 text-muted-foreground/50">|</span>
            {can("leads.bulk") ? (
              <>
                <BdButton onClick={() => setBulkDlg("transfer")}>Transfer</BdButton>
                <BdButton variant="light" onClick={() => setBulkDlg("stage")}>Change stage</BdButton>
                <BdButton variant="light" onClick={() => setBulkDlg("addTag")}>Add tag</BdButton>
              </>
            ) : null}
            {can("leads.delete") ? (
              <BdButton variant="danger" onClick={() => setBulkDlg("delete")}>Delete</BdButton>
            ) : null}
            <button type="button" className="ml-auto text-primary hover:underline" onClick={() => setSelected(new Set())}>
              Clear selection
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 pb-3">
          <BdPagination page={page} totalPages={totalPages} onPage={(p) => { setPage(p); setSelected(new Set()); }} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[12.5px] text-muted-foreground">{total.toLocaleString("en-IN")} leads</span>
            <ColumnPicker value={visible} onChange={changeCols} />
            <button
              type="button"
              aria-label={dir === "asc" ? "Sorted ascending - click for descending" : "Sorted descending - click for ascending"}
              title={dir === "asc" ? "Ascending" : "Descending"}
              onClick={() => setDir((d) => (d === "asc" ? "desc" : "asc"))}
              className="bd-btn-light inline-flex size-[38px] items-center justify-center !p-0"
            >
              <ArrowDownUp className="size-4" />
            </button>
            <div className="flex">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setQApplied(q.trim());
                    setPage(1);
                  }
                }}
                placeholder="Search"
                className="bd-input !w-[260px] rounded-r-none"
              />
              <button
                type="button"
                aria-label="Search"
                onClick={() => {
                  setQApplied(q.trim());
                  setPage(1);
                }}
                className="flex w-10 items-center justify-center bg-primary/60 text-white hover:bg-[#6f89cf]"
              >
                <Search className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setQ("");
                  setQApplied("");
                  setPage(1);
                }}
                className="ml-1.5 flex w-9 items-center justify-center rounded-lg bg-muted text-foreground/70 hover:bg-border"
              >
                <X className="size-3.5" />
              </button>
            </div>
            <BdSelect
              className="w-[90px]"
              clearable={false}
              placeholder="20"
              value={String(pageSize)}
              onChange={(v) => {
                setPageSize(Number(v) || 20);
                setPage(1);
              }}
              options={[10, 20, 50, 100].map((n) => ({ value: String(n), label: String(n) }))}
            />
          </div>
        </div>

        <LeadsTable
          rows={rows}
          loading={loading}
          opts={opts}
          visible={visible}
          page={page}
          pageSize={pageSize}
          sort={sort}
          dir={dir}
          onSort={onSort}
          selected={selected}
          onSelect={(id, on) =>
            setSelected((s) => {
              const n = new Set(s);
              if (on) n.add(id);
              else n.delete(id);
              return n;
            })
          }
          onSelectAll={(on) => setSelected(on ? new Set(rows.map((r) => r._id)) : new Set())}
          onOpen={setOpenId}
          actions={rowActions}
        />

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-[12.5px] text-muted-foreground">
          <span>
            {total === 0
              ? "No entries"
              : `Showing ${(page - 1) * pageSize + 1} to ${Math.min(page * pageSize, total)} of ${total.toLocaleString("en-IN")} entries`}
          </span>
          <BdPagination page={page} totalPages={totalPages} onPage={(p) => { setPage(p); setSelected(new Set()); }} />
        </div>
      </BdCard>

      <FilterPanel
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        value={filters}
        onApply={applyFilters}
        onSave={(f) => setSaveName(f)}
      />

      <SaveFilterDialog
        filters={saveName}
        onClose={() => setSaveName(null)}
        onSaved={() => {
          setSavedReload((n) => n + 1);
          setFilterOpen(false);
        }}
      />

      <LeadDrawer
        leadId={openId}
        ids={drawerIds}
        onNavigate={setOpenId}
        onClose={() => {
          setOpenId(null);
          if (sp.get("open") || sp.get("leadId")) router.replace("/leads");
        }}
        onChanged={refreshAll}
        onDeleted={() => {
          setOpenId(null);
          refreshAll();
        }}
      />

      <NewLeadSheet
        open={newOpen}
        onOpenChange={(v) => {
          setNewOpen(v);
          if (!v && sp.get("new")) router.replace("/leads");
        }}
        onCreated={refreshAll}
      />

      {/* row action dialogs */}
      <EditLeadDialog
        open={rowDlg?.kind === "edit"}
        lead={rowDlg?.lead ?? null}
        onClose={() => setRowDlg(null)}
        onSaved={refreshAll}
      />
      <TaskDialog
        open={rowDlg?.kind === "task"}
        leadId={rowDlg?.lead._id ?? ""}
        leadName={rowDlg?.lead.contact.name}
        onClose={() => setRowDlg(null)}
        onDone={refreshAll}
      />
      <SiteVisitDialog
        open={rowDlg?.kind === "visit"}
        leadId={rowDlg?.lead._id ?? ""}
        leadName={rowDlg?.lead.contact.name}
        defaultProjectId={rowDlg?.lead.primaryProjectId?._id}
        onClose={() => setRowDlg(null)}
        onDone={refreshAll}
      />
      <UserPickDialog
        open={rowDlg?.kind === "transfer"}
        onClose={() => setRowDlg(null)}
        title={`Transfer Lead${rowDlg ? ` - ${rowDlg.lead.contact.name}` : ""}`}
        confirmLabel="Transfer"
        onConfirm={async (uid) => {
          await api(`/api/leads/${rowDlg!.lead._id}`, { method: "PATCH", json: { assignedTo: uid } });
          toast.success("Lead transferred");
          refreshAll();
        }}
      />
      <ConfirmDialog
        open={rowDlg?.kind === "delete"}
        onClose={() => setRowDlg(null)}
        title="Delete Lead"
        danger
        confirmLabel="Delete"
        message={`Delete ${rowDlg?.lead.contact.name ?? "this lead"} permanently? Its timeline and open tasks are removed too. This cannot be undone.`}
        onConfirm={async () => {
          await api(`/api/leads/${rowDlg!.lead._id}`, { method: "DELETE" });
          toast.success("Lead deleted");
          refreshAll();
        }}
      />

      {/* bulk dialogs */}
      <UserPickDialog
        open={bulkDlg === "transfer"}
        onClose={() => setBulkDlg(null)}
        title={`Transfer ${selected.size} lead${selected.size > 1 ? "s" : ""}`}
        confirmLabel="Transfer"
        onConfirm={(uid) => runBulk({ action: "transfer", assignedTo: uid }, "Leads transferred")}
      />
      <BulkStageDialog
        open={bulkDlg === "stage"}
        onClose={() => setBulkDlg(null)}
        count={selected.size}
        onConfirm={(stage) => runBulk({ action: "stage", stage }, "Lead stage updated")}
      />
      <BulkTagDialog
        open={bulkDlg === "addTag"}
        onClose={() => setBulkDlg(null)}
        count={selected.size}
        onConfirm={(tag) => runBulk({ action: "addTag", tag }, "Tag added")}
      />
      <ConfirmDialog
        open={bulkDlg === "delete"}
        onClose={() => setBulkDlg(null)}
        title="Delete Leads"
        danger
        confirmLabel="Delete"
        message={`Delete ${selected.size} selected lead${selected.size > 1 ? "s" : ""} permanently? This cannot be undone.`}
        onConfirm={() => runBulk({ action: "delete" }, "Leads deleted")}
      />
    </BdPage>
  );
}

function SaveFilterDialog({
  filters,
  onClose,
  onSaved,
}: {
  filters: Filters | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (filters) setName("");
  }, [filters]);
  return (
    <Modal
      open={!!filters}
      onClose={onClose}
      title="Save Filter"
      width={420}
      footer={
        <ModalActions
          onCancel={onClose}
          busy={busy}
          disabled={!name.trim()}
          onSubmit={async () => {
            setBusy(true);
            try {
              await api("/api/leads/saved-filters", { method: "POST", json: { name, params: filters } });
              toast.success("Filter saved");
              onSaved();
              onClose();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Could not save filter");
            } finally {
              setBusy(false);
            }
          }}
        />
      }
    >
      <BdField label="Filter Name">
        <BdInput autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hot leads - Pune" />
      </BdField>
    </Modal>
  );
}

function BulkStageDialog({
  open,
  onClose,
  count,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  count: number;
  onConfirm: (stage: string) => Promise<void>;
}) {
  const opts = useLeadOptions();
  const [stage, setStage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setStage("");
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Change Lead Stage (${count})`}
      width={420}
      footer={
        <ModalActions
          onCancel={onClose}
          busy={busy}
          disabled={!stage}
          onSubmit={async () => {
            setBusy(true);
            try {
              await onConfirm(stage);
              onClose();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            } finally {
              setBusy(false);
            }
          }}
        />
      }
    >
      <BdField label="Lead Stage">
        <BdSelect value={stage} onChange={setStage} placeholder="Select Lead Stage" options={opts.stages.map((s) => ({ value: s.key, label: s.label }))} />
      </BdField>
    </Modal>
  );
}

function BulkTagDialog({
  open,
  onClose,
  count,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  count: number;
  onConfirm: (tag: string) => Promise<void>;
}) {
  const [tag, setTag] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setTag("");
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`Add Tag (${count})`}
      width={420}
      footer={
        <ModalActions
          onCancel={onClose}
          busy={busy}
          disabled={!tag.trim()}
          submitLabel="Add"
          onSubmit={async () => {
            setBusy(true);
            try {
              await onConfirm(tag);
              onClose();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Failed");
            } finally {
              setBusy(false);
            }
          }}
        />
      }
    >
      <BdField label="Tag">
        <BdInput autoFocus value={tag} onChange={(e) => setTag(e.target.value)} placeholder="Tag name" />
      </BdField>
    </Modal>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={null}>
      <LeadsPageInner />
    </Suspense>
  );
}
