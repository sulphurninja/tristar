"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput } from "@/components/bd";
import { BdModal } from "@/components/bd/BdOverlays";

export const LEDGER_GROUP_OPTIONS = [
  { value: "customer", label: "Customer" },
  { value: "vendor", label: "Vendor" },
  { value: "broker", label: "Broker" },
  { value: "bank", label: "Bank" },
  { value: "cash", label: "Cash" },
  { value: "direct_income", label: "Direct Income" },
  { value: "direct_expense", label: "Direct Expense" },
  { value: "indirect_income", label: "Indirect Income" },
  { value: "indirect_expense", label: "Indirect Expense" },
  { value: "other", label: "Other" },
];

export interface LedgerEditable {
  _id: string;
  name: string;
  mobile?: string;
  email?: string;
  gstNo?: string;
  type?: string;
  openingBalance?: number;
}

export function LedgerFormDialog({
  open,
  ledger,
  onClose,
  onSaved,
}: {
  open: boolean;
  ledger?: LedgerEditable | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({ name: "", mobile: "", email: "", gstNo: "", type: "customer", openingBalance: "0" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({
      name: ledger?.name ?? "",
      mobile: ledger?.mobile ?? "",
      email: ledger?.email ?? "",
      gstNo: ledger?.gstNo ?? "",
      type: ledger?.type ?? "customer",
      openingBalance: String(ledger?.openingBalance ?? 0),
    });
  }, [open, ledger]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!f.name.trim()) return toast.error("Ledger name is required");
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) return toast.error("Enter a valid email");
    if (Number.isNaN(Number(f.openingBalance))) return toast.error("Opening balance must be a number");
    setSaving(true);
    try {
      const res = await fetch(ledger ? `/api/ledger/${ledger._id}` : "/api/ledger", {
        method: ledger ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...f, openingBalance: Number(f.openingBalance || 0) }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(d.error ?? "Could not save ledger");
      toast.success(ledger ? "Ledger updated" : "Ledger created");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BdModal
      open={open}
      title={ledger ? "Edit Ledger" : "Add Ledger"}
      onClose={onClose}
      width={640}
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
        <BdField label="Ledger Name *" className="sm:col-span-2">
          <BdInput value={f.name} onChange={set("name")} placeholder="Ledger name" autoFocus />
        </BdField>
        <BdField label="Ledger Contact">
          <BdInput value={f.mobile} onChange={set("mobile")} placeholder="Mobile" />
        </BdField>
        <BdField label="Email">
          <BdInput type="email" value={f.email} onChange={set("email")} placeholder="Email" />
        </BdField>
        <BdField label="Group">
          <select value={f.type} onChange={set("type")} className="bd-input">
            {LEDGER_GROUP_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </BdField>
        <BdField label="Opening Balance (Dr + / Cr -)">
          <BdInput type="number" value={f.openingBalance} onChange={set("openingBalance")} />
        </BdField>
        <BdField label="GST No.">
          <BdInput value={f.gstNo} onChange={set("gstNo")} placeholder="GSTIN" />
        </BdField>
      </div>
    </BdModal>
  );
}
