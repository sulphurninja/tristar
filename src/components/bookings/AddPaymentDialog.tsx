"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils";

const NONE = "__none";

const PAYMENT_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "neft", label: "NEFT" },
  { value: "rtgs", label: "RTGS" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

interface BookingOpt {
  _id: string;
  bookingNumber?: string;
  customerName?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

function defaultDateLocal() {
  return new Date().toISOString().slice(0, 10);
}

export function AddPaymentDialog({ open, onOpenChange, onCreated }: Props) {
  const [bookings, setBookings] = useState<BookingOpt[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [netAmount, setNetAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("0");
  const [tds, setTds] = useState("0");
  const [paymentType, setPaymentType] = useState("neft");
  const [type, setType] = useState("receipt");
  const [paymentFor, setPaymentFor] = useState("");
  const [bookingId, setBookingId] = useState("");
  const [date, setDate] = useState(defaultDateLocal);
  const [bankDetails, setBankDetails] = useState("");
  const [ledgerAccount, setLedgerAccount] = useState("");
  const [saving, setSaving] = useState(false);

  const { totalAmount, finalAmount } = useMemo(() => {
    const net = Number(netAmount || 0);
    const tax = Number(taxAmount || 0);
    const tdsVal = Number(tds || 0);
    const total = net + tax;
    return { totalAmount: total, finalAmount: total - tdsVal };
  }, [netAmount, taxAmount, tds]);

  useEffect(() => {
    if (!open) return;
    setCustomerName("");
    setNetAmount("");
    setTaxAmount("0");
    setTds("0");
    setPaymentType("neft");
    setType("receipt");
    setPaymentFor("");
    setBookingId("");
    setDate(defaultDateLocal());
    setBankDetails("");
    setLedgerAccount("");

    fetch("/api/bookings?limit=50", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setBookings(d.bookings ?? []))
      .catch(() => {});
  }, [open]);

  const submit = async () => {
    if (!customerName.trim()) {
      toast.error("Customer name is required");
      return;
    }
    if (!netAmount || Number(netAmount) <= 0) {
      toast.error("Enter a valid net amount");
      return;
    }
    setSaving(true);
    try {
      const net = Number(netAmount);
      const tax = Number(taxAmount || 0);
      const tdsVal = Number(tds || 0);
      const total = net + tax;
      const final = total - tdsVal;

      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          netAmount: net,
          taxAmount: tax,
          tds: tdsVal,
          totalAmount: total,
          finalAmount: final,
          paymentType,
          type,
          paymentFor: paymentFor.trim() || undefined,
          bookingId: bookingId || undefined,
          date: date ? new Date(date).toISOString() : undefined,
          bankDetails: bankDetails.trim() || undefined,
          ledgerAccount: ledgerAccount.trim() || undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Failed to record payment");
      toast.success("Payment recorded");
      onOpenChange(false);
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to record payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl p-0">
        <DialogHeader className="border-b border-slate-100 px-5 py-4">
          <DialogTitle className="text-[16px] font-semibold text-slate-800">
            Add payment
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[min(70vh,640px)] space-y-3 overflow-y-auto px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Customer name *</Label>
              <Input
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="Customer name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Net amount *</Label>
              <Input
                type="number"
                value={netAmount}
                onChange={(e) => setNetAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receipt">Receipt</SelectItem>
                  <SelectItem value="payment">Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Payment mode</Label>
              <Select value={paymentType} onValueChange={setPaymentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAYMENT_TYPES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Payment for</Label>
              <Input
                value={paymentFor}
                onChange={(e) => setPaymentFor(e.target.value)}
                placeholder="e.g. Booking advance"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Booking</Label>
            <Select
              value={bookingId || NONE}
              onValueChange={(v) => setBookingId(v === NONE ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {bookings.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.bookingNumber ?? b._id.slice(-6)}
                    {b.customerName ? ` · ${b.customerName}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Tax</Label>
              <Input
                type="number"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>TDS</Label>
              <Input
                type="number"
                value={tds}
                onChange={(e) => setTds(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ledger account</Label>
              <Input
                value={ledgerAccount}
                onChange={(e) => setLedgerAccount(e.target.value)}
                placeholder="Account name"
              />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-slate-50/80 px-3 py-2.5 text-[13px] text-slate-600">
            <div className="flex justify-between">
              <span>Total amount</span>
              <span className="font-medium tabular-nums text-slate-800">
                {formatCurrency(totalAmount)}
              </span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Final amount</span>
              <span className="font-medium tabular-nums text-emerald-700">
                {formatCurrency(finalAmount)}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Bank details</Label>
            <Input
              value={bankDetails}
              onChange={(e) => setBankDetails(e.target.value)}
              placeholder="Cheque / UTR / reference"
            />
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          <Button onClick={submit} disabled={saving} className="min-w-24">
            {saving ? "Saving…" : "Submit"}
          </Button>
          <DialogClose asChild>
            <Button variant="secondary" disabled={saving}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
