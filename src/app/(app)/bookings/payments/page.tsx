"use client";

export const dynamic = "force-dynamic";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  BdPage,
  BdCard,
  BdStatCard,
  BdField,
  BdSelect,
  BdButton,
  BdTable,
  BdTh,
  BdTd,
  BdEmptyRow,
  BdTableToolbar,
  BdBadge,
} from "@/components/bd";
import { BdKebab, BdRowActions, BdConfirm } from "@/components/bd/BdOverlays";
import { PaymentFormDialog, PAYMENT_MODES, type PaymentEditable } from "@/components/bookings/PaymentFormDialog";
import { printReceipt } from "@/components/bookings/receipt";
import { useAuth } from "@/contexts/AuthContext";
import { toCsv, downloadCsv } from "@/lib/bd-csv";
import { formatCurrency } from "@/lib/utils";

interface PaymentRow extends PaymentEditable {
  receiptNumber?: string;
  totalAmount?: number;
  finalAmount?: number;
  bookingId?: { _id: string; bookingNumber?: string; customerName?: string } | null;
}

interface Filters {
  type: string;
  paymentType: string;
  from: string;
  to: string;
  q: string;
}
const EMPTY: Filters = { type: "", paymentType: "", from: "", to: "", q: "" };

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

export default function PaymentsPage() {
  const { workspace } = useAuth();
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [total, setTotal] = useState(0);
  const [totals, setTotals] = useState({ received: 0, refunded: 0, net: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [tableQ, setTableQ] = useState("");
  const [tableQd, setTableQd] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<PaymentRow | null>(null);
  const [del, setDel] = useState<PaymentRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setTableQd(tableQ), 300);
    return () => clearTimeout(t);
  }, [tableQ]);

  const query = useCallback(
    (extra?: Record<string, string>) => {
      const u = new URLSearchParams();
      if (applied.type) u.set("type", applied.type);
      if (applied.paymentType) u.set("paymentType", applied.paymentType);
      if (applied.from) u.set("dateFrom", applied.from);
      if (applied.to) u.set("dateTo", applied.to);
      const q = [applied.q, tableQd].filter(Boolean).join(" ").trim();
      if (q) u.set("q", q);
      for (const [k, v] of Object.entries(extra ?? {})) u.set(k, v);
      return u;
    },
    [applied, tableQd],
  );

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/payments?${query({ limit: String(pageSize), skip: String((page - 1) * pageSize) })}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.payments ?? []);
        setTotal(d.total ?? 0);
        if (d.totals) setTotals(d.totals);
      })
      .catch(() => toast.error("Could not load payments"))
      .finally(() => setLoading(false));
  }, [query, page, pageSize]);

  useEffect(load, [load]);
  useEffect(() => setPage(1), [applied, tableQd, pageSize]);

  const remove = async () => {
    if (!del) return;
    const res = await fetch(`/api/payments/${del._id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not delete payment");
    toast.success("Payment deleted");
    setDel(null);
    load();
  };

  const exportCsv = async () => {
    const t = toast.loading("Preparing export…");
    try {
      const d = await fetch(`/api/payments?${query({ export: "1" })}`, { cache: "no-store" }).then((r) => r.json());
      const list: PaymentRow[] = d.payments ?? [];
      downloadCsv(
        "payments.csv",
        toCsv(
          ["Receipt No", "Date", "Type", "Customer", "Booking", "Payment For", "Payment Type", "Bank Details", "Ledger Account", "Net", "Tax", "TDS", "Final"],
          list.map((p) => [p.receiptNumber ?? "", fmt(p.date), p.type ?? "", p.customerName ?? "", p.bookingId?.bookingNumber ?? "", p.paymentFor ?? "", p.paymentType ?? "", p.bankDetails ?? "", p.ledgerAccount ?? "", p.netAmount ?? 0, p.taxAmount ?? 0, p.tds ?? 0, p.finalAmount ?? 0]),
        ),
      );
      toast.success(`Exported ${list.length} payments`, { id: t });
    } catch {
      toast.error("Export failed", { id: t });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <BdPage>
      <BdCard title="Payments">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <BdField label="Type">
            <BdSelect
              placeholder="Select Type"
              value={draft.type}
              onChange={(v) => setDraft((d) => ({ ...d, type: v }))}
              options={[
                { value: "receipt", label: "Receipt" },
                { value: "refund", label: "Refund" },
              ]}
            />
          </BdField>
          <BdField label="Payment Type">
            <BdSelect placeholder="Select Payment Type" value={draft.paymentType} onChange={(v) => setDraft((d) => ({ ...d, paymentType: v }))} options={PAYMENT_MODES} />
          </BdField>
          <BdField label="From">
            <input type="date" className="bd-input" value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
          </BdField>
          <BdField label="To">
            <input type="date" className="bd-input" value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
          </BdField>
          <BdField label="Search">
            <input className="bd-input" placeholder="Customer, receipt no." value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && setApplied(draft)} />
          </BdField>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <BdButton onClick={() => setApplied(draft)}>Search</BdButton>
          <BdButton
            variant="light"
            onClick={() => {
              setDraft(EMPTY);
              setApplied(EMPTY);
              setTableQ("");
            }}
          >
            Clear
          </BdButton>
          <BdButton
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-3.5" /> Add Payment
          </BdButton>
        </div>
      </BdCard>

      <div className="grid gap-4 sm:grid-cols-3">
        <BdStatCard title="Received" value={formatCurrency(totals.received)} caption="Receipts in view (after TDS)" />
        <BdStatCard title="Refunded" value={formatCurrency(totals.refunded)} caption="Refunds in view" />
        <BdStatCard title="Net Collection" value={formatCurrency(totals.net)} caption="Received minus refunded" />
      </div>

      <BdCard title={`Payments (${total})`} actions={<BdKebab items={[{ label: "Export CSV", onSelect: exportCsv }, { label: "Refresh", onSelect: load }]} />}>
        <BdTableToolbar page={page} totalPages={totalPages} onPage={setPage} search={tableQ} onSearch={setTableQ} pageSize={pageSize} onPageSize={setPageSize} />
        <BdTable minWidth={1300}>
          <thead>
            <tr>
              <BdTh>SR. NO.</BdTh>
              <BdTh>RECEIPT NO.</BdTh>
              <BdTh>DATE</BdTh>
              <BdTh>TYPE</BdTh>
              <BdTh>CUSTOMER</BdTh>
              <BdTh>BOOKING</BdTh>
              <BdTh>PAYMENT FOR</BdTh>
              <BdTh>PAYMENT TYPE</BdTh>
              <BdTh>NET</BdTh>
              <BdTh>TAX</BdTh>
              <BdTh>TDS</BdTh>
              <BdTh>FINAL AMOUNT</BdTh>
              <BdTh>ACTION</BdTh>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <BdEmptyRow colSpan={13} loading={loading} />
            ) : (
              rows.map((p, i) => (
                <tr key={p._id}>
                  <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>
                  <BdTd>{p.receiptNumber ?? "-"}</BdTd>
                  <BdTd className="whitespace-nowrap">{fmt(p.date)}</BdTd>
                  <BdTd>
                    <BdBadge color={p.type === "refund" ? "#e5484d" : "#37a46b"}>{p.type === "refund" ? "REFUND" : "RECEIPT"}</BdBadge>
                  </BdTd>
                  <BdTd>{p.customerName ?? "-"}</BdTd>
                  <BdTd>{p.bookingId?.bookingNumber ?? "-"}</BdTd>
                  <BdTd>{p.paymentFor ?? "-"}</BdTd>
                  <BdTd className="uppercase">{p.paymentType ?? "-"}</BdTd>
                  <BdTd className="whitespace-nowrap">{formatCurrency(p.netAmount ?? 0)}</BdTd>
                  <BdTd className="whitespace-nowrap">{formatCurrency(p.taxAmount ?? 0)}</BdTd>
                  <BdTd className="whitespace-nowrap">{formatCurrency(p.tds ?? 0)}</BdTd>
                  <BdTd className="whitespace-nowrap font-medium">{formatCurrency(p.finalAmount ?? 0)}</BdTd>
                  <BdTd>
                    <BdRowActions
                      items={[
                        { label: "Print Receipt", onSelect: () => printReceipt(p, workspace?.name ?? "Tristar Realtors") },
                        { label: "Edit", onSelect: () => { setEditing(p); setFormOpen(true); } },
                        { label: "Delete", danger: true, onSelect: () => setDel(p) },
                      ]}
                    />
                  </BdTd>
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
      </BdCard>

      <PaymentFormDialog open={formOpen} payment={editing} onClose={() => setFormOpen(false)} onSaved={load} />
      <BdConfirm open={!!del} message={`Delete payment ${del?.receiptNumber ?? ""}?`} onClose={() => setDel(null)} onConfirm={remove} />
    </BdPage>
  );
}
