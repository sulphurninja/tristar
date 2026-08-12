"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ChevronsLeft, ChevronsRight, X, Building2, ImagePlus } from "lucide-react";
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatPhone } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface TimelineEntry {
  text: string;
  createdAt?: string;
  createdByName?: string;
}

interface Property {
  _id: string;
  propertyNumber?: string;
  title: string;
  inventoryType?: string;
  location?: string;
  city?: string;
  availableFor?: string;
  status?: string;
  floor?: string;
  configuration?: string;
  area?: number;
  price?: number;
  ownerName?: string;
  ownerEmail?: string;
  ownerMobile?: string;
  notes?: string;
  images?: Array<{ url: string; caption?: string }>;
  timeline?: TimelineEntry[];
  projectId?: { name?: string; code?: string } | null;
}

interface Props {
  propertyId: string | null;
  propertyIds?: string[];
  onPropertyChange?: (id: string) => void;
  onOpenChange: (v: boolean) => void;
  onChanged: () => void;
}

const STATUSES = ["available", "held", "booked", "sold", "unavailable"];

export function PropertyDetailSheet({
  propertyId,
  propertyIds = [],
  onPropertyChange,
  onOpenChange,
  onChanged,
}: Props) {
  const { user } = useAuth();
  const [property, setProperty] = useState<Property | null>(null);
  const [remark, setRemark] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  const open = !!propertyId;
  const index = propertyId ? propertyIds.indexOf(propertyId) : -1;
  const canPrev = index > 0;
  const canNext = index >= 0 && index < propertyIds.length - 1;
  const images = property?.images?.length
    ? property.images
    : [{ url: "", caption: "No image" }];

  useEffect(() => {
    if (!propertyId) {
      setProperty(null);
      return;
    }
    setLoading(true);
    setImgIndex(0);
    fetch(`/api/properties/${propertyId}`)
      .then((r) => r.json())
      .then((d) => setProperty(d.property ?? null))
      .finally(() => setLoading(false));
  }, [propertyId]);

  const patch = async (body: Record<string, unknown>) => {
    if (!propertyId) return null;
    const res = await fetch(`/api/properties/${propertyId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const d = await res.json();
      setProperty(d.property);
      onChanged();
      return d.property as Property;
    }
    toast.error("Update failed");
    return null;
  };

  const updateStatus = async (status: string) => {
    const p = await patch({ status });
    if (p) toast.success("Status updated");
  };

  const submitRemark = async () => {
    if (!remark.trim()) return;
    const p = await patch({ remark: remark.trim(), actorName: user?.name });
    if (p) {
      setRemark("");
      toast.success("Remark saved");
    }
  };

  const addImage = async () => {
    if (!imageUrl.trim()) return;
    const p = await patch({ imageUrl: imageUrl.trim() });
    if (p) {
      setImageUrl("");
      toast.success("Image added");
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="full" hideClose className="bg-slate-50 p-0">
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-900">Property Information</h2>
            {propertyIds.length > 0 && index >= 0 ? (
              <p className="text-[12px] tabular-nums text-slate-500">
                {index + 1} / {propertyIds.length}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 px-0"
              disabled={!canPrev}
              onClick={() => canPrev && onPropertyChange?.(propertyIds[index - 1])}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 px-0"
              disabled={!canNext}
              onClick={() => canNext && onPropertyChange?.(propertyIds[index + 1])}
            >
              <ChevronsRight className="size-4" />
            </Button>
            <SheetClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
                <X className="size-4" />
              </Button>
            </SheetClose>
          </div>
        </div>

        {loading && !property ? (
          <div className="flex flex-1 items-center justify-center text-[13px] text-slate-500">
            Loading…
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[1.1fr_1fr]">
            <aside className="scrollbar-hide overflow-y-auto border-r border-slate-200 bg-white p-5">
              <div className="relative overflow-hidden rounded-xl bg-slate-100">
                {images[imgIndex]?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={images[imgIndex].url}
                    alt={property?.title ?? "Property"}
                    className="h-56 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-56 flex-col items-center justify-center gap-2 text-slate-400">
                    <Building2 className="size-10" />
                    <p className="text-[13px]">No gallery image</p>
                  </div>
                )}
                {images.length > 1 && images[0]?.url ? (
                  <>
                    <button
                      type="button"
                      className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-2 py-1 text-white"
                      onClick={() =>
                        setImgIndex((i) => (i - 1 + images.length) % images.length)
                      }
                    >
                      ‹
                    </button>
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-2 py-1 text-white"
                      onClick={() => setImgIndex((i) => (i + 1) % images.length)}
                    >
                      ›
                    </button>
                  </>
                ) : null}
              </div>

              {(property?.images?.length ?? 0) > 0 ? (
                <div className="mt-2 flex gap-2 overflow-x-auto">
                  {property!.images!.map((img, i) => (
                    <button
                      key={img.url + i}
                      type="button"
                      onClick={() => setImgIndex(i)}
                      className={`h-14 w-16 shrink-0 overflow-hidden rounded-md border ${
                        i === imgIndex ? "border-emerald-500" : "border-slate-200"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="mt-3 flex gap-2">
                <Input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Paste image URL…"
                  className="h-9"
                />
                <Button size="sm" className="h-9 gap-1" onClick={addImage}>
                  <ImagePlus className="size-3.5" />
                  Add
                </Button>
              </div>

              <div className="mt-4">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </p>
                <Select value={property?.status ?? "available"} onValueChange={updateStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Set status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 rounded-xl border border-slate-200 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Property details
                </p>
                <p className="mt-2 text-[14px] font-semibold text-slate-900">
                  Available for {(property?.availableFor ?? "sale").toUpperCase()}
                  {property?.city ? ` at ${property.city}` : ""}
                </p>
                <p className="mt-1 text-[13px] text-slate-600">
                  {property?.location || property?.projectId?.name || "—"}
                </p>
                <div className="mt-3 space-y-1.5 text-[13px] text-slate-700">
                  <p>
                    <span className="text-slate-500">Name: </span>
                    {property?.ownerName || "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">Mobile No.: </span>
                    {property?.ownerMobile ? formatPhone(property.ownerMobile) : "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">Email: </span>
                    {property?.ownerEmail || "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">Area: </span>
                    {property?.area != null ? `${property.area} sqft` : "—"}
                  </p>
                  <p>
                    <span className="text-slate-500">Configuration: </span>
                    {property?.configuration || "—"}
                  </p>
                  {property?.price != null ? (
                    <p>
                      <span className="text-slate-500">Price: </span>₹
                      {property.price.toLocaleString("en-IN")}
                    </p>
                  ) : null}
                </div>
              </div>
            </aside>

            <section className="flex min-h-0 flex-col overflow-hidden bg-white">
              <Tabs defaultValue="timeline" className="flex min-h-0 flex-1 flex-col">
                <div className="border-b border-slate-200 px-4 pt-2">
                  <TabsList className="h-auto bg-transparent p-0">
                    <TabsTrigger
                      value="timeline"
                      className="rounded-t-md rounded-b-none px-3 py-2 text-[12.5px] data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
                    >
                      Timeline
                    </TabsTrigger>
                  </TabsList>
                </div>
                <TabsContent value="timeline" className="scrollbar-hide mt-0 flex-1 overflow-y-auto p-4">
                  <div className="rounded-xl border border-slate-200 p-4">
                    <p className="text-[13px] font-semibold text-slate-800">Add remark</p>
                    <Textarea
                      className="mt-2"
                      rows={4}
                      value={remark}
                      onChange={(e) => setRemark(e.target.value)}
                      placeholder="Enter remark… (ex. Site inspected)"
                    />
                    <div className="mt-2 flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setRemark("")}>
                        Clear
                      </Button>
                      <Button size="sm" onClick={submitRemark}>
                        Submit
                      </Button>
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {(property?.timeline ?? []).length === 0 ? (
                      <li className="py-10 text-center text-[13px] text-slate-500">
                        No remarks yet.
                      </li>
                    ) : (
                      (property?.timeline ?? []).map((t, i) => (
                        <li
                          key={`${t.createdAt}-${i}`}
                          className="rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5 text-[13px]"
                        >
                          <p className="text-slate-800">{t.text}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            {t.createdByName ?? "Team"}
                            {t.createdAt
                              ? ` · ${new Date(t.createdAt).toLocaleString("en-IN")}`
                              : ""}
                          </p>
                        </li>
                      ))
                    )}
                  </ul>
                </TabsContent>
              </Tabs>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
