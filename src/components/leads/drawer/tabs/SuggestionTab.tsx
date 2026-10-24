"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Save, Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput, BdSelect } from "@/components/bd";
import { MultiSelect, api } from "@/components/leads/ui/primitives";
import { BUDGET_STEPS, formatBudget } from "@/components/leads/types";
import type { TabCtx } from "../types";

const REQ_TYPES = ["Buy", "Rent", "Lease", "Resale"];
const PROPERTY_TYPES = ["Residential", "Commercial", "Industrial", "Agricultural"];
const SUB_TYPES: Record<string, string[]> = {
  Residential: ["Apartment", "Villa", "Independent House", "Row House", "Penthouse", "Studio", "Plot"],
  Commercial: ["Office", "Shop", "Showroom", "Warehouse"],
  Industrial: ["Industrial", "Warehouse"],
  Agricultural: ["Farmland", "Plot"],
};
const UNIT_TYPES = ["1RK", "1BHK", "1.5BHK", "2BHK", "2.5BHK", "3BHK", "4BHK", "5BHK"];
const CRITERIA = [
  { value: "location", label: "Location" },
  { value: "budget", label: "Budget" },
  { value: "unit", label: "Unit" },
  { value: "subType", label: "Sub Type" },
];

interface Suggestions {
  projects: Array<{
    _id: string;
    name: string;
    code?: string;
    location?: { city?: string; locality?: string };
    priceRange?: { min?: number; max?: number };
    configurations?: string[];
    saleStage?: string;
  }>;
  properties: Array<{ _id: string; title: string; location?: string; city?: string; configuration?: string; price?: number; status?: string }>;
  locations: string[];
  subLocations: string[];
}

const toOpts = (a: string[]) => a.map((x) => ({ value: x, label: x }));

