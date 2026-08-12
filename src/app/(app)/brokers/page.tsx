"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Handshake, Phone, Mail, Star } from "lucide-react";
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
import { NewBrokerSheet } from "@/components/brokers/NewBrokerSheet";
import { BrokerDetailSheet } from "@/components/brokers/BrokerDetailSheet";
import { PageShell, PageBody } from "@/components/shared/PageShell";
import { FilterBar } from "@/components/shared/FilterBar";
import { MetricStrip } from "@/components/shared/MetricStrip";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { formatPhone, formatNumber } from "@/lib/utils";

interface Broker {
  _id: string;
  name: string;
  firmName?: string;
  phone: string;
  email?: string;
  cpCode?: string;
  status: string;
  rating: number;
  rera?: { number?: string };
  location?: { city?: string };
  totalLeadsReferred: number;
  totalDealsBooked: number;
  totalCommissionEarned: number;
  totalCommissionPaid: number;
}

const STATUS_TONE: Record<
  string,
  { label: string; tone: "neutral" | "info" | "success" | "warning" | "danger" }
> = {
  active: { label: "Active", tone: "success" },
  pending_kyc: { label: "Pending KYC", tone: "warning" },
  inactive: { label: "Inactive", tone: "neutral" },
  blacklisted: { label: "Blacklisted", tone: "danger" },
};

export default function BrokersPage() {
  const searchParams = useSearchParams();
  const [items, setItems] = useState<Broker[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(searchParams.get("new") === "1");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const params = useMemo(() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (status !== "all") u.set("status", status);
    u.set("limit", String(pageSize));
    u.set("skip", String((page - 1) * pageSize));
    return u.toString();
  }, [q, status, page, pageSize]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/brokers?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.brokers ?? []);
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
  }, [q, status, pageSize]);

  const totals = items.reduce(
    (acc, b) => {
      acc.leads += b.totalLeadsReferred ?? 0;
      acc.deals += b.totalDealsBooked ?? 0;
      acc.earned += b.totalCommissionEarned ?? 0;
      acc.paid += b.totalCommissionPaid ?? 0;
      return acc;
    },
    { leads: 0, deals: 0, earned: 0, paid: 0 },
  );

  return (
    <PageShell>
      <PageBody>
        <MetricStrip
          className="lg:grid-cols-4"
          items={[
            { key: "brokers", label: "In view", value: total },
            { key: "deals", label: "Deals (page)", value: totals.deals },
            { key: "earned", label: "Commission earned", value: totals.earned },
            {
              key: "pending",
              label: "Commission pending",
              value: Math.max(totals.earned - totals.paid, 0),
              tone: "warning",
            },
          ]}
        />

        <FilterBar
          actions={
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  setQ("");
                  setStatus("all");
                }}
              >
                Reset
              </Button>
              <Button size="sm" className="h-9 gap-1.5" onClick={() => setOpenNew(true)}>
                <Plus className="size-3.5" />
                Add partner
              </Button>
            </>
          }
        >
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, firm, phone, CP code…"
            className="h-9 w-64"
          />
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-9 w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_TONE).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FilterBar>

        <DataTableShell
          title="Channel partners"
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
                icon={<Handshake className="size-5 text-emerald-600" />}
                title="No channel partners"
                description="Add brokers to track referrals and commissions."
                action={
                  <Button onClick={() => setOpenNew(true)} className="gap-1.5">
                    <Plus className="size-4" />
                    Add partner
                  </Button>
                }
              />
            </div>
          ) : (
            <TableRoot>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Contact</Th>
                  <Th>Company</Th>
                  <Th>Mobile</Th>
                  <Th>Stage</Th>
                  <Th>Leads</Th>
                  <Th>Deals</Th>
                  <Th>RERA</Th>
                  <Th>Rating</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((b, i) => {
                  const tone = STATUS_TONE[b.status] ?? STATUS_TONE.active;
                  return (
                    <tr
                      key={b._id}
                      className="cursor-pointer hover:bg-slate-50/80"
                      onClick={() => setActiveId(b._id)}
                    >
                      <Td className="text-slate-400">{(page - 1) * pageSize + i + 1}</Td>
                      <Td>
                        <p className="font-semibold text-emerald-700">{b.name}</p>
                        <p className="text-[11px] text-slate-400">{b.cpCode ?? "—"}</p>
                        {b.email ? (
                          <p className="mt-0.5 inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Mail className="size-3" />
                            {b.email}
                          </p>
                        ) : null}
                      </Td>
                      <Td>
                        <p>{b.firmName ?? "—"}</p>
                        <p className="text-[11px] text-slate-400">{b.location?.city ?? ""}</p>
                      </Td>
                      <Td>
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Phone className="size-3 text-slate-400" />
                          {formatPhone(b.phone)}
                        </span>
                      </Td>
                      <Td>
                        <StatusPill tone={tone.tone} dot>
                          {tone.label}
                        </StatusPill>
                      </Td>
                      <Td className="tabular-nums">{formatNumber(b.totalLeadsReferred ?? 0)}</Td>
                      <Td className="tabular-nums">{formatNumber(b.totalDealsBooked ?? 0)}</Td>
                      <Td>{b.rera?.number ?? "—"}</Td>
                      <Td>
                        <span className="inline-flex items-center gap-1">
                          <Star className="size-3.5 text-amber-500" />
                          {b.rating ?? 0}
                        </span>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </TableRoot>
          )}
        </DataTableShell>
      </PageBody>
      <NewBrokerSheet open={openNew} onOpenChange={setOpenNew} onCreated={load} />
      <BrokerDetailSheet
        brokerId={activeId}
        brokerIds={items.map((b) => b._id)}
        onBrokerChange={setActiveId}
        onOpenChange={(v) => !v && setActiveId(null)}
        onChanged={load}
      />
    </PageShell>
  );
}
