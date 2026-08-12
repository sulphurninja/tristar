"use client";

import { useEffect, useState } from "react";
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

const GROUPS = [
  { value: "customer", label: "Sundry Debtors (Customer)" },
  { value: "vendor", label: "Sundry Creditors (Vendor)" },
  { value: "broker", label: "Channel Partner / Broker" },
  { value: "bank", label: "Bank Accounts" },
  { value: "cash", label: "Cash-in-hand" },
  { value: "direct_income", label: "Direct Income" },
  { value: "direct_expense", label: "Direct Expenses" },
  { value: "indirect_income", label: "Indirect Income" },
  { value: "indirect_expense", label: "Indirect Expenses" },
  { value: "other", label: "Other" },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
}

export function AddLedgerDialog({ open, onOpenChange, onCreated }: Props) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [group, setGroup] = useState("");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [gstNo, setGstNo] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("");
    setMobile("");
    setEmail("");
    setGroup("");
    setOpeningBalance("0");
    setGstNo("");
  }, [open]);

  const submit = async () => {
    if (!name.trim()) {
      toast.error("Ledger name is required");
      return;
    }
    if (!group) {
      toast.error("Select a group");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          mobile: mobile.trim() || undefined,
          email: email.trim() || undefined,
          type: group,
          openingBalance: Number(openingBalance || 0),
          gstNo: gstNo.trim() || undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? "Failed to create ledger");
      toast.success("Ledger created");
      onOpenChange(false);
      onCreated?.();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create ledger");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto p-0">
        <DialogHeader className="border-b border-slate-100 px-6 py-4">
          <DialogTitle>Create Ledger</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="Ledger Name">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ledger Name"
            />
          </Field>
          <Field label="Ledger Contact">
            <Input
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              placeholder="Phone number (9767654343)"
            />
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email - abc@xyz.com"
            />
          </Field>
          <Field label="Group">
            <Select value={group || undefined} onValueChange={setGroup}>
              <SelectTrigger>
                <SelectValue placeholder="Select Group" />
              </SelectTrigger>
              <SelectContent>
                {GROUPS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Opening Balance">
            <Input
              type="number"
              value={openingBalance}
              onChange={(e) => setOpeningBalance(e.target.value)}
              placeholder="0"
            />
          </Field>
          <Field label="GST No.">
            <Input
              value={gstNo}
              onChange={(e) => setGstNo(e.target.value.toUpperCase())}
              placeholder="G.S.T. No."
            />
          </Field>
        </div>

        <DialogFooter className="border-t border-slate-100 px-6 py-3">
          <Button onClick={submit} disabled={saving}>
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[12.5px] font-semibold text-slate-700">{label}</Label>
      {children}
    </div>
  );
}
