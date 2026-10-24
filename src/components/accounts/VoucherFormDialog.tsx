"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput, BdSelect } from "@/components/bd";
import { BdModal, BdTextarea } from "@/components/bd/BdOverlays";
import { PAYMENT_MODES } from "@/components/bookings/PaymentFormDialog";
import { formatCurrency } from "@/lib/utils";

export const VOUCHER_TYPES = [
  { value: "receipt", label: "Receipt" },
  { value: "payment", label: "Payment" },
  { value: "journal", label: "Journal" },
  { value: "contra", label: "Contra" },
];

export const TAX_TYPES = [
  { value: "none", label: "None", rate: 0 },
  { value: "gst_5", label: "GST 5%", rate: 5 },
  { value: "gst_12", label: "GST 12%", rate: 12 },
  { value: "gst_18", label: "GST 18%", rate: 18 },
  { value: "gst_28", label: "GST 28%", rate: 28 },
  { value: "igst_18", label: "IGST 18%", rate: 18 },
];

export interface VoucherEditable {
  _id: string;
  voucherNumber?: string;
  type?: string;
  date?: string;
  paymentMode?: string;
  fromLedgerId?: { _id: string; name?: string } | string | null;
  toLedgerId?: { _id: string; name?: string } | string | null;
  amount?: number;
  tdsPercent?: number;
  taxType?: string;
  narration?: string;
}

const idOf = (v: unknown) => (v && typeof v === "object" ? String((v as { _id: string })._id) : v ? String(v) : "");

/** Create / edit a voucher. The "To" account is debited and the "From" account credited by the posted total. */
export function VoucherFormDialog({
  open,
  voucher,
  onClose,
  onSaved,
}: {
  open: boolean;
  voucher?: VoucherEditable | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [ledgers, setLedgers] = useState<Array<{ _id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({ type: "receipt", date: "", paymentMode: "neft", fromLedgerId: "", toLedgerId: "", amount: "", tdsPercent: "0", taxType: "none", narration: "" });

  useEffect(() => {
    if (!open) return;
    setF({
      type: voucher?.type ?? "receipt",
      date: (voucher?.date ? new Date(voucher.date) : new Date()).toISOString().slice(0, 10),
      paymentMode: voucher?.paymentMode ?? "neft",
      fromLedgerId: idOf(voucher?.fromLedgerId),
      toLedgerId: idOf(voucher?.toLedgerId),
      amount: voucher?.amount != null ? String(voucher.amount) : "",
      tdsPercent: String(voucher?.tdsPercent ?? 0),
      taxType: voucher?.taxType ?? "none",
      narration: voucher?.narration ?? "",
    });
    fetch("/api/ledger?limit=1000", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLedgers(d.ledgers ?? []))
      .catch(() => undefined);
  }, [open, voucher]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const calc = useMemo(() => {
    const a = Number(f.amount || 0);
    const tds = Math.round(((a * Number(f.tdsPercent || 0)) / 100) * 100) / 100;
    const rate = TAX_TYPES.find((t) => t.value === f.taxType)?.rate ?? 0;
    const tax = Math.round(((a * rate) / 100) * 100) / 100;
    return { tds, tax, total: a - tds + tax };
  }, [f.amount, f.tdsPercent, f.taxType]);

  const submit = async () => {
    if (!f.fromLedgerId) return toast.error("Select From account");
    if (!f.toLedgerId) return toast.error("Select To account");
    if (f.fromLedgerId === f.toLedgerId) return toast.error("From and To accounts must be different");
    if (!(Number(f.amount) > 0)) return toast.error("Enter a valid amount");
    if (!f.narration.trim()) return toast.error("Narration is required");
    setSaving(true);
    try {
      const res = await fetch(voucher ? `/api/vouchers/${voucher._id}` : "/api/vouchers", {
        method: voucher ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, date: f.date ? new Date(f.date).toISOString() : undefined, amount: Number(f.amount), tdsPercent: Number(f.tdsPercent || 0) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(d.error ?? "Could not save voucher");
      toast.success(voucher ? "Voucher updated" : "Voucher created");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const opts = ledgers.map((l) => ({ value: l._id, label: l.name }));

  return (
    <BdModal
      open={open}
      title={voucher ? `Edit Voucher ${voucher.voucherNumber ?? ""}` : "Create Voucher"}
      onClose={onClose}
      width={860}
      footer={
        <>
          <BdButton variant="light" onClick={onClose}>
            Cancel
          </BdButton>
          <BdButton disabled={saving} onClick={submit}>
            {saving ? "Saving…" : "Save"}
          </BdButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <BdField label="Voucher Details *">
          <select value={f.type} onChange={set("type")} className="bd-input">
            {VOUCHER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </BdField>
        <BdField label="Date *">
          <BdInput type="date" value={f.date} onChange={set("date")} />
        </BdField>
        <BdField label="Payment Mode *">
          <select value={f.paymentMode} onChange={set("paymentMode")} className="bd-input">
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </BdField>
        <BdField label="Account Name (From) - Credit" className="sm:col-span-1">
          <BdSelect placeholder="Select Account" value={f.fromLedgerId} onChange={(v) => setF((p) => ({ ...p, fromLedgerId: v }))} options={opts} />
        </BdField>
        <BdField label="Account Name (To) - Debit">
          <BdSelect placeholder="Select Account" value={f.toLedgerId} onChange={(v) => setF((p) => ({ ...p, toLedgerId: v }))} options={opts} />
        </BdField>
        <BdField label="Amount *">
          <BdInput type="number" min={0} value={f.amount} onChange={set("amount")} placeholder="0" />
        </BdField>
        <BdField label="TDS (%)">
          <BdInput type="number" min={0} max={100} value={f.tdsPercent} onChange={set("tdsPercent")} />
        </BdField>
        <BdField label="TDS Amount">
          <BdInput value={calc.tds.toFixed(2)} readOnly />
        </BdField>
        <BdField label="Tax Type">
          <select value={f.taxType} onChange={set("taxType")} className="bd-input">
            {TAX_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </BdField>
        <BdField label="Narration *" className="sm:col-span-3">
          <BdTextarea value={f.narration} onChange={set("narration")} placeholder="Narration" />
        </BdField>
        <div className="rounded-[3px] bg-[#f4f6fc] p-3 text-[13px] sm:col-span-3">
          <div className="grid gap-1 sm:grid-cols-4">
            <span>Net Amount: {formatCurrency(Number(f.amount || 0) - calc.tds)}</span>
            <span>Tax Amount: {formatCurrency(calc.tax)}</span>
            <span className="font-medium sm:col-span-2">Total Amount (posted): {formatCurrency(calc.total)}</span>
          </div>
        </div>
      </div>
    </BdModal>
  );
}
