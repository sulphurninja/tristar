"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput, BdSelect } from "@/components/bd";
import { BdModal } from "@/components/crm/BdModal";
import { slugify } from "@/lib/utils";

export const PROPERTY_TYPES = [
  { value: "residential_apartment", label: "Apartment" },
  { value: "residential_villa", label: "Villa" },
  { value: "residential_plot", label: "Plot" },
  { value: "residential_independent_house", label: "Independent House" },
  { value: "commercial_office", label: "Commercial Office" },
  { value: "commercial_retail", label: "Retail" },
  { value: "commercial_warehouse", label: "Warehouse" },
  { value: "industrial", label: "Industrial" },
  { value: "mixed_use", label: "Mixed Use" },
  { value: "farmland", label: "Farmland" },
  { value: "other", label: "Other" },
];

export const SALE_STAGES = [
  { value: "pre_launch", label: "Pre-launch" },
  { value: "launching_soon", label: "Launching Soon" },
  { value: "under_construction", label: "Under Construction" },
  { value: "ready_to_move", label: "Ready To Move" },
  { value: "resale", label: "Resale" },
  { value: "sold_out", label: "Sold Out" },
];

export interface ProjectRecord {
  _id: string;
  name: string;
  code: string;
  builderName?: string;
  propertyType: string;
  configurations?: string[];
  saleStage: string;
  possessionDate?: string;
  rera?: { number?: string };
  location?: { city?: string; locality?: string; state?: string; pincode?: string };
  priceRange?: { min?: number; max?: number; perSqFt?: number };
  totalUnits?: number;
  availableUnits?: number;
  amenities?: string[];
  description?: string;
  archived?: boolean;
}

const blank = {
  name: "",
  code: "",
  builderName: "",
  propertyType: "residential_apartment",
  saleStage: "under_construction",
  configurations: "",
  city: "",
  locality: "",
  state: "",
  pincode: "",
  reraNumber: "",
  minPrice: "",
  maxPrice: "",
  perSqFt: "",
  totalUnits: "",
  availableUnits: "",
  amenities: "",
  description: "",
  possessionDate: "",
};

const list = (s: string) =>
  s
    .split(",")
    .map((c) => c.trim())
    .filter(Boolean);
const n = (s: string) => (s === "" ? null : Number(s));

