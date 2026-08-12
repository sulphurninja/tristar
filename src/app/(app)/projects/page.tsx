"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Building2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { NewProjectSheet } from "@/components/projects/NewProjectSheet";
import { PageShell, PageBody } from "@/components/shared/PageShell";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { formatCurrency } from "@/lib/utils";

interface Project {
  _id: string;
  name: string;
  code: string;
  builderName?: string;
  propertyType: string;
  configurations?: string[];
  saleStage: string;
  rera?: { number?: string };
  location?: { city?: string; locality?: string };
  priceRange?: { min?: number; max?: number; perSqFt?: number };
  totalUnits?: number;
  availableUnits?: number;
  createdAt?: string;
  createdBy?: { name?: string };
}

const SALE_STAGE_LABEL: Record<
  string,
  { label: string; tone: "neutral" | "info" | "warning" | "primary" | "success" | "danger" }
> = {
  pre_launch: { label: "Pre-launch", tone: "info" },
  launching_soon: { label: "Launching soon", tone: "info" },
  under_construction: { label: "Under construction", tone: "warning" },
  ready_to_move: { label: "Ready to move", tone: "success" },
  resale: { label: "Resale", tone: "neutral" },
  sold_out: { label: "Sold out", tone: "danger" },
};

const PROPERTY_TYPE_LABEL: Record<string, string> = {
  residential_apartment: "Apartment",
  residential_villa: "Villa",
  residential_plot: "Plot",
  residential_independent_house: "Independent house",
  commercial_office: "Office",
  commercial_retail: "Retail",
  commercial_warehouse: "Warehouse",
  industrial: "Industrial",
  mixed_use: "Mixed use",
  farmland: "Farmland",
  other: "Other",
};

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Project[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(searchParams.get("new") === "1");
  const [q, setQ] = useState("");
  const [propertyType, setPropertyType] = useState("all");
  const [saleStage, setSaleStage] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const params = useMemo(() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (propertyType !== "all") u.set("propertyType", propertyType);
    if (saleStage !== "all") u.set("saleStage", saleStage);
    u.set("limit", String(pageSize));
    u.set("skip", String((page - 1) * pageSize));
    return u.toString();
  }, [q, propertyType, saleStage, page, pageSize]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/projects?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.projects ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, propertyType, saleStage, pageSize]);

  return (
    <PageShell>
      <PageBody>
        <FilterBar
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  setQ("");
                  setPropertyType("all");
                  setSaleStage("all");
                }}
              >
                Reset
              </Button>
              <Button size="sm" className="h-9 gap-1.5" onClick={() => setOpenNew(true)}>
                <Plus className="size-3.5" />
                Add project
              </Button>
            </>
          }
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search projects…"
            className="h-9 w-56"
          />
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {Object.entries(PROPERTY_TYPE_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={saleStage} onValueChange={setSaleStage}>
            <SelectTrigger className="h-9 w-44">
              <SelectValue placeholder="Sale stage" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All stages</SelectItem>
              {Object.entries(SALE_STAGE_LABEL).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>

        <DataTableShell
          title="Projects"
          count={total}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        >
          {loading ? (
            <div className="space-y-2 p-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-12 animate-pulse rounded-md bg-slate-100" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Building2 className="size-5 text-emerald-600" />}
                title="No projects"
                description="Add your first project so the team has inventory to sell."
                action={
                  <Button onClick={() => setOpenNew(true)} className="gap-1.5">
                    <Plus className="size-4" />
                    Add project
                  </Button>
                }
              />
            </div>
          ) : (
            <TableRoot>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Project</Th>
                  <Th>Address</Th>
                  <Th>Type</Th>
                  <Th>Unit type</Th>
                  <Th>Stage</Th>
                  <Th>Price</Th>
                  <Th>Inventory</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((p, i) => {
                  const stageMeta =
                    SALE_STAGE_LABEL[p.saleStage] ?? SALE_STAGE_LABEL.under_construction;
                  const cityLine = [p.location?.locality, p.location?.city]
                    .filter(Boolean)
                    .join(", ");
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80">
                      <Td className="text-slate-400">{(page - 1) * pageSize + i + 1}</Td>
                      <Td>
                        <p className="font-semibold text-slate-900">{p.name}</p>
                        <p className="font-mono text-[11px] text-slate-400">{p.code}</p>
                        {p.builderName ? (
                          <p className="text-[11px] text-slate-500">{p.builderName}</p>
                        ) : null}
                      </Td>
                      <Td>
                        {cityLine ? (
                          <span className="inline-flex items-center gap-1 text-slate-600">
                            <MapPin className="size-3.5 text-slate-400" />
                            {cityLine}
                          </span>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td>{PROPERTY_TYPE_LABEL[p.propertyType] ?? p.propertyType}</Td>
                      <Td>
                        <div className="flex flex-wrap gap-1">
                          {(p.configurations ?? []).slice(0, 3).map((c) => (
                            <span
                              key={c}
                              className="rounded border border-slate-200 px-1.5 py-0.5 text-[11px] text-slate-600"
                            >
                              {c}
                            </span>
                          ))}
                          {(p.configurations ?? []).length === 0 ? "—" : null}
                        </div>
                      </Td>
                      <Td>
                        <StatusPill tone={stageMeta.tone} dot>
                          {stageMeta.label}
                        </StatusPill>
                      </Td>
                      <Td className="whitespace-nowrap text-[12.5px]">
                        {p.priceRange?.min || p.priceRange?.max
                          ? `${formatCurrency(p.priceRange?.min ?? 0)} – ${formatCurrency(p.priceRange?.max ?? 0)}`
                          : "—"}
                      </Td>
                      <Td className="tabular-nums text-[12.5px]">
                        {p.totalUnits != null
                          ? `${p.availableUnits ?? 0} / ${p.totalUnits}`
                          : "—"}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableRoot>
          )}
        </DataTableShell>
      </PageBody>
      <NewProjectSheet open={openNew} onOpenChange={setOpenNew} onCreated={load} />
    </PageShell>
  );
}
