"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}

export function NewBrokerSheet({ open, onOpenChange, onCreated }: Props) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    firmName: "",
    phone: "",
    email: "",
    reraNumber: "",
    panNumber: "",
    gstNumber: "",
    city: "",
    notes: "",
  });

  const submit = async () => {
    if (!form.name || !form.phone) {
      toast.error("Name and phone are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/brokers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          firmName: form.firmName || undefined,
          phone: form.phone,
          email: form.email || undefined,
          rera: form.reraNumber ? { number: form.reraNumber } : undefined,
          panNumber: form.panNumber || undefined,
          gstNumber: form.gstNumber || undefined,
          location: { city: form.city || undefined, country: "IN" },
          notes: form.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error || "Couldn't add broker.");
        return;
      }
      toast.success("Broker added");
      onOpenChange(false);
      onCreated();
      setForm({
        name: "",
        firmName: "",
        phone: "",
        email: "",
        reraNumber: "",
        panNumber: "",
        gstNumber: "",
        city: "",
        notes: "",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="lg">
        <SheetHeader>
          <SheetTitle>Add channel partner</SheetTitle>
          <SheetDescription>
            Onboard a broker. We&apos;ll auto-generate a CP code and create their profile.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Full name" required>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Rohan Mehta"
              />
            </Field>
            <Field label="Firm name">
              <Input
                value={form.firmName}
                onChange={(e) => setForm({ ...form, firmName: e.target.value })}
                placeholder="Mehta Realty"
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone" required>
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
                inputMode="tel"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="rohan@mehtarealty.in"
              />
            </Field>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Field label="RERA number">
              <Input
                value={form.reraNumber}
                onChange={(e) => setForm({ ...form, reraNumber: e.target.value })}
                placeholder="A51800018000"
              />
            </Field>
            <Field label="PAN">
              <Input
                value={form.panNumber}
                onChange={(e) => setForm({ ...form, panNumber: e.target.value })}
                placeholder="AABCM1234E"
              />
            </Field>
            <Field label="GST">
              <Input
                value={form.gstNumber}
                onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                placeholder="27AABCM1234E1Z5"
              />
            </Field>
          </div>

          <Field label="City">
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Mumbai"
            />
          </Field>

          <Field label="Notes">
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Any context — projects they specialize in, payment terms, etc."
            />
          </Field>
        </SheetBody>
        <SheetFooter>
          <SheetClose asChild>
            <Button variant="ghost">Cancel</Button>
          </SheetClose>
          <Button onClick={submit} loading={saving}>
            Add broker
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-[12px] font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </Label>
      {children}
    </div>
  );
}
