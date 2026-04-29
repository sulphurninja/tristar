"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { slugify } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

const PROPERTY_TYPES = [
  { value: "residential_apartment", label: "Apartment" },
  { value: "residential_villa", label: "Villa" },
  { value: "residential_plot", label: "Plot" },
  { value: "residential_independent_house", label: "Independent house" },
  { value: "commercial_office", label: "Commercial office" },
  { value: "commercial_retail", label: "Retail" },
  { value: "commercial_warehouse", label: "Warehouse" },
  { value: "industrial", label: "Industrial" },
  { value: "mixed_use", label: "Mixed use" },
  { value: "farmland", label: "Farmland" },
];

const SALE_STAGES = [
  { value: "pre_launch", label: "Pre-launch" },
  { value: "launching_soon", label: "Launching soon" },
  { value: "under_construction", label: "Under construction" },
  { value: "ready_to_move", label: "Ready to move" },
  { value: "resale", label: "Resale" },
  { value: "sold_out", label: "Sold out" },
];

export function NewProjectSheet({ open, onOpenChange, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
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
  });

  const submit = async () => {
    if (!form.name) {
      toast.error("Project name is required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          code: form.code || slugify(form.name).toUpperCase().slice(0, 12),
          builderName: form.builderName || undefined,
          propertyType: form.propertyType,
          saleStage: form.saleStage,
          configurations: form.configurations
            ? form.configurations
                .split(",")
                .map((c) => c.trim())
                .filter(Boolean)
            : [],
          location: {
            city: form.city || undefined,
            locality: form.locality || undefined,
            state: form.state || undefined,
            pincode: form.pincode || undefined,
            country: "IN",
          },
          rera: form.reraNumber ? { number: form.reraNumber } : undefined,
          priceRange: {
            currency: "INR",
            min: form.minPrice ? Number(form.minPrice) : undefined,
            max: form.maxPrice ? Number(form.maxPrice) : undefined,
            perSqFt: form.perSqFt ? Number(form.perSqFt) : undefined,
          },
          totalUnits: form.totalUnits ? Number(form.totalUnits) : undefined,
          availableUnits: form.availableUnits
            ? Number(form.availableUnits)
            : undefined,
          amenities: form.amenities
            ? form.amenities.split(",").map((a) => a.trim()).filter(Boolean)
            : [],
          description: form.description || undefined,
          possessionDate: form.possessionDate || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Couldn't create project.");
        return;
      }
      toast.success("Project added");
      onOpenChange(false);
      onCreated();
      setForm({
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
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="xl">
        <SheetHeader>
          <SheetTitle>Add project</SheetTitle>
          <SheetDescription>
            Create a project record. You can add brochures, units and pricing later.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Project name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Lodha The Park"
              />
            </Field>
            <Field label="Project code" hint="Leave blank to auto-generate">
              <Input
                value={form.code}
                onChange={(e) =>
                  setForm({ ...form, code: e.target.value.toUpperCase() })
                }
                placeholder="LODHA-PARK"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Builder">
              <Input
                value={form.builderName}
                onChange={(e) => setForm({ ...form, builderName: e.target.value })}
                placeholder="Lodha Group"
              />
            </Field>
            <Field label="Property type">
              <Select
                value={form.propertyType}
                onValueChange={(v) => setForm({ ...form, propertyType: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PROPERTY_TYPES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Sale stage">
              <Select
                value={form.saleStage}
                onValueChange={(v) => setForm({ ...form, saleStage: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SALE_STAGES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Possession date">
              <Input
                type="date"
                value={form.possessionDate}
                onChange={(e) =>
                  setForm({ ...form, possessionDate: e.target.value })
                }
              />
            </Field>
          </div>

          <Field label="Configurations" hint="Comma-separated, e.g. 2BHK, 3BHK, 4BHK">
            <Input
              value={form.configurations}
              onChange={(e) =>
                setForm({ ...form, configurations: e.target.value })
              }
              placeholder="2BHK, 3BHK, 4BHK"
            />
          </Field>

          <div className="grid grid-cols-3 gap-4">
            <Field label="City">
              <Input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="Mumbai"
              />
            </Field>
            <Field label="Locality">
              <Input
                value={form.locality}
                onChange={(e) => setForm({ ...form, locality: e.target.value })}
                placeholder="Bandra West"
              />
            </Field>
            <Field label="State">
              <Input
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                placeholder="Maharashtra"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Min price (₹)">
              <Input
                type="number"
                value={form.minPrice}
                onChange={(e) => setForm({ ...form, minPrice: e.target.value })}
                placeholder="6500000"
              />
            </Field>
            <Field label="Max price (₹)">
              <Input
                type="number"
                value={form.maxPrice}
                onChange={(e) => setForm({ ...form, maxPrice: e.target.value })}
                placeholder="22500000"
              />
            </Field>
            <Field label="Per sqft (₹)">
              <Input
                type="number"
                value={form.perSqFt}
                onChange={(e) => setForm({ ...form, perSqFt: e.target.value })}
                placeholder="18500"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="Total units">
              <Input
                type="number"
                value={form.totalUnits}
                onChange={(e) =>
                  setForm({ ...form, totalUnits: e.target.value })
                }
                placeholder="248"
              />
            </Field>
            <Field label="Available">
              <Input
                type="number"
                value={form.availableUnits}
                onChange={(e) =>
                  setForm({ ...form, availableUnits: e.target.value })
                }
                placeholder="120"
              />
            </Field>
            <Field label="RERA number">
              <Input
                value={form.reraNumber}
                onChange={(e) =>
                  setForm({ ...form, reraNumber: e.target.value })
                }
                placeholder="P51800000000"
              />
            </Field>
          </div>

          <Field label="Amenities" hint="Comma-separated">
            <Input
              value={form.amenities}
              onChange={(e) => setForm({ ...form, amenities: e.target.value })}
              placeholder="Pool, Gym, Clubhouse, Spa"
            />
          </Field>

          <Field label="Description">
            <Textarea
              rows={3}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              placeholder="Highlights, USPs, what makes this project special."
            />
          </Field>
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="ghost">Cancel</Button>
          </SheetClose>
          <Button onClick={submit} loading={saving}>
            Add project
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-[12px] font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}