/** Add Project / Edit Project. Pass `project` to edit. */
export function ProjectModal({
  open,
  onClose,
  onSaved,
  project,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  project?: ProjectRecord | null;
}) {
  const [f, setF] = useState(blank);
  const [saving, setSaving] = useState(false);
  const set = (p: Partial<typeof blank>) => setF((x) => ({ ...x, ...p }));

  useEffect(() => {
    if (!open) return;
    if (!project) return setF(blank);
    setF({
      name: project.name,
      code: project.code,
      builderName: project.builderName ?? "",
      propertyType: project.propertyType,
      saleStage: project.saleStage,
      configurations: (project.configurations ?? []).join(", "),
      city: project.location?.city ?? "",
      locality: project.location?.locality ?? "",
      state: project.location?.state ?? "",
      pincode: project.location?.pincode ?? "",
      reraNumber: project.rera?.number ?? "",
      minPrice: project.priceRange?.min != null ? String(project.priceRange.min) : "",
      maxPrice: project.priceRange?.max != null ? String(project.priceRange.max) : "",
      perSqFt: project.priceRange?.perSqFt != null ? String(project.priceRange.perSqFt) : "",
      totalUnits: project.totalUnits != null ? String(project.totalUnits) : "",
      availableUnits: project.availableUnits != null ? String(project.availableUnits) : "",
      amenities: (project.amenities ?? []).join(", "),
      description: project.description ?? "",
      possessionDate: project.possessionDate ? project.possessionDate.slice(0, 10) : "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const submit = async () => {
    if (!f.name.trim()) return toast.error("Project name is required.");
    setSaving(true);
    try {
      const res = await fetch(project ? `/api/projects/${project._id}` : "/api/projects", {
        method: project ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name,
          code: f.code || slugify(f.name).toUpperCase().slice(0, 12),
          builderName: f.builderName,
          propertyType: f.propertyType,
          saleStage: f.saleStage,
          configurations: list(f.configurations),
          location: { city: f.city, locality: f.locality, state: f.state, pincode: f.pincode, country: "IN" },
          rera: { number: f.reraNumber },
          priceRange: { min: n(f.minPrice), max: n(f.maxPrice), perSqFt: n(f.perSqFt) },
          totalUnits: n(f.totalUnits),
          availableUnits: n(f.availableUnits),
          amenities: list(f.amenities),
          description: f.description,
          possessionDate: f.possessionDate || null,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(j.error || "Couldn't save project.");
      toast.success(project ? "Project updated" : "Project added");
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
      title={project ? "Edit Project" : "Add Project"}
      width={760}
      footer={
        <>
          <BdButton variant="light" onClick={onClose}>
            Cancel
          </BdButton>
          <BdButton onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </BdButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <BdField label="Project Name *">
          <BdInput value={f.name} onChange={(e) => set({ name: e.target.value })} placeholder="Project Name" />
        </BdField>
        <BdField label="Project Code">
          <BdInput value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} placeholder="Leave blank to auto-generate" />
        </BdField>
        <BdField label="Builder Name">
          <BdInput value={f.builderName} onChange={(e) => set({ builderName: e.target.value })} placeholder="Builder Name" />
        </BdField>
        <BdField label="Property Type">
          <BdSelect value={f.propertyType} clearable={false} onChange={(v) => set({ propertyType: v || "residential_apartment" })} options={PROPERTY_TYPES} />
        </BdField>
        <BdField label="Sale Stage">
          <BdSelect value={f.saleStage} clearable={false} onChange={(v) => set({ saleStage: v || "under_construction" })} options={SALE_STAGES} />
        </BdField>
        <BdField label="Possession Date">
          <BdInput type="date" value={f.possessionDate} onChange={(e) => set({ possessionDate: e.target.value })} />
        </BdField>
        <BdField label="Configurations (comma separated)" className="sm:col-span-2">
          <BdInput value={f.configurations} onChange={(e) => set({ configurations: e.target.value })} placeholder="2BHK, 3BHK, 4BHK" />
        </BdField>
        <BdField label="City">
          <BdInput value={f.city} onChange={(e) => set({ city: e.target.value })} placeholder="City" />
        </BdField>
        <BdField label="Locality">
          <BdInput value={f.locality} onChange={(e) => set({ locality: e.target.value })} placeholder="Locality" />
        </BdField>
        <BdField label="State">
          <BdInput value={f.state} onChange={(e) => set({ state: e.target.value })} placeholder="State" />
        </BdField>
        <BdField label="Pincode">
          <BdInput value={f.pincode} onChange={(e) => set({ pincode: e.target.value })} placeholder="Pincode" />
        </BdField>
        <BdField label="Min Price">
          <BdInput type="number" min={0} value={f.minPrice} onChange={(e) => set({ minPrice: e.target.value })} />
        </BdField>
        <BdField label="Max Price">
          <BdInput type="number" min={0} value={f.maxPrice} onChange={(e) => set({ maxPrice: e.target.value })} />
        </BdField>
        <BdField label="Price Per Sq.Ft">
          <BdInput type="number" min={0} value={f.perSqFt} onChange={(e) => set({ perSqFt: e.target.value })} />
        </BdField>
        <BdField label="RERA Number">
          <BdInput value={f.reraNumber} onChange={(e) => set({ reraNumber: e.target.value })} placeholder="RERA Number" />
        </BdField>
        <BdField label="Total Units">
          <BdInput type="number" min={0} value={f.totalUnits} onChange={(e) => set({ totalUnits: e.target.value })} />
        </BdField>
        <BdField label="Available Units">
          <BdInput type="number" min={0} value={f.availableUnits} onChange={(e) => set({ availableUnits: e.target.value })} />
        </BdField>
        <BdField label="Amenities (comma separated)" className="sm:col-span-2">
          <BdInput value={f.amenities} onChange={(e) => set({ amenities: e.target.value })} placeholder="Pool, Gym, Clubhouse" />
        </BdField>
        <BdField label="Description" className="sm:col-span-2">
          <textarea value={f.description} onChange={(e) => set({ description: e.target.value })} rows={3} className="bd-input !h-auto py-2" placeholder="Description" />
        </BdField>
      </div>
    </BdModal>
  );
}
