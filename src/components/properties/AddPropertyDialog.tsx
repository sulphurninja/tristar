"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

const NONE = "__none";

const INVENTORY_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "residential_apartment", label: "Apartment" },
  { value: "residential_villa", label: "Villa" },
  { value: "residential_plot", label: "Plot" },
  { value: "residential_independent_house", label: "Independent house" },
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

interface ProjectOpt {
  _id: string;
  name: string;
  code?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function AddPropertyDialog({ open, onOpenChange, onCreated }: Props) {
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  const [title, setTitle] = useState("");
  const [inventoryType, setInventoryType] = useState("residential");
  const [location, setLocation] = useState("");
  const [city, setCity] = useState("");
  const [availableFor, setAvailableFor] = useState("sale");
  const [configuration, setConfiguration] = useState("");
  const [area, setArea] = useState("");
  const [price, setPrice] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerMobile, setOwnerMobile] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [projectId, setProjectId] = useState("");
  const [status, setStatus] = useState("available");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTitle("");
    setInventoryType("residential");
    setLocation("");
    setCity("");
    setAvailableFor("sale");
    setConfiguration("");
    setArea("");
    setPrice("");
    setOwnerName("");
    setOwnerMobile("");
    setOwnerEmail("");
    setProjectId("");
    setStatus("available");

    fetch("/api/projects?limit=100", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => {});
  }, [open]);

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          inventoryType,
          location: location.trim() || undefined,
          city: city.trim() || undefined,
          availableFor,
          configuration: configuration.trim() || undefined,
          area: area ? Number(area) : undefined,
          price: price ? Number(price) : undefined,
          ownerName: ownerName.trim() || undefined,
          ownerMobile: ownerMobile.trim() || undefined,
          ownerEmail: ownerEmail.trim() || undefined,
          projectId: projectId || undefined,
          status,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Failed to create property");
      toast.success("Property created");
      onOpenChange(false);
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create property");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0">
        <DialogHeader className="border-b border-slate-100 px-5 py-4">
          <DialogTitle className="text-[16px] font-semibold text-slate-800">
            Add property
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[min(70vh,640px)] space-y-3 overflow-y-auto px-5 py-4">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Property title"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Inventory type</Label>
              <Select value={inventoryType} onValueChange={setInventoryType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INVENTORY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Available for</Label>
              <Select value={availableFor} onValueChange={setAvailableFor}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_FOR.map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Locality / address"
              />
            </div>
            <div className="space-y-1.5">
              <Label>City</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Configuration</Label>
              <Input
                value={configuration}
                onChange={(e) => setConfiguration(e.target.value)}
                placeholder="2 BHK"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Area (sqft)</Label>
              <Input
                type="number"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Price</Label>
              <Input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Project</Label>
            <Select
              value={projectId || NONE}
              onValueChange={(v) => setProjectId(v === NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {projects.map((p) => (
                  <SelectItem key={p._id} value={p._id}>
                    {p.name}
                    {p.code ? ` (${p.code})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Owner name</Label>
              <Input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner mobile</Label>
              <Input
                value={ownerMobile}
                onChange={(e) => setOwnerMobile(e.target.value)}
                placeholder="Mobile"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Owner email</Label>
              <Input
                type="email"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                placeholder="Email"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          <Button onClick={submit} disabled={saving} className="min-w-24">
            {saving ? "Saving…" : "Submit"}
          </Button>
          <DialogClose asChild>
            <Button variant="secondary" disabled={saving}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
