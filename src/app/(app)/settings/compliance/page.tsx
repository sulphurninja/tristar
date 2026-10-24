"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { BdButton, BdCard, BdField, BdInput, BdPage } from "@/components/bd";
import { useAuth } from "@/contexts/AuthContext";

type Compliance = { companyName?: string; reraNumber?: string; gstNumber?: string; city?: string; state?: string };

export default function CompliancePage() {
  const { workspace, refresh } = useAuth();
  const [form, setForm] = useState({ companyName: "", reraNumber: "", gstNumber: "", city: "", state: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const c = (workspace as { compliance?: Compliance } | null)?.compliance;
    if (c) {
      setForm({
        companyName: c.companyName ?? "",
        reraNumber: c.reraNumber ?? "",
        gstNumber: c.gstNumber ?? "",
        city: c.city ?? "",
        state: c.state ?? "",
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
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error || "Couldn't save compliance.");
      toast.success("Saved");
      await refresh();
    } finally {
      setSaving(false);
    }
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [k]: e.target.value });

  return (
    <BdPage>
      <div>
        <h1 className="text-[20px] font-semibold text-[#2b2f3a]">Compliance</h1>
        <p className="mt-0.5 text-[12.5px] text-[#8b90a0]">These details appear on lead exports, brochures and contracts.</p>
      </div>
      <BdCard className="max-w-3xl">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <BdField label="Registered Company Name" className="sm:col-span-2">
            <BdInput value={form.companyName} onChange={set("companyName")} placeholder="Tristar Realtors Pvt. Ltd." />
          </BdField>
          <BdField label="RERA Number">
            <BdInput value={form.reraNumber} onChange={set("reraNumber")} placeholder="P52100045806" />
          </BdField>
          <BdField label="GSTIN">
            <BdInput value={form.gstNumber} onChange={set("gstNumber")} placeholder="27ABCDE1234F1Z5" />
          </BdField>
          <BdField label="City">
            <BdInput value={form.city} onChange={set("city")} placeholder="Pune" />
          </BdField>
          <BdField label="State">
            <BdInput value={form.state} onChange={set("state")} placeholder="Maharashtra" />
          </BdField>
        </div>
        <div className="mt-5 flex justify-end">
          <BdButton onClick={submit} disabled={saving}>
            <Save className="size-3.5" /> {saving ? "Saving…" : "Save"}
          </BdButton>
        </div>
      </BdCard>
    </BdPage>
  );
}
