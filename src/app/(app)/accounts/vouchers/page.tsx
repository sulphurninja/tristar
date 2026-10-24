"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
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
import { VoucherFormDialog, VOUCHER_TYPES, type VoucherEditable } from "@/components/accounts/VoucherFormDialog";
import { PAYMENT_MODES } from "@/components/bookings/PaymentFormDialog";
import { toCsv, downloadCsv } from "@/lib/bd-csv";
import { formatCurrency } from "@/lib/utils";

interface VoucherRow extends VoucherEditable {
  totalAmount?: number;
  tdsAmount?: number;
  taxAmount?: number;
  fromLedgerId?: { _id: string; name?: string } | null;
  toLedgerId?: { _id: string; name?: string } | null;
}

interface Filters {
  type: string;
  paymentMode: string;
  from: string;
  to: string;
  q: string;
}
const EMPTY: Filters = { type: "", paymentMode: "", from: "", to: "", q: "" };
const TYPE_COLOR: Record<string, string> = { receipt: "#37a46b", payment: "#e5484d", journal: "#3a5dc2", contra: "#8a6de0" };
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

function VouchersInner() {
  const sp = useSearchParams();
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [rows, setRows] = useState<VoucherRow[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Array<{ _id: string; n: number; total: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [tableQ, setTableQ] = useState("");
  const [tableQd, setTableQd] = useState("");
  const [formOpen, setFormOpen] = useState(sp.get("new") === "1");
  const [editing, setEditing] = useState<VoucherRow | null>(null);
  const [del, setDel] = useState<VoucherRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setTableQd(tableQ), 300);
    return () => clearTimeout(t);
  }, [tableQ]);

  const query = useCallback(
    (extra?: Record<string, string>) => {
      const u = new URLSearchParams();
      if (applied.type) u.set("type", applied.type);
      if (applied.paymentMode) u.set("paymentMode", applied.paymentMode);
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
    fetch(`/api/vouchers?${query({ limit: String(pageSize), skip: String((page - 1) * pageSize) })}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.vouchers ?? []);
        setTotal(d.total ?? 0);
        setSummary(d.summary ?? []);
      })
      .catch(() => toast.error("Could not load vouchers"))
      .finally(() => setLoading(false));
  }, [query, page, pageSize]);

  useEffect(load, [load]);
  useEffect(() => setPage(1), [applied, tableQd, pageSize]);

  const remove = async () => {
    if (!del) return;
    const res = await fetch(`/api/vouchers/${del._id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not delete voucher");
    toast.success("Voucher deleted");
    setDel(null);
    load();
  };

  const exportCsv = async () => {
    const t = toast.loading("Preparing export…");
    try {
      const d = await fetch(`/api/vouchers?${query({ export: "1" })}`, { cache: "no-store" }).then((r) => r.json());
      const list: VoucherRow[] = d.vouchers ?? [];
      downloadCsv(
        "vouchers.csv",
        toCsv(
          ["Voucher No", "Date", "Type", "Payment Mode", "From (Cr)", "To (Dr)", "Amount", "TDS", "Tax", "Total", "Narration"],
          list.map((v) => [v.voucherNumber ?? "", fmt(v.date), v.type ?? "", v.paymentMode ?? "", v.fromLedgerId?.name ?? "", v.toLedgerId?.name ?? "", v.amount ?? 0, v.tdsAmount ?? 0, v.taxAmount ?? 0, v.totalAmount ?? v.amount ?? 0, v.narration ?? ""]),
        ),
      );
      toast.success(`Exported ${list.length} vouchers`, { id: t });
    } catch {
      toast.error("Export failed", { id: t });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const sum = (t: string) => summary.find((s) => s._id === t);
  const toggle = (t: string) => {
    const next = applied.type === t ? "" : t;
    setDraft((d) => ({ ...d, type: next }));
    setApplied((a) => ({ ...a, type: next }));
  };

  return (
    <BdPage>
      <BdCard title="Vouchers">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <BdField label="Voucher Details">
            <BdSelect placeholder="Select Voucher Type" value={draft.type} onChange={(v) => setDraft((d) => ({ ...d, type: v }))} options={VOUCHER_TYPES} />
          </BdField>
          <BdField label="Payment Mode">
            <BdSelect placeholder="Select Payment Mode" value={draft.paymentMode} onChange={(v) => setDraft((d) => ({ ...d, paymentMode: v }))} options={PAYMENT_MODES} />
          </BdField>
          <BdField label="From">
            <input type="date" className="bd-input" value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
          </BdField>
          <BdField label="To">
            <input type="date" className="bd-input" value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
          </BdField>
          <BdField label="Search">
            <input className="bd-input" placeholder="Voucher no., narration" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && setApplied(draft)} />
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
            <Plus className="size-3.5" /> Create Voucher
          </BdButton>
        </div>
      </BdCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {VOUCHER_TYPES.map((t) => (
          <BdStatCard key={t.value} title={`${t.label} Vouchers`} value={formatCurrency(sum(t.value)?.total ?? 0)} caption={`${sum(t.value)?.n ?? 0} voucher${sum(t.value)?.n === 1 ? "" : "s"}`} active={applied.type === t.value} onClick={() => toggle(t.value)} />
        ))}
      </div>

      <BdCard title={`Vouchers (${total})`} actions={<BdKebab items={[{ label: "Export CSV", onSelect: exportCsv }, { label: "Refresh", onSelect: load }]} />}>
        <BdTableToolbar page={page} totalPages={totalPages} onPage={setPage} search={tableQ} onSearch={setTableQ} pageSize={pageSize} onPageSize={setPageSize} />
        <BdTable minWidth={1200}>
          <thead>
            <tr>
              <BdTh>SR. NO.</BdTh>
              <BdTh>VOUCHER NO.</BdTh>
              <BdTh>DATE</BdTh>
              <BdTh>TYPE</BdTh>
              <BdTh>FROM (CR)</BdTh>
              <BdTh>TO (DR)</BdTh>
              <BdTh>MODE</BdTh>
              <BdTh className="text-right">AMOUNT</BdTh>
              <BdTh className="text-right">TDS</BdTh>
              <BdTh className="text-right">TAX</BdTh>
              <BdTh className="text-right">TOTAL</BdTh>
              <BdTh>NARRATION</BdTh>
              <BdTh>ACTION</BdTh>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <BdEmptyRow colSpan={13} loading={loading} />
            ) : (
              rows.map((v, i) => (
                <tr key={v._id}>
                  <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>
                  <BdTd>{v.voucherNumber ?? "-"}</BdTd>
                  <BdTd className="whitespace-nowrap">{fmt(v.date)}</BdTd>
                  <BdTd>
                    <BdBadge color={TYPE_COLOR[v.type ?? "receipt"]}>{(v.type ?? "").toUpperCase()}</BdBadge>
                  </BdTd>
                  <BdTd>{v.fromLedgerId?.name ?? "-"}</BdTd>
                  <BdTd>{v.toLedgerId?.name ?? "-"}</BdTd>
                  <BdTd className="uppercase">{v.paymentMode}</BdTd>
                  <BdTd className="whitespace-nowrap text-right">{formatCurrency(v.amount ?? 0)}</BdTd>
                  <BdTd className="whitespace-nowrap text-right">{formatCurrency(v.tdsAmount ?? 0)}</BdTd>
                  <BdTd className="whitespace-nowrap text-right">{formatCurrency(v.taxAmount ?? 0)}</BdTd>
                  <BdTd className="whitespace-nowrap text-right font-medium">{formatCurrency(v.totalAmount ?? v.amount ?? 0)}</BdTd>
                  <BdTd className="max-w-[260px] truncate" >{v.narration ?? "-"}</BdTd>
                  <BdTd>
                    <BdRowActions
                      items={[
                        { label: "Edit", onSelect: () => { setEditing(v); setFormOpen(true); } },
                        { label: "Delete", danger: true, onSelect: () => setDel(v) },
                      ]}
                    />
                  </BdTd>
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
      </BdCard>

      <VoucherFormDialog open={formOpen} voucher={editing} onClose={() => setFormOpen(false)} onSaved={load} />
      <BdConfirm open={!!del} message={`Delete voucher ${del?.voucherNumber ?? ""}? Ledger balances will be recalculated.`} onClose={() => setDel(null)} onConfirm={remove} />
    </BdPage>
  );
}

export default function VouchersPage() {
  return (
    <Suspense fallback={null}>
      <VouchersInner />
    </Suspense>
  );
}
