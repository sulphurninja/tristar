"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

export default function CompliancePage() {
  const { workspace, refresh } = useAuth();
  const [form, setForm] = useState({
    companyName: "",
    reraNumber: "",
    gstNumber: "",
    city: "",
    state: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workspace?.compliance) {
      setForm({
        companyName: (workspace as { compliance?: { companyName?: string } }).compliance?.companyName ?? "",
        reraNumber: workspace.compliance.reraNumber ?? "",
        gstNumber: (workspace as { compliance?: { gstNumber?: string } }).compliance?.gstNumber ?? "",
        city: (workspace as { compliance?: { city?: string } }).compliance?.city ?? "",
        state: (workspace as { compliance?: { state?: string } }).compliance?.state ?? "",
      });
    }
  }, [workspace]);

  const submit = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/workspace/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't save compliance.");
        return;
      }
      toast.success("Saved");
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5 p-6 lg:p-8">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-5 text-emerald-600" />
        <h1 className="text-[20px] font-bold tracking-tight text-slate-900">
          RERA &amp; Compliance
        </h1>
      </div>
      <p className="text-[12.5px] text-slate-500">
        These details appear on lead exports, brochures and contracts.
      </p>

      <div className="rounded-xl border border-slate-200/70 bg-white p-6 shadow-xs">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Registered company name</Label>
            <Input
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder="Tristar Realtors Pvt. Ltd."
            />
          </div>
          <div className="space-y-1.5">
            <Label>RERA number</Label>
            <Input
              value={form.reraNumber}
              onChange={(e) => setForm({ ...form, reraNumber: e.target.value })}
              placeholder="P52100045806"
            />
          </div>
          <div className="space-y-1.5">
            <Label>GSTIN</Label>
            <Input
              value={form.gstNumber}
              onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
              placeholder="27ABCDE1234F1Z5"
            />
          </div>
          <div className="space-y-1.5">
            <Label>City</Label>
            <Input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Pune"
            />
          </div>
          <div className="space-y-1.5">
            <Label>State / region</Label>
            <Input
              value={form.state}
              onChange={(e) => setForm({ ...form, state: e.target.value })}
              placeholder="Maharashtra"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <Button onClick={submit} loading={saving} className="gap-1.5">
            <Save className="size-4" strokeWidth={1.75} />
            Save changes
          </Button>
        </div>
      </div>
    </div>
  );
}
