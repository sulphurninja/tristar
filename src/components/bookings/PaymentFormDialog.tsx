"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput, BdSelect } from "@/components/bd";
import { BdModal } from "@/components/bd/BdOverlays";
import { formatCurrency } from "@/lib/utils";

export const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "neft", label: "NEFT" },
  { value: "rtgs", label: "RTGS" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

export interface PaymentEditable {
  _id: string;
  type?: string;
  paymentFor?: string;
  date?: string;
  customerName?: string;
  ledgerAccount?: string;
  paymentType?: string;
  bankDetails?: string;
  netAmount?: number;
  tds?: number;
  taxAmount?: number;
  bookingId?: { _id: string; bookingNumber?: string; customerName?: string } | string | null;
}

interface BookingOpt {
  _id: string;
  bookingNumber?: string;
  customerName?: string;
  amount?: number;
  balanceAmount?: number;
}

const idOf = (v: unknown) => (v && typeof v === "object" ? String((v as { _id: string })._id) : v ? String(v) : "");

/** Record / edit a payment (receipt or refund). `bookingId` pre-selects a booking. */
export function PaymentFormDialog({
  open,
  payment,
  bookingId,
  onClose,
  onSaved,
}: {
  open: boolean;
  payment?: PaymentEditable | null;
  bookingId?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [bookings, setBookings] = useState<BookingOpt[]>([]);
  const [ledgers, setLedgers] = useState<Array<{ _id: string; name: string }>>([]);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    type: "receipt",
    bookingId: "",
    customerName: "",
    paymentFor: "",
    date: new Date().toISOString().slice(0, 10),
    paymentType: "neft",
    bankDetails: "",
    ledgerAccount: "",
    netAmount: "",
    taxAmount: "0",
    tds: "0",
  });

  useEffect(() => {
    if (!open) return;
    setF({
      type: payment?.type ?? "receipt",
      bookingId: idOf(payment?.bookingId) || bookingId || "",
      customerName: payment?.customerName ?? "",
      paymentFor: payment?.paymentFor ?? "",
      date: (payment?.date ? new Date(payment.date) : new Date()).toISOString().slice(0, 10),
      paymentType: payment?.paymentType ?? "neft",
      bankDetails: payment?.bankDetails ?? "",
      ledgerAccount: payment?.ledgerAccount ?? "",
      netAmount: payment?.netAmount != null ? String(payment.netAmount) : "",
      taxAmount: String(payment?.taxAmount ?? 0),
      tds: String(payment?.tds ?? 0),
    });
    Promise.all([
      fetch("/api/bookings?limit=200", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/ledger?limit=1000", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([b, l]) => {
        setBookings(b.bookings ?? []);
        setLedgers(l.ledgers ?? []);
      })
      .catch(() => undefined);
  }, [open, payment, bookingId]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const booking = bookings.find((b) => b._id === f.bookingId);
  const { total, final } = useMemo(() => {
    const t = Number(f.netAmount || 0) + Number(f.taxAmount || 0);
    return { total: t, final: t - Number(f.tds || 0) };
  }, [f.netAmount, f.taxAmount, f.tds]);

  const submit = async () => {
    const customerName = f.customerName.trim() || booking?.customerName || "";
    if (!customerName) return toast.error("Customer name is required");
    if (!(Number(f.netAmount) > 0)) return toast.error("Enter a valid net amount");
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        customerName,
        paymentFor: f.paymentFor,
        date: f.date ? new Date(f.date).toISOString() : undefined,
        paymentType: f.paymentType,
        bankDetails: f.bankDetails,
        ledgerAccount: f.ledgerAccount,
        netAmount: Number(f.netAmount),
        taxAmount: Number(f.taxAmount || 0),
        tds: Number(f.tds || 0),
      };
      if (!payment) {
        body.type = f.type;
        body.bookingId = f.bookingId || undefined;
      }
      const res = await fetch(payment ? `/api/payments/${payment._id}` : "/api/payments", {
        method: payment ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(d.error ?? "Could not save payment");
      toast.success(payment ? "Payment updated" : "Payment recorded");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BdModal
      open={open}
      title={payment ? "Edit Payment" : "Add Payment"}
      onClose={onClose}
      width={760}
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
      <div className="grid gap-4 sm:grid-cols-2">
        <BdField label="Type">
          <select value={f.type} onChange={set("type")} disabled={!!payment} className="bd-input">
            <option value="receipt">Receipt</option>
            <option value="refund">Refund</option>
          </select>
        </BdField>
        <BdField label="Booking">
          <BdSelect
            placeholder="Select Booking"
            value={f.bookingId}
            disabled={!!payment}
            onChange={(v) => {
              const b = bookings.find((x) => x._id === v);
              setF((p) => ({ ...p, bookingId: v, customerName: b?.customerName ?? p.customerName }));
            }}
            options={bookings.map((b) => ({ value: b._id, label: `${b.bookingNumber ?? "Booking"} - ${b.customerName ?? ""}` }))}
          />
          {booking?.amount ? (
            <p className="mt-1 text-[12px] text-[#8b90a0]">
              Booking amount {formatCurrency(booking.amount)} | Balance {formatCurrency(booking.balanceAmount ?? 0)}
            </p>
          ) : null}
        </BdField>
        <BdField label="Customer Name *">
          <BdInput value={f.customerName} onChange={set("customerName")} placeholder="Customer name" />
        </BdField>
        <BdField label="Date *">
          <BdInput type="date" value={f.date} onChange={set("date")} />
        </BdField>
        <BdField label="Payment For">
          <BdInput value={f.paymentFor} onChange={set("paymentFor")} placeholder="e.g. Booking amount" />
        </BdField>
        <BdField label="Payment Type">
          <select value={f.paymentType} onChange={set("paymentType")} className="bd-input">
            {PAYMENT_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </BdField>
        <BdField label="Ledger Account">
          <BdSelect placeholder="Select Ledger" value={f.ledgerAccount} onChange={(v) => setF((p) => ({ ...p, ledgerAccount: v }))} options={ledgers.map((l) => ({ value: l.name, label: l.name }))} />
        </BdField>
        <BdField label="Bank Details / Reference">
          <BdInput value={f.bankDetails} onChange={set("bankDetails")} placeholder="Cheque / UTR no, bank" />
        </BdField>
        <BdField label="Net Amount *">
          <BdInput type="number" min={0} value={f.netAmount} onChange={set("netAmount")} placeholder="0" />
        </BdField>
        <BdField label="Tax Amount">
          <BdInput type="number" min={0} value={f.taxAmount} onChange={set("taxAmount")} />
        </BdField>
        <BdField label="TDS">
          <BdInput type="number" min={0} value={f.tds} onChange={set("tds")} />
        </BdField>
        <div className="rounded-[3px] bg-[#f4f6fc] p-3 text-[13px]">
          <div className="flex justify-between">
            <span>Total Amount</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="mt-1 flex justify-between font-medium">
            <span>Final Amount</span>
            <span>{formatCurrency(final)}</span>
          </div>
        </div>
      </div>
    </BdModal>
  );
}