export function SuggestionTab({ ctx }: { ctx: TabCtx }) {
  const { lead, patch } = ctx;
  const r = lead.requirement ?? {};
  const [form, setForm] = useState({
    budgetMin: r.budgetMin != null ? String(r.budgetMin) : "",
    budgetMax: r.budgetMax != null ? String(r.budgetMax) : "",
    areaMin: r.areaMin != null ? String(r.areaMin) : "",
    areaMax: r.areaMax != null ? String(r.areaMax) : "",
    requirementType: r.requirementType ?? "",
    propertyType: r.propertyType ?? "",
    subType: r.subType ?? "",
    unitTypes: r.unitTypes ?? [],
    searchLocation: r.searchLocation ?? "",
    streetAddress: r.streetAddress ?? "",
    location: r.location ?? "",
    subLocation: r.subLocation ?? "",
  });
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof typeof form>(k: K) => (v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const budgetOpts = useMemo(() => {
    const vals = new Set<number>(BUDGET_STEPS);
    for (const v of [form.budgetMin, form.budgetMax]) if (v && Number.isFinite(Number(v))) vals.add(Number(v));
    return Array.from(vals)
      .sort((a, b) => a - b)
      .map((n) => ({ value: String(n), label: formatBudget(n) }));
  }, [form.budgetMin, form.budgetMax]);

  const save = async () => {
    const lo = form.budgetMin ? Number(form.budgetMin) : null;
    const hi = form.budgetMax ? Number(form.budgetMax) : null;
    if (lo != null && hi != null && lo > hi) return toast.error("Minimum budget cannot exceed maximum budget.");
    const alo = form.areaMin ? Number(form.areaMin) : null;
    const ahi = form.areaMax ? Number(form.areaMax) : null;
    if (alo != null && ahi != null && alo > ahi) return toast.error("Minimum area cannot exceed maximum area.");
    setSaving(true);
    await patch(
      {
        requirement: {
          budgetMin: lo,
          budgetMax: hi,
          areaMin: alo,
          areaMax: ahi,
          requirementType: form.requirementType,
          propertyType: form.propertyType,
          subType: form.subType,
          unitTypes: form.unitTypes,
          searchLocation: form.searchLocation,
          streetAddress: form.streetAddress,
          location: form.location,
          subLocation: form.subLocation,
        },
      },
      "Requirements saved",
    );
    setSaving(false);
  };

  /* ---- suggested projects & properties ---- */
  const [use, setUse] = useState<string[]>(CRITERIA.map((c) => c.value));
  const [sLoc, setSLoc] = useState(r.location ?? "");
  const [sSub, setSSub] = useState(r.subLocation ?? "");
  const [res, setRes] = useState<Suggestions | null>(null);
  const [vocab, setVocab] = useState<{ locations: string[]; subLocations: string[] }>({ locations: [], subLocations: [] });
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const query = useCallback(
    (loc: string, sub: string, criteria: string[]) => {
      const u = new URLSearchParams();
      u.set("use", criteria.join(",") || "none");
      if (loc) u.set("location", loc);
      if (sub) u.set("subLocation", sub);
      if (form.budgetMin) u.set("budgetMin", form.budgetMin);
      if (form.budgetMax) u.set("budgetMax", form.budgetMax);
      if (form.unitTypes.length) u.set("unit", form.unitTypes.join(","));
      if (form.subType) u.set("subType", form.subType);
      return api<Suggestions>(`/api/leads/${lead._id}/suggestions?${u}`);
    },
    [lead._id, form.budgetMin, form.budgetMax, form.unitTypes, form.subType],
  );

  /* vocabulary for the Location / Sub Location selects */
  useEffect(() => {
    query(sLoc, "", ["none"])
      .then((d) => setVocab({ locations: d.locations, subLocations: d.subLocations }))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lead._id, sLoc]);

  const search = async () => {
    setSearching(true);
    try {
      const d = await query(sLoc, sSub, use);
      setRes(d);
      setSearched(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Search failed");
    } finally {
      setSearching(false);
    }
  };

  const interestedP = new Set((lead.interestedProjects ?? []).map((p) => p._id));
  const interestedH = new Set((lead.interestedProperties ?? []).map((p) => p._id));

  return (
    <div className="space-y-4">
      <section className="rounded-[3px] border border-[#e6e9f2] bg-white">
        <header className="flex items-start justify-between border-b border-[#eef0f6] px-5 py-3.5">
          <div>
            <h3 className="text-[16px] font-semibold text-[#2b2f3a]">Requirements</h3>
            <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[#6b7186]">Budget, inventory and location preferences</p>
          </div>
          <BdButton onClick={save} disabled={saving}>
            <Save className="size-3.5" /> {saving ? "Saving…" : "Save"}
          </BdButton>
        </header>
        <div className="grid gap-x-4 gap-y-4 p-5 md:grid-cols-4">
          <BdField label="BUDGET RANGE" className="md:col-span-2">
            <div className="grid grid-cols-2 gap-3">
              <BdSelect value={form.budgetMin} onChange={set("budgetMin")} placeholder="" options={budgetOpts} />
              <BdSelect value={form.budgetMax} onChange={set("budgetMax")} placeholder="" options={budgetOpts} />
            </div>
          </BdField>
          <BdField label="AREA RANGE" className="md:col-span-2">
            <div className="grid grid-cols-2 gap-3">
              <BdInput type="number" min={0} placeholder="0" value={form.areaMin} onChange={(e) => set("areaMin")(e.target.value)} />
              <BdInput type="number" min={0} placeholder="0" value={form.areaMax} onChange={(e) => set("areaMax")(e.target.value)} />
            </div>
          </BdField>
          <BdField label="REQUIREMENT TYPE">
            <BdSelect value={form.requirementType} onChange={set("requirementType")} placeholder="Select Requirement" options={toOpts(REQ_TYPES)} />
          </BdField>
          <BdField label="PROPERTY TYPE">
            <BdSelect
              value={form.propertyType}
              onChange={(v) => setForm((f) => ({ ...f, propertyType: v, subType: v === f.propertyType ? f.subType : "" }))}
              placeholder="Select Property Type"
              options={toOpts(PROPERTY_TYPES)}
            />
          </BdField>
          <BdField label="SUB TYPE">
            <BdSelect
              value={form.subType}
              onChange={set("subType")}
              placeholder="Select Sub Type"
              options={toOpts(SUB_TYPES[form.propertyType] ?? Array.from(new Set(Object.values(SUB_TYPES).flat())))}
            />
          </BdField>
          <BdField label="UNIT TYPE">
            <MultiSelect value={form.unitTypes} onChange={set("unitTypes")} placeholder="Select Unit Type" options={toOpts(UNIT_TYPES)} />
          </BdField>
          <BdField label="SEARCH LOCATION" className="md:col-span-4">
            <BdInput placeholder="Enter your address" value={form.searchLocation} onChange={(e) => set("searchLocation")(e.target.value)} />
          </BdField>
          <BdField label="STREET ADDRESS" className="md:col-span-4">
            <textarea
              rows={2}
              placeholder="Address"
              value={form.streetAddress}
              onChange={(e) => set("streetAddress")(e.target.value)}
              className="bd-input !h-auto resize-y py-2"
            />
          </BdField>
          <BdField label="LOCATION" className="md:col-span-2">
            <BdInput value={form.location} onChange={(e) => set("location")(e.target.value)} />
          </BdField>
          <BdField label="SUB LOCATION" className="md:col-span-2">
            <BdInput placeholder="SubLocation" value={form.subLocation} onChange={(e) => set("subLocation")(e.target.value)} />
          </BdField>
          <p className="text-[14px] font-semibold md:col-span-4">Location : {form.location || "-"}</p>
        </div>
      </section>

      <section className="rounded-[3px] border border-[#e6e9f2] bg-white">
        <header className="border-b border-[#eef0f6] px-5 py-3.5">
          <h3 className="text-[16px] font-semibold text-[#2b2f3a]">Suggested Projects &amp; Properties</h3>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[#6b7186]">Filter results by project, location and sub location</p>
        </header>
        <div className="space-y-4 p-5">
          <MultiSelect value={use} onChange={setUse} placeholder="Match on…" options={CRITERIA} />
          <div className="grid items-end gap-4 md:grid-cols-[1fr_1.4fr_auto]">
            <BdField label="LOCATION">
              <BdSelect
                value={sLoc}
                onChange={(v) => {
                  setSLoc(v);
                  setSSub("");
                }}
                placeholder="Select Location"
                options={toOpts(Array.from(new Set([...vocab.locations, ...(sLoc ? [sLoc] : [])])))}
              />
            </BdField>
            <BdField label="SUB LOCATION">
              <BdSelect value={sSub} onChange={setSSub} placeholder="Select Sub Location" options={toOpts(vocab.subLocations)} />
            </BdField>
            <BdButton onClick={search} disabled={searching} className="h-[38px] px-5">
              <SearchIcon className="size-3.5" /> {searching ? "Searching…" : "Search"}
            </BdButton>
          </div>

          {searched && res ? (
            <div className="space-y-4">
              <ResultTable
                title={`Projects (${res.projects.length})`}
                empty="No projects match these filters."
                rows={res.projects.map((p) => ({
                  id: p._id,
                  name: p.name,
                  sub: [p.code, p.location?.locality, p.location?.city].filter(Boolean).join(" · "),
                  meta: [
                    p.priceRange?.min || p.priceRange?.max
                      ? `${p.priceRange?.min ? formatBudget(p.priceRange.min) : "-"} - ${p.priceRange?.max ? formatBudget(p.priceRange.max) : "-"}`
                      : "",
                    (p.configurations ?? []).join(", "),
                  ]
                    .filter(Boolean)
                    .join(" · "),
                  added: interestedP.has(p._id),
                }))}
                onAdd={(id) => patch({ addInterestedProject: id }, "Project added to interests")}
              />
              <ResultTable
                title={`Properties (${res.properties.length})`}
                empty="No properties match these filters."
                rows={res.properties.map((p) => ({
                  id: p._id,
                  name: p.title,
                  sub: [p.location, p.city].filter(Boolean).join(", "),
                  meta: [p.configuration, p.price ? formatBudget(p.price) : ""].filter(Boolean).join(" · "),
                  added: interestedH.has(p._id),
                }))}
                onAdd={(id) => patch({ addInterestedProperty: id }, "Property added to interests")}
              />
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

function ResultTable({
  title,
  rows,
  empty,
  onAdd,
}: {
  title: string;
  rows: Array<{ id: string; name: string; sub: string; meta: string; added: boolean }>;
  empty: string;
  onAdd: (id: string) => void;
}) {
  return (
    <div>
      <h4 className="mb-1.5 text-[12.5px] font-bold uppercase tracking-wide text-[#4a4f5f]">{title}</h4>
      {rows.length === 0 ? (
        <p className="rounded-[3px] bg-[#f6f8fd] px-4 py-5 text-center text-[13px] text-[#8b90a0]">{empty}</p>
      ) : (
        <div className="divide-y divide-[#eef0f6] rounded-[3px] border border-[#e6e9f2]">
          {rows.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium text-[#2b2f3a]">{r.name}</p>
                <p className="truncate text-[12.5px] text-[#6b7186]">{[r.sub, r.meta].filter(Boolean).join("  |  ") || "-"}</p>
              </div>
              <BdButton variant={r.added ? "light" : "primary"} disabled={r.added} onClick={() => onAdd(r.id)}>
                {r.added ? "Added" : "Add Interest"}
              </BdButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
