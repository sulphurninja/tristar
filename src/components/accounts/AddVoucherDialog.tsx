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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { formatCurrency } from "@/lib/utils";

interface LedgerOpt {
  _id: string;
  name: string;
}

const VOUCHER_TYPES = [
  { value: "receipt", label: "Receipt" },
  { value: "payment", label: "Payment" },
  { value: "journal", label: "Journal" },
  { value: "contra", label: "Contra" },
];

const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "cheque", label: "Cheque" },
  { value: "neft", label: "NEFT" },
  { value: "rtgs", label: "RTGS" },
  { value: "upi", label: "UPI" },
  { value: "card", label: "Card" },
  { value: "other", label: "Other" },
];

const TAX_TYPES = [
  { value: "none", label: "None", rate: 0 },
  { value: "gst_5", label: "GST 5%", rate: 5 },
  { value: "gst_12", label: "GST 12%", rate: 12 },
  { value: "gst_18", label: "GST 18%", rate: 18 },
  { value: "gst_28", label: "GST 28%", rate: 28 },
  { value: "igst_18", label: "IGST 18%", rate: 18 },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

export function AddVoucherDialog({ open, onOpenChange, onCreated }: Props) {
  const [ledgers, setLedgers] = useState<LedgerOpt[]>([]);
  const [type, setType] = useState("");
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [paymentMode, setPaymentMode] = useState("");
  const [fromLedgerId, setFromLedgerId] = useState("");
  const [toLedgerId, setToLedgerId] = useState("");
  const [amount, setAmount] = useState("0");
  const [tdsPercent, setTdsPercent] = useState("0");
  const [taxType, setTaxType] = useState("");
  const [narration, setNarration] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType("");
    setDate(new Date());
    setPaymentMode("");
    setFromLedgerId("");
    setToLedgerId("");
    setAmount("0");
    setTdsPercent("0");
    setTaxType("");
    setNarration("");
    fetch("/api/ledger", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLedgers(d.ledgers ?? []));
  }, [open]);

  const amountNum = Number(amount || 0);
  const tdsPct = Number(tdsPercent || 0);
  const tdsAmount = useMemo(
    () => Math.round(((amountNum * tdsPct) / 100) * 100) / 100,
    [amountNum, tdsPct],
  );
  const taxRate = TAX_TYPES.find((t) => t.value === taxType)?.rate ?? 0;
  const taxAmount = useMemo(
    () => Math.round(((amountNum * taxRate) / 100) * 100) / 100,
    [amountNum, taxRate],
  );
  const netAmount = Math.max(amountNum - tdsAmount, 0);
  const totalAmount = netAmount + taxAmount;
  const taxLabel = TAX_TYPES.find((t) => t.value === taxType)?.label ?? "—";

  const submit = async () => {
    if (!type) {
      toast.error("Select voucher details");
      return;
    }
    if (!date) {
      toast.error("Select date");
      return;
    }
    if (!paymentMode) {
      toast.error("Select payment mode");
      return;
    }
    if (!fromLedgerId) {
      toast.error("Select From account");
      return;
    }
    if (!toLedgerId) {
      toast.error("Select To account");
      return;
    }
    if (!(amountNum > 0)) {
      toast.error("Enter a valid amount");
      return;
    }
    if (!narration.trim()) {
      toast.error("Narration is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          date: date.toISOString(),
          paymentMode,
          fromLedgerId,
          toLedgerId,
          ledgerId: fromLedgerId,
          amount: amountNum,
          tdsPercent: tdsPct,
          tdsAmount,
          taxType: taxType || "none",
          taxAmount,
          narration: narration.trim(),
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Failed");
      toast.success("Voucher created");
      onOpenChange(false);
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create voucher");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-4">
          <DialogTitle>Create Voucher</DialogTitle>
        </DialogHeader>

        <div className="grid gap-0 lg:grid-cols-[1fr_240px]">
          <div className="space-y-4 px-6 py-5">
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Voucher Details *" required>
                <Select value={type || undefined} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Voucher Detail" />
                  </SelectTrigger>
                  <SelectContent>
                    {VOUCHER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Date *" required>
                <DatePicker value={date} onChange={setDate} placeholder="Select Date" />
              </Field>
              <Field label="Payment Mode *" required>
                <Select value={paymentMode || undefined} onValueChange={setPaymentMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Payment Mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Account Name (From)">
                <Select value={fromLedgerId || undefined} onValueChange={setFromLedgerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select From Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {ledgers.length === 0 ? (
                      <SelectItem value="__none" disabled>
                        No ledgers — create one first
                      </SelectItem>
                    ) : (
                      ledgers.map((l) => (
                        <SelectItem key={l._id} value={l._id}>
                          {l.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Account Name (To)">
                <Select value={toLedgerId || undefined} onValueChange={setToLedgerId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select or Search To Account" />
                  </SelectTrigger>
                  <SelectContent>
                    {ledgers.map((l) => (
                      <SelectItem key={l._id} value={l._id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Amount">
                <Input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="TDS (%)">
                <Input
                  type="number"
                  value={tdsPercent}
                  onChange={(e) => setTdsPercent(e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="TDS Amount">
                <Input type="number" value={String(tdsAmount)} readOnly className="bg-slate-50" />
              </Field>
              <Field label="Tax Type">
                <Select value={taxType || undefined} onValueChange={setTaxType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Tax Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {TAX_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Narration *" required>
              <Textarea
                rows={4}
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                placeholder="Narration"
              />
            </Field>
          </div>

          <aside className="border-t border-slate-100 bg-slate-50/80 px-5 py-5 lg:border-l lg:border-t-0">
            <h3 className="text-[13px] font-semibold text-slate-900">Voucher Snapshot</h3>
            <dl className="mt-4 space-y-3 text-[13px]">
              <SnapRow label="Net Amount" value={formatCurrency(netAmount)} />
              <SnapRow label="Tax Details" value={taxType ? taxLabel : "—"} muted={!taxType} />
              <SnapRow label="Tax Amount" value={formatCurrency(taxAmount)} />
              <div className="border-t border-slate-200 pt-3">
                <SnapRow label="Total Amount" value={formatCurrency(totalAmount)} strong />
              </div>
            </dl>
          </aside>
        </div>

        <DialogFooter className="border-t border-slate-100 px-6 py-3">
          <Button onClick={submit} disabled={saving}>
            {saving ? "Creating…" : "Create Voucher"}
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

function Field({
  label,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px] font-semibold text-slate-700">{label}</Label>
      {children}
    </div>
  );
}

function SnapRow({
  label,
  value,
  strong,
  muted,
}: {
  label: string;
  value: string;
  strong?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd
        className={
          strong
            ? "text-right text-[15px] font-bold tabular-nums text-slate-900"
            : muted
              ? "text-right text-slate-400"
              : "text-right font-semibold tabular-nums text-slate-800"
        }
      >
        {value}
      </dd>
    </div>
  );
}
