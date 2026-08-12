"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PageShell, PageBody, Section } from "@/components/shared/PageShell";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddPropertyDialog } from "@/components/properties/AddPropertyDialog";
import { PropertyDetailSheet } from "@/components/properties/PropertyDetailSheet";

interface PropertyRow {
  _id: string;
  propertyNumber?: string;
  title?: string;
  inventoryType?: string;
  location?: string;
  availableFor?: string;
  status?: string;
  ownerName?: string;
  projectId?: { name?: string; code?: string } | null;
}

export default function PropertyPage() {
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openAdd, setOpenAdd] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(() => {
    setLoading(true);
    const u = new URLSearchParams({
      limit: String(pageSize),
      skip: String((page - 1) * pageSize),
    });
    if (q) u.set("q", q);
    if (status !== "all") u.set("status", status);
    fetch(`/api/properties?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setProperties(d.properties ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [q, status, page, pageSize]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, status, pageSize]);

  return (
    <PageShell>
      <PageBody>
        <Section>
          <FilterBar
            actions={
              <>
                <Button size="sm" variant="outline" onClick={load}>
                  Search
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setQ("");
                    setStatus("all");
                  }}
                >
                  Clear
                </Button>
                <Button size="sm" className="h-9 gap-1" onClick={() => setOpenAdd(true)}>
                  <Plus className="size-3.5" />
                  Add property
                </Button>
              </>
            }
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search title, location, owner…"
              className="h-9 w-64"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="reserved">Reserved</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="rented">Rented</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>
        </Section>

        <DataTableShell
          title="Properties"
          count={total}
          search={q}
          onSearchChange={setQ}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        >
          {loading ? (
            <div className="h-40 animate-pulse bg-slate-50" />
          ) : properties.length === 0 ? (
            <EmptyState
              title="No properties found"
              description="Add a listing or clear filters."
              action={
                <Button onClick={() => setOpenAdd(true)} className="gap-1.5">
                  <Plus className="size-4" />
                  Add property
                </Button>
              }
            />
          ) : (
            <TableRoot>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Property #</Th>
                  <Th>Title</Th>
                  <Th>Type</Th>
                  <Th>Location</Th>
                  <Th>Available for</Th>
                  <Th>Status</Th>
                  <Th>Owner</Th>
                  <Th>Project</Th>
                </tr>
              </thead>
              <tbody>
                {properties.map((p, i) => (
                  <tr
                    key={p._id}
                    className="cursor-pointer hover:bg-slate-50/80"
                    onClick={() => setActiveId(p._id)}
                  >
                    <Td className="tabular-nums text-slate-400">
                      {(page - 1) * pageSize + i + 1}
                    </Td>
                    <Td className="font-medium text-emerald-700">{p.propertyNumber ?? "—"}</Td>
                    <Td className="max-w-[200px] truncate font-medium">{p.title ?? "—"}</Td>
                    <Td className="capitalize">{(p.inventoryType ?? "—").replace(/_/g, " ")}</Td>
                    <Td className="max-w-[160px] truncate">{p.location ?? "—"}</Td>
                    <Td className="capitalize">{(p.availableFor ?? "—").replace(/_/g, " ")}</Td>
                    <Td>
                      <StatusPill
                        tone={
                          p.status === "available"
                            ? "success"
                            : p.status === "sold" || p.status === "rented"
                              ? "neutral"
                              : "warning"
                        }
                      >
                        {(p.status ?? "—").replace(/_/g, " ")}
                      </StatusPill>
                    </Td>
                    <Td>{p.ownerName ?? "—"}</Td>
                    <Td>{p.projectId?.name ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </TableRoot>
          )}
        </DataTableShell>
      </PageBody>
      <AddPropertyDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={load} />
      <PropertyDetailSheet
        propertyId={activeId}
        propertyIds={properties.map((p) => p._id)}
        onPropertyChange={setActiveId}
        onOpenChange={(v) => !v && setActiveId(null)}
        onChanged={load}
      />
    </PageShell>
  );
}
