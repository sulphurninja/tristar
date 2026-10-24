"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  BdBadge,
  BdButton,
  BdCard,
  BdEmptyRow,
  BdField,
  BdPage,
  BdSelect,
  BdTable,
  BdTableToolbar,
  BdTd,
  BdTh,
} from "@/components/bd";
import { ColumnPicker, type ColumnDef } from "@/components/crm/ColumnPicker";
import { RowMenu } from "@/components/crm/RowMenu";
import { downloadCsv } from "@/components/crm/csv";
import { ProjectModal, PROPERTY_TYPES, SALE_STAGES, type ProjectRecord } from "@/components/projects/ProjectModal";
import { formatCurrency } from "@/lib/utils";

const STAGE_COLOR: Record<string, string> = {
  pre_launch: "#3ec1d3",
  launching_soon: "#3ec1d3",
  under_construction: "#e9b72a",
  ready_to_move: "#37c47f",
  resale: "#9a9ca6",
  sold_out: "#ef6a6a",
};
const lbl = (opts: Array<{ value: string; label: string }>, v?: string) => opts.find((o) => o.value === v)?.label ?? v ?? "-";

const COLUMNS: ColumnDef[] = [
  { key: "name", label: "Project" },
  { key: "code", label: "Code" },
  { key: "builder", label: "Builder" },
  { key: "address", label: "Address" },
  { key: "type", label: "Type" },
  { key: "unit", label: "Unit Type" },
  { key: "stage", label: "Stage" },
  { key: "price", label: "Price" },
  { key: "units", label: "Total Units" },
  { key: "available", label: "Available Units" },
  { key: "rera", label: "RERA" },
];

