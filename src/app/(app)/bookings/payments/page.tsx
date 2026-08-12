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
import { FilterField } from "@/components/shared/FilterField";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddPaymentDialog } from "@/components/bookings/AddPaymentDialog";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface PaymentRow {
  _id: string;
  type?: string;
  paymentFor?: string;
  date?: string;
  customerName?: string;
  paymentType?: string;
  netAmount?: number;
  tds?: number;
  totalAmount?: number;
  finalAmount?: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [paymentType, setPaymentType] = useState("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openAdd, setOpenAdd] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(() => {
    setLoading(true);
    const u = new URLSearchParams({
      limit: String(pageSize),
      skip: String((page - 1) * pageSize),
    });
    if (q) u.set("q", q);
    if (type !== "all") u.set("type", type);
    if (paymentType !== "all") u.set("paymentType", paymentType);
    if (dateFrom) u.set("dateFrom", format(dateFrom, "yyyy-MM-dd"));
    if (dateTo) u.set("dateTo", format(dateTo, "yyyy-MM-dd"));
    fetch(`/api/payments?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setPayments(d.payments ?? []);
        setTotal(d.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [q, type, paymentType, dateFrom, dateTo, page, pageSize]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, type, paymentType, dateFrom, dateTo, pageSize]);

  return (
    <PageShell>
      <PageBody>
        <Section>
          <FilterBar
            advancedTitle="Payment date range"
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
                    setPaymentType("all");
                    setDateFrom(undefined);
                    setDateTo(undefined);
                  }}
                >
                  Clear
                </Button>
                <Button size="sm" className="h-9 gap-1" onClick={() => setOpenAdd(true)}>
                  <Plus className="size-3.5" />
                  Add payment
                </Button>
              </>
            }
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search payments…"
              className="h-9 w-56"
            />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="refund">Refund</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentType} onValueChange={setPaymentType}>
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
          title="Payments"
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
          ) : payments.length === 0 ? (
            <EmptyState
              title="No payments found"
              description="Record a payment or clear filters."
              action={
                <Button onClick={() => setOpenAdd(true)} className="gap-1.5">
                  <Plus className="size-4" />
                  Add payment
                </Button>
              }
            />
          ) : (
            <TableRoot>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Type</Th>
                  <Th>Payment for</Th>
                  <Th>Date</Th>
                  <Th>Customer</Th>
                  <Th>Payment type</Th>
                  <Th>Net</Th>
                  <Th>TDS</Th>
                  <Th>Total</Th>
                  <Th>Final</Th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p, i) => (
                  <tr key={p._id} className="hover:bg-slate-50/80">
                    <Td className="tabular-nums text-slate-400">
                      {(page - 1) * pageSize + i + 1}
                    </Td>
                    <Td>
                      <StatusPill tone="info">{(p.type ?? "—").replace(/_/g, " ")}</StatusPill>
                    </Td>
                    <Td className="max-w-[160px] truncate">{p.paymentFor ?? "—"}</Td>
                    <Td className="whitespace-nowrap text-[12px] text-slate-500">
                      {p.date
                        ? new Date(p.date).toLocaleDateString("en-IN", { dateStyle: "medium" })
                        : "—"}
                    </Td>
                    <Td className="font-medium text-emerald-700">{p.customerName ?? "—"}</Td>
                    <Td className="uppercase text-[12px]">{p.paymentType ?? "—"}</Td>
                    <Td className="tabular-nums">{formatCurrency(p.netAmount ?? 0)}</Td>
                    <Td className="tabular-nums">{formatCurrency(p.tds ?? 0)}</Td>
                    <Td className="tabular-nums">{formatCurrency(p.totalAmount ?? 0)}</Td>
                    <Td className="tabular-nums font-medium">
                      {formatCurrency(p.finalAmount ?? 0)}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableRoot>
          )}
        </DataTableShell>
      </PageBody>
      <AddPaymentDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={load} />
    </PageShell>
  );
}
