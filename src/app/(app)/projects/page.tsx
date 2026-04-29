"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Building2,
  MapPin,
  IndianRupee,
  Filter,
  Layers,
  Home,
} from "lucide-react";
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
import { formatCurrency } from "@/lib/utils";

interface Project {
  _id: string;
  name: string;
  code: string;
  builderName?: string;
  propertyType: string;
  configurations?: string[];
  saleStage: string;
  possessionDate?: string;
  rera?: { number?: string };
  location?: { city?: string; locality?: string; state?: string };
  priceRange?: { min?: number; max?: number; perSqFt?: number; currency?: string };
  totalUnits?: number;
  availableUnits?: number;
  amenities?: string[];
  description?: string;
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
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(searchParams.get("new") === "1");
  const [q, setQ] = useState("");
  const [propertyType, setPropertyType] = useState("all");
  const [saleStage, setSaleStage] = useState("all");

  const params = useMemo(() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (propertyType !== "all") u.set("propertyType", propertyType);
    if (saleStage !== "all") u.set("saleStage", saleStage);
    return u.toString();
  }, [q, propertyType, saleStage]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/projects?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.projects ?? []))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Toolbar */}
      <div className="sticky top-[72px] z-20 flex flex-col gap-3 border-b border-slate-200/70 bg-white px-7 py-4 lg:flex-row lg:items-center lg:px-10">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by project, builder, city, locality…"
              className="h-10 rounded-lg pl-10"
            />
          </div>
          <Select value={propertyType} onValueChange={setPropertyType}>
            <SelectTrigger className="h-10 w-44">
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
            <SelectTrigger className="h-10 w-44">
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
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-10 gap-1.5 rounded-lg"
            onClick={() => {
              setQ("");
              setPropertyType("all");
              setSaleStage("all");
            }}
          >
            <Filter className="size-4" strokeWidth={1.75} />
            Reset
          </Button>
          <Button onClick={() => setOpenNew(true)} className="h-10 gap-1.5 rounded-lg">
            <Plus className="size-4" strokeWidth={2} />
            Add project
          </Button>
        </div>
      </div>

      {/* Body */}
      {loading ? (
        <div className="grid grid-cols-1 gap-px bg-slate-200/70 px-px sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-64 animate-pulse bg-white" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-7 py-12 lg:px-10">
          <EmptyState
            icon={<Building2 className="size-5 text-emerald-600" strokeWidth={1.75} />}
            title={q || propertyType !== "all" || saleStage !== "all" ? "No projects match" : "No projects yet"}
            description={
              q || propertyType !== "all" || saleStage !== "all"
                ? "Adjust your filters or search differently."
                : "Add your first project so your team has something to sell."
            }
            action={
              <Button onClick={() => setOpenNew(true)} className="gap-1.5">
                <Plus className="size-4" strokeWidth={2} />
                Add your first project
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-px bg-slate-200/60 px-px sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => {
            const stageMeta = SALE_STAGE_LABEL[p.saleStage] ?? SALE_STAGE_LABEL.under_construction;
            const priceLabel =
              p.priceRange?.min || p.priceRange?.max
                ? `${formatCurrency(p.priceRange?.min ?? 0)} — ${formatCurrency(
                    p.priceRange?.max ?? 0,
                  )}`
                : "Pricing TBD";
            const cityLine = [p.location?.locality, p.location?.city]
              .filter(Boolean)
              .join(", ");
            const availability =
              p.totalUnits && p.availableUnits != null
                ? Math.max(
                    0,
                    Math.round(((p.totalUnits - p.availableUnits) / p.totalUnits) * 100),
                  )
                : null;

            return (
              <article
                key={p._id}
                className="group flex flex-col bg-white p-6 transition-colors hover:bg-slate-50/40"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-[16px] font-bold tracking-tight text-slate-900">
                        {p.name}
                      </h3>
                      <span className="font-mono text-[10.5px] text-slate-400">{p.code}</span>
                    </div>
                    {p.builderName ? (
                      <p className="mt-0.5 text-[12.5px] text-slate-500">{p.builderName}</p>
                    ) : null}
                  </div>
                  <StatusPill tone={stageMeta.tone} dot>
                    {stageMeta.label}
                  </StatusPill>
                </div>

                {cityLine ? (
                  <p className="mt-3 inline-flex items-center gap-1.5 text-[12.5px] text-slate-600">
                    <MapPin className="size-3.5 text-slate-400" strokeWidth={1.75} />
                    {cityLine}
                  </p>
                ) : null}

                <div className="mt-4 flex flex-wrap gap-1.5">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                    {PROPERTY_TYPE_LABEL[p.propertyType] ?? p.propertyType}
                  </span>
                  {(p.configurations ?? []).slice(0, 4).map((c) => (
                    <span key={c} className="rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                      {c}
                    </span>
                  ))}
                </div>

                <div className="mt-4 flex items-center gap-1.5 text-[14px] font-semibold text-slate-900">
                  <IndianRupee className="size-4 text-emerald-600" strokeWidth={2} />
                  <span>{priceLabel}</span>
                </div>
                {p.priceRange?.perSqFt ? (
                  <p className="mt-0.5 text-[11.5px] text-slate-500">
                    ₹{p.priceRange.perSqFt.toLocaleString("en-IN")}/sqft
                  </p>
                ) : null}

                {availability !== null ? (
                  <div className="mt-5">
                    <div className="flex items-center justify-between text-[11.5px] text-slate-500">
                      <span>Inventory</span>
                      <span className="font-semibold text-slate-700">
                        {p.availableUnits} / {p.totalUnits} available
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all"
                        style={{ width: `${availability}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10.5px] uppercase tracking-wider text-slate-400">
                      {availability}% sold
                    </p>
                  </div>
                ) : null}

                <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-3 text-[11.5px] text-slate-500">
                    {p.rera?.number ? (
                      <span className="inline-flex items-center gap-1">
                        <Layers className="size-3" strokeWidth={1.75} />
                        RERA: {p.rera.number}
                      </span>
                    ) : (
                      <span className="text-slate-400">No RERA on file</span>
                    )}
                  </div>
                  <button className="inline-flex items-center gap-1 text-[12px] font-semibold text-emerald-700 hover:text-emerald-800">
                    Manage units
                    <Home className="size-3.5" strokeWidth={1.75} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <NewProjectSheet open={openNew} onOpenChange={setOpenNew} onCreated={load} />
    </div>
  );
}
