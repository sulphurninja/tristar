"use client";

import { useCallback, useEffect, useState } from "react";
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
import { useProjects } from "@/components/crm/ContactModals";
import { AddPropertyDialog } from "@/components/properties/AddPropertyDialog";
import { PropertyDetailSheet } from "@/components/properties/PropertyDetailSheet";
import { formatCurrency } from "@/lib/utils";

interface PropertyRow {
  _id: string;
  propertyNumber?: string;
  title?: string;
  inventoryType?: string;
  location?: string;
  city?: string;
  configuration?: string;
  area?: number;
  price?: number;
  availableFor?: string;
  status?: string;
  ownerName?: string;
  ownerMobile?: string;
  projectId?: { _id?: string; name?: string; code?: string } | null;
}

const INVENTORY_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "residential_apartment", label: "Apartment" },
  { value: "residential_villa", label: "Villa" },
  { value: "residential_plot", label: "Plot" },
  { value: "residential_independent_house", label: "Independent House" },
  { value: "commercial", label: "Commercial" },
  { value: "commercial_office", label: "Office" },
  { value: "commercial_retail", label: "Retail" },
  { value: "commercial_warehouse", label: "Warehouse" },
];
const AVAILABLE_FOR = [
  { value: "sale", label: "Sale" },
  { value: "rent", label: "Rent" },
  { value: "both", label: "Both" },
];
const STATUSES = [
  { value: "available", label: "Available" },
  { value: "held", label: "Held" },
  { value: "booked", label: "Booked" },
  { value: "sold", label: "Sold" },
  { value: "unavailable", label: "Unavailable" },
];
const STATUS_COLOR: Record<string, string> = {
  available: "#37c47f",
  held: "#e9b72a",
  booked: "#3d7be8",
  sold: "#9a9ca6",
  unavailable: "#ef6a6a",
};
const cap = (s?: string) => (s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "-");

const COLUMNS: ColumnDef[] = [
  { key: "number", label: "Property #" },
  { key: "title", label: "Title" },
  { key: "type", label: "Type" },
  { key: "location", label: "Location" },
  { key: "config", label: "Configuration" },
  { key: "area", label: "Area" },
  { key: "price", label: "Price" },
  { key: "for", label: "Available For" },
  { key: "status", label: "Status" },
  { key: "owner", label: "Owner" },
  { key: "project", label: "Project" },
];

interface Filters {
  projectId: string;
  inventoryType: string;
  availableFor: string;
  status: string;
}
const DEFAULT: Filters = { projectId: "", inventoryType: "", availableFor: "", status: "" };

