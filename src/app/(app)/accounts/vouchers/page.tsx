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
import { FilterField } from "@/components/shared/FilterField";
import { DatePicker } from "@/components/ui/date-picker";
import { format } from "date-fns";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddVoucherDialog } from "@/components/accounts/AddVoucherDialog";
import { formatCurrency } from "@/lib/utils";

interface VoucherRow {
  _id: string;
  voucherNumber?: string;
  type?: string;
  paymentMode?: string;
  date?: string;
  amount?: number;
  narration?: string;
  ledgerId?: { name?: string } | null;
  fromLedgerId?: { name?: string } | null;
  toLedgerId?: { name?: string } | null;
}

export default function VouchersPage() {
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [paymentMode, setPaymentMode] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openAdd, setOpenAdd] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(() => {
    setLoading(true);
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (type !== "all") u.set("type", type);
    if (paymentMode !== "all") u.set("paymentMode", paymentMode);
    if (dateFrom) u.set("dateFrom", format(dateFrom, "yyyy-MM-dd"));
    if (dateTo) u.set("dateTo", format(dateTo, "yyyy-MM-dd"));
    fetch(`/api/vouchers?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setVouchers(d.vouchers ?? []);
        setTotal(d.total ?? (d.vouchers?.length ?? 0));
      })
      .finally(() => setLoading(false));
  }, [q, type, paymentMode, dateFrom, dateTo]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, type, paymentMode, dateFrom, dateTo, pageSize]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return vouchers.slice(start, start + pageSize);
  }, [vouchers, page, pageSize]);

  return (
    <PageShell>
      <PageBody>
        <Section>
          <FilterBar
            advancedTitle="Voucher date range"
            advanced={
              <div className="grid grid-cols-2 gap-3">
                <FilterField label="From">
                  <DatePicker value={dateFrom} onChange={setDateFrom} placeholder="From" />
                </FilterField>
                <FilterField label="To">
                  <DatePicker value={dateTo} onChange={setDateTo} placeholder="To" />
                </FilterField>
              </div>
            }
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
                    setType("all");
                    setPaymentMode("all");
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  }}
                >
                  Clear
                </Button>
                <Button size="sm" className="h-9 gap-1" onClick={() => setOpenAdd(true)}>
                  <Plus className="size-3.5" />
                  Add voucher
                </Button>
              </>
            }
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search vouchers…"
              className="h-9 w-56"
            />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="payment">Payment</SelectItem>
                <SelectItem value="journal">Journal</SelectItem>
                <SelectItem value="contra">Contra</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All modes</SelectItem>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="cheque">Cheque</SelectItem>
                <SelectItem value="neft">NEFT</SelectItem>
                <SelectItem value="rtgs">RTGS</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
                <SelectItem value="card">Card</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>
        </Section>

        <DataTableShell
          title="Vouchers"
          count={total}
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
              title="No vouchers found"
              description="Create a voucher linked to a ledger."
              action={
                <Button onClick={() => setOpenAdd(true)} className="gap-1.5">
                  <Plus className="size-4" />
                  Add voucher
                </Button>
              }
            />
          ) : (
            <TableRoot>
              <thead>
                <tr>
                  <Th>Voucher #</Th>
                  <Th>Type</Th>
                  <Th>Date</Th>
                  <Th>Mode</Th>
                  <Th>From → To</Th>
                  <Th>Amount</Th>
                  <Th>Narration</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((v) => (
                  <tr key={v._id} className="hover:bg-slate-50/80">
                    <Td className="font-mono text-[12px]">{v.voucherNumber ?? "—"}</Td>
                    <Td>
                      <StatusPill tone="info">{(v.type ?? "—").replace(/_/g, " ")}</StatusPill>
                    </Td>
                    <Td className="text-[12px] text-slate-500">
                      {v.date ? new Date(v.date).toLocaleDateString("en-IN") : "—"}
                    </Td>
                    <Td className="capitalize text-[12px] text-slate-600">
                      {(v.paymentMode ?? "—").replace(/_/g, " ")}
                    </Td>
                    <Td className="text-[12.5px]">
                      {v.fromLedgerId?.name ?? v.ledgerId?.name ?? "—"}
                      <span className="text-slate-400"> → </span>
                      {v.toLedgerId?.name ?? "—"}
                    </Td>
                    <Td className="tabular-nums font-medium">
                      {formatCurrency(v.amount ?? 0)}
                    </Td>
                    <Td className="max-w-xs truncate">{v.narration ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </TableRoot>
          )}
        </DataTableShell>
      </PageBody>
      <AddVoucherDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={load} />
    </PageShell>
  );
}
