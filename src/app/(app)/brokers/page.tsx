"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  Handshake,
  Filter,
  Phone,
  Mail,
  Star,
  ShieldCheck,
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
import { NewBrokerSheet } from "@/components/brokers/NewBrokerSheet";
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
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(searchParams.get("new") === "1");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");

  const params = useMemo(() => {
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (status !== "all") u.set("status", status);
    return u.toString();
  }, [q, status]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/brokers?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.brokers ?? []))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

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
    <div className="flex flex-1 flex-col bg-white">
      {/* Stats bar */}
      <div className="grid grid-cols-2 gap-px border-b border-slate-200/70 bg-slate-200/70 lg:grid-cols-4">
        <Stat label="Total brokers" value={items.length} />
        <Stat label="Total deals booked" value={totals.deals} />
        <Stat label="Commission earned" value={totals.earned} prefix="₹" />
        <Stat label="Commission pending" value={totals.earned - totals.paid} prefix="₹" tone="amber" />
      </div>

      {/* Toolbar */}
      <div className="sticky top-[72px] z-20 flex flex-col gap-3 border-b border-slate-200/70 bg-white px-7 py-4 lg:flex-row lg:items-center lg:px-10">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" strokeWidth={1.75} />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, firm, phone, CP code…"
              className="h-10 rounded-lg pl-10"
            />
          </div>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-44">
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
        </div>
        <Button
          variant="outline"
          className="h-10 gap-1.5 rounded-lg"
          onClick={() => {
            setQ("");
            setStatus("all");
          }}
        >
          <Filter className="size-4" strokeWidth={1.75} />
          Reset
        </Button>
        <Button onClick={() => setOpenNew(true)} className="h-10 gap-1.5 rounded-lg">
          <Plus className="size-4" strokeWidth={2} />
          Add broker
        </Button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-2 p-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="px-7 py-12 lg:px-10">
          <EmptyState
            icon={<Handshake className="size-5 text-emerald-600" strokeWidth={1.75} />}
            title={q || status !== "all" ? "No brokers match" : "No brokers yet"}
            description="Onboard your first channel partner. Track leads they refer, commissions and payouts in one place."
            action={
              <Button onClick={() => setOpenNew(true)} className="gap-1.5">
                <Plus className="size-4" strokeWidth={2} />
                Add your first broker
              </Button>
            }
          />
        </div>
      ) : (
        <table className="w-full text-[13.5px]">
          <thead className="sticky top-[136px] z-10 bg-slate-50/80 backdrop-blur">
            <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-7 py-3 lg:px-10">Broker</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3">Leads</th>
              <th className="px-3 py-3">Deals</th>
              <th className="px-3 py-3">Commission earned</th>
              <th className="px-3 py-3">Pending</th>
              <th className="px-3 py-3">Rating</th>
            </tr>
          </thead>
          <tbody>
            {items.map((b) => {
              const tone = STATUS_TONE[b.status] ?? STATUS_TONE.active;
              const pending =
                (b.totalCommissionEarned ?? 0) - (b.totalCommissionPaid ?? 0);
              return (
                <tr
                  key={b._id}
                  className="border-t border-slate-100 transition-colors hover:bg-slate-50/70"
                >
                  <td className="px-7 py-3 lg:px-10">
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-[12px] font-bold text-white">
                        {b.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="flex items-center gap-1.5 truncate font-semibold text-slate-900">
                          {b.name}
                          {b.rera?.number ? (
                            <ShieldCheck
                              className="size-3.5 text-emerald-600"
                              strokeWidth={2}
                            />
                          ) : null}
                        </p>
                        <p className="truncate text-[12px] text-slate-500">
                          {b.firmName ?? "Independent"}
                          <span className="mx-1.5 text-slate-300">·</span>
                          <Phone className="mr-1 inline size-3" strokeWidth={1.75} />
                          {formatPhone(b.phone)}
                          {b.email ? (
                            <>
                              <span className="mx-1.5 text-slate-300">·</span>
                              <Mail className="mr-1 inline size-3" strokeWidth={1.75} />
                              {b.email}
                            </>
                          ) : null}
                        </p>
                        <p className="mt-0.5 font-mono text-[10.5px] text-slate-400">
                          {b.cpCode}
                          {b.location?.city ? <span> · {b.location.city}</span> : null}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <StatusPill tone={tone.tone} dot>
                      {tone.label}
                    </StatusPill>
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-700 tabular-nums">
                    {formatNumber(b.totalLeadsReferred ?? 0)}
                  </td>
                  <td className="px-3 py-3 font-semibold text-slate-700 tabular-nums">
                    {formatNumber(b.totalDealsBooked ?? 0)}
                  </td>
                  <td className="px-3 py-3 font-semibold text-emerald-700 tabular-nums">
                    ₹{formatNumber(b.totalCommissionEarned ?? 0)}
                  </td>
                  <td className="px-3 py-3 font-semibold tabular-nums text-amber-700">
                    ₹{formatNumber(pending)}
                  </td>
                  <td className="px-3 py-3">
                    <span className="inline-flex items-center gap-1 text-[12px] text-slate-700">
                      <Star className="size-3.5 fill-amber-400 text-amber-400" strokeWidth={0} />
                      {b.rating?.toFixed(1) ?? "—"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      <NewBrokerSheet open={openNew} onOpenChange={setOpenNew} onCreated={load} />
    </div>
  );
}

function Stat({
  label,
  value,
  prefix,
  tone = "default",
}: {
  label: string;
  value: number;
  prefix?: string;
  tone?: "default" | "amber";
}) {
  return (
    <div className="bg-white px-7 py-5 lg:px-10">
      <p className="text-[11.5px] font-medium text-slate-500">{label}</p>
      <p
        className={`mt-1.5 text-[24px] font-bold tracking-tight tabular-nums ${
          tone === "amber" ? "text-amber-700" : "text-slate-900"
        }`}
      >
        {prefix ?? ""}
        {formatNumber(value)}
      </p>
    </div>
  );
}