export default function PropertyPage() {
  const projects = useProjects();
  const [draft, setDraft] = useState<Filters>(DEFAULT);
  const [applied, setApplied] = useState<Filters>(DEFAULT);
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [cols, setCols] = useState<string[]>(COLUMNS.map((c) => c.key).filter((k) => k !== "config" && k !== "area"));
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openAdd, setOpenAdd] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [q, applied, pageSize]);

  const query = useCallback(
    (limit: number, skip: number) => {
      const u = new URLSearchParams({ limit: String(limit), skip: String(skip) });
      if (q) u.set("q", q);
      for (const [k, v] of Object.entries(applied)) if (v) u.set(k, v);
      return u;
    },
    [applied, q],
  );

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/properties?${query(pageSize, (page - 1) * pageSize)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.properties ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [query, page, pageSize]);
  useEffect(load, [load]);

  const remove = async (p: PropertyRow) => {
    if (!window.confirm(`Delete property "${p.title}"?`)) return;
    const res = await fetch(`/api/properties/${p._id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(j.error || "Couldn't delete.");
    else {
      toast.success("Property deleted");
      load();
    }
  };

  const exportCsv = async () => {
    const d = await fetch(`/api/properties?${query(1000, 0)}`, { cache: "no-store" }).then((r) => r.json());
    const list: PropertyRow[] = d.properties ?? [];
    downloadCsv(
      "properties.csv",
      ["Property #", "Title", "Type", "Location", "City", "Configuration", "Area", "Price", "Available For", "Status", "Owner", "Owner Mobile", "Project"],
      list.map((p) => [
        p.propertyNumber,
        p.title,
        cap(p.inventoryType),
        p.location,
        p.city,
        p.configuration,
        p.area,
        p.price,
        cap(p.availableFor),
        cap(p.status),
        p.ownerName,
        p.ownerMobile,
        p.projectId?.name,
      ]),
    );
  };

  const show = (k: string) => cols.includes(k);

  return (
    <BdPage>
      <BdCard bodyClassName="!p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <BdField label="Project">
            <BdSelect
              value={draft.projectId}
              onChange={(projectId) => setDraft((d) => ({ ...d, projectId }))}
              placeholder="Select Project"
              options={projects.map((p) => ({ value: p._id, label: p.name }))}
            />
          </BdField>
          <BdField label="Property Type">
            <BdSelect value={draft.inventoryType} onChange={(inventoryType) => setDraft((d) => ({ ...d, inventoryType }))} placeholder="Select Property Type" options={INVENTORY_TYPES} />
          </BdField>
          <BdField label="Available For">
            <BdSelect value={draft.availableFor} onChange={(availableFor) => setDraft((d) => ({ ...d, availableFor }))} placeholder="Select Available For" options={AVAILABLE_FOR} />
          </BdField>
          <BdField label="Status">
            <BdSelect value={draft.status} onChange={(status) => setDraft((d) => ({ ...d, status }))} placeholder="Select Status" options={STATUSES} />
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
          <BdButton onClick={() => setOpenAdd(true)}>Add Property</BdButton>
        </div>
      </BdCard>

      <BdCard title="Property">
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
        <BdTable minWidth={980}>
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
              rows.map((p, i) => (
                <tr key={p._id}>
                  <BdTd className="text-[#8b90a0]">{(page - 1) * pageSize + i + 1}</BdTd>
                  {show("number") ? <BdTd>{p.propertyNumber ?? "-"}</BdTd> : null}
                  {show("title") ? (
                    <BdTd className="max-w-[240px]">
                      <button type="button" onClick={() => setActiveId(p._id)} className="truncate text-left font-medium text-[#3a5dc2] hover:underline">
                        {p.title ?? "-"}
                      </button>
                    </BdTd>
                  ) : null}
                  {show("type") ? <BdTd>{cap(p.inventoryType)}</BdTd> : null}
                  {show("location") ? <BdTd className="max-w-[200px] truncate">{[p.location, p.city].filter(Boolean).join(", ") || "-"}</BdTd> : null}
                  {show("config") ? <BdTd>{p.configuration ?? "-"}</BdTd> : null}
                  {show("area") ? <BdTd>{p.area ?? "-"}</BdTd> : null}
                  {show("price") ? <BdTd className="whitespace-nowrap">{p.price ? formatCurrency(p.price) : "-"}</BdTd> : null}
                  {show("for") ? <BdTd>{cap(p.availableFor)}</BdTd> : null}
                  {show("status") ? (
                    <BdTd>
                      <BdBadge color={STATUS_COLOR[p.status ?? ""] ?? "#9a9ca6"}>{(p.status ?? "-").toUpperCase()}</BdBadge>
                    </BdTd>
                  ) : null}
                  {show("owner") ? (
                    <BdTd>
                      {p.ownerName ?? "-"}
                      {p.ownerMobile ? <div className="text-[11.5px] text-[#8b90a0]">{p.ownerMobile}</div> : null}
                    </BdTd>
                  ) : null}
                  {show("project") ? <BdTd>{p.projectId?.name ?? "-"}</BdTd> : null}
                  <BdTd>
                    <RowMenu
                      items={[
                        { label: "Open", onClick: () => setActiveId(p._id) },
                        { label: "Delete", danger: true, onClick: () => remove(p) },
                      ]}
                    />
                  </BdTd>
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
      </BdCard>

      <AddPropertyDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={load} />
      <PropertyDetailSheet
        propertyId={activeId}
        propertyIds={rows.map((p) => p._id)}
        onPropertyChange={setActiveId}
        onOpenChange={(v) => !v && setActiveId(null)}
        onChanged={load}
      />
    </BdPage>
  );
}