function ProjectsInner() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ProjectRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<{ open: boolean; project: ProjectRecord | null }>({
    open: searchParams.get("new") === "1",
    project: null,
  });
  const [draft, setDraft] = useState({ propertyType: "", saleStage: "", archived: "" });
  const [applied, setApplied] = useState(draft);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [cols, setCols] = useState<string[]>(COLUMNS.map((c) => c.key).filter((k) => !["code", "builder", "rera"].includes(k)));

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [q, applied, pageSize]);

  const query = useCallback(
    (limit: number, skip: number) => {
      const u = new URLSearchParams({ limit: String(limit), skip: String(skip) });
      if (q) u.set("q", q);
      if (applied.propertyType) u.set("propertyType", applied.propertyType);
      if (applied.saleStage) u.set("saleStage", applied.saleStage);
      if (applied.archived === "1") u.set("archived", "1");
      return u;
    },
    [q, applied],
  );

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/projects?${query(pageSize, (page - 1) * pageSize)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.projects ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [query, page, pageSize]);
  useEffect(load, [load]);

  const setArchived = async (p: ProjectRecord, archived: boolean) => {
    if (archived && !window.confirm(`Archive project "${p.name}"? It will be hidden from the list and project pickers.`)) return;
    const res = archived
      ? await fetch(`/api/projects/${p._id}`, { method: "DELETE" })
      : await fetch(`/api/projects/${p._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ archived: false }),
        });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(j.error || "Action failed.");
    else {
      toast.success(archived ? "Project archived" : "Project restored");
      load();
    }
  };

  const exportCsv = async () => {
    const d = await fetch(`/api/projects?${query(500, 0)}`, { cache: "no-store" }).then((r) => r.json());
    const list: ProjectRecord[] = d.projects ?? [];
    downloadCsv(
      "projects.csv",
      ["Project", "Code", "Builder", "City", "Locality", "Type", "Configurations", "Stage", "Min Price", "Max Price", "Total Units", "Available Units", "RERA"],
      list.map((p) => [
        p.name,
        p.code,
        p.builderName,
        p.location?.city,
        p.location?.locality,
        lbl(PROPERTY_TYPES, p.propertyType),
        (p.configurations ?? []).join(" / "),
        lbl(SALE_STAGES, p.saleStage),
        p.priceRange?.min,
        p.priceRange?.max,
        p.totalUnits,
        p.availableUnits,
        p.rera?.number,
      ]),
    );
  };

  const show = (k: string) => cols.includes(k);
  const isArchivedView = applied.archived === "1";

  return (
    <BdPage>
      <BdCard bodyClassName="!p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BdField label="Property Type">
            <BdSelect value={draft.propertyType} onChange={(propertyType) => setDraft((d) => ({ ...d, propertyType }))} placeholder="Select Property Type" options={PROPERTY_TYPES} />
          </BdField>
          <BdField label="Sale Stage">
            <BdSelect value={draft.saleStage} onChange={(saleStage) => setDraft((d) => ({ ...d, saleStage }))} placeholder="Select Sale Stage" options={SALE_STAGES} />
          </BdField>
          <BdField label="Status">
            <BdSelect
              value={draft.archived}
              onChange={(archived) => setDraft((d) => ({ ...d, archived }))}
              placeholder="Active"
              options={[{ value: "1", label: "Archived" }]}
            />
          </BdField>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <BdButton onClick={() => setApplied(draft)}>Search</BdButton>
          <BdButton
            variant="light"
            onClick={() => {
              const e = { propertyType: "", saleStage: "", archived: "" };
              setDraft(e);
              setApplied(e);
              setSearch("");
            }}
          >
            Clear
          </BdButton>
          <BdButton variant="light" onClick={exportCsv}>
            Export CSV
          </BdButton>
          <BdButton onClick={() => setModal({ open: true, project: null })}>Add Project</BdButton>
        </div>
      </BdCard>

      <BdCard title={isArchivedView ? "Archived Projects" : "Projects"}>
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
        <BdTable minWidth={960}>
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
            {items.length === 0 ? (
              <BdEmptyRow colSpan={cols.length + 2} loading={loading} />
            ) : (
              items.map((p, i) => {
                const addr = [p.location?.locality, p.location?.city].filter(Boolean).join(", ");
                return (
                  <tr key={p._id}>
                    <BdTd className="text-[#8b90a0]">{(page - 1) * pageSize + i + 1}</BdTd>
                    {show("name") ? (
                      <BdTd>
                        <button type="button" onClick={() => setModal({ open: true, project: p })} className="text-left font-medium text-[#3a5dc2] hover:underline">
                          {p.name}
                        </button>
                      </BdTd>
                    ) : null}
                    {show("code") ? <BdTd>{p.code}</BdTd> : null}
                    {show("builder") ? <BdTd>{p.builderName ?? "-"}</BdTd> : null}
                    {show("address") ? <BdTd>{addr || "-"}</BdTd> : null}
                    {show("type") ? <BdTd>{lbl(PROPERTY_TYPES, p.propertyType)}</BdTd> : null}
                    {show("unit") ? <BdTd>{(p.configurations ?? []).join(", ") || "-"}</BdTd> : null}
                    {show("stage") ? (
                      <BdTd>
                        <BdBadge color={STAGE_COLOR[p.saleStage] ?? "#9a9ca6"}>{lbl(SALE_STAGES, p.saleStage).toUpperCase()}</BdBadge>
                      </BdTd>
                    ) : null}
                    {show("price") ? (
                      <BdTd className="whitespace-nowrap">
                        {p.priceRange?.min || p.priceRange?.max
                          ? `${formatCurrency(p.priceRange?.min ?? 0)} – ${formatCurrency(p.priceRange?.max ?? 0)}`
                          : "-"}
                      </BdTd>
                    ) : null}
                    {show("units") ? <BdTd>{p.totalUnits ?? "-"}</BdTd> : null}
                    {show("available") ? <BdTd>{p.availableUnits ?? "-"}</BdTd> : null}
                    {show("rera") ? <BdTd>{p.rera?.number ?? "-"}</BdTd> : null}
                    <BdTd>
                      <RowMenu
                        items={[
                          { label: "Edit", onClick: () => setModal({ open: true, project: p }) },
                          p.archived
                            ? { label: "Restore", onClick: () => setArchived(p, false) }
                            : { label: "Archive", danger: true, onClick: () => setArchived(p, true) },
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

      <ProjectModal open={modal.open} project={modal.project} onClose={() => setModal((m) => ({ ...m, open: false }))} onSaved={load} />
    </BdPage>
  );
}

export default function ProjectsPage() {
  return (
    <Suspense>
      <ProjectsInner />
    </Suspense>
  );
}
