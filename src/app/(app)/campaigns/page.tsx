"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { AddCampaignDialog } from "@/components/campaigns/AddCampaignDialog";
import { formatCurrency } from "@/lib/utils";

interface CampaignRow {
  _id: string;
  name?: string;
  channel?: string;
  status?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [channel, setChannel] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openAdd, setOpenAdd] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(() => {
    setLoading(true);
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (status !== "all") u.set("status", status);
    if (channel !== "all") u.set("channel", channel);
    fetch(`/api/campaigns?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setCampaigns(d.campaigns ?? []);
        setTotal(d.total ?? (d.campaigns?.length ?? 0));
      })
      .finally(() => setLoading(false));
  }, [q, status, channel]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, status, channel, pageSize]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return campaigns.slice(start, start + pageSize);
  }, [campaigns, page, pageSize]);

  function formatUtm(c: CampaignRow) {
    const parts = [c.utmSource, c.utmMedium, c.utmCampaign].filter(Boolean);
    return parts.length ? parts.join(" / ") : "—";
  }

  function formatDates(c: CampaignRow) {
    const start = c.startDate
      ? new Date(c.startDate).toLocaleDateString("en-IN", { dateStyle: "medium" })
      : null;
    const end = c.endDate
      ? new Date(c.endDate).toLocaleDateString("en-IN", { dateStyle: "medium" })
      : null;
    if (!start && !end) return "—";
    return `${start ?? "…"} – ${end ?? "…"}`;
  }

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
                    setChannel("all");
                  }}
                >
                  Clear
                </Button>
                <Button size="sm" className="h-9 gap-1" onClick={() => setOpenAdd(true)}>
                  <Plus className="size-3.5" />
                  Add campaign
                </Button>
              </>
            }
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search campaigns…"
              className="h-9 w-56"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="paused">Paused</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
            <Select value={channel} onValueChange={setChannel}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Channel" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All channels</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="google">Google</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>
        </Section>

        <DataTableShell
          title="Campaigns"
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
          ) : pageRows.length === 0 ? (
            <EmptyState
              title="No campaigns found"
              description="Create a campaign to get started."
              action={
                <Button onClick={() => setOpenAdd(true)} className="gap-1.5">
                  <Plus className="size-4" />
                  Add campaign
                </Button>
              }
            />
          ) : (
            <TableRoot>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Channel</Th>
                  <Th>Status</Th>
                  <Th>UTM</Th>
                  <Th>Budget</Th>
                  <Th>Dates</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((c) => (
                  <tr key={c._id} className="hover:bg-slate-50/80">
                    <Td className="font-medium text-emerald-700">{c.name ?? "—"}</Td>
                    <Td className="capitalize">{(c.channel ?? "—").replace(/_/g, " ")}</Td>
                    <Td>
                      <StatusPill
                        tone={
                          c.status === "active"
                            ? "success"
                            : c.status === "paused"
                              ? "warning"
                              : "neutral"
                        }
                      >
                        {(c.status ?? "draft").replace(/_/g, " ")}
                      </StatusPill>
                    </Td>
                    <Td className="max-w-[200px] truncate text-[12px] text-slate-500">
                      {formatUtm(c)}
                    </Td>
                    <Td className="tabular-nums">
                      {c.budget != null ? formatCurrency(c.budget) : "—"}
                    </Td>
                    <Td className="whitespace-nowrap text-[12px] text-slate-500">
                      {formatDates(c)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableRoot>
          )}
        </DataTableShell>
      </PageBody>
      <AddCampaignDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={load} />
    </PageShell>
  );
}
