"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput } from "@/components/bd";
import { BdModal, BdTextarea } from "@/components/bd/BdOverlays";

export interface CompanyRow {
  _id: string;
  companyId: number;
  name: string;
  owner?: string;
  mobile?: string;
  email?: string;
  category?: string;
  reraNumber?: string;
  address?: string;
  cpCount?: number;
}

export const CP_CATEGORIES = ["Individual", "Firm", "Developer", "Corporate", "Other"];

/** Add / Edit Channel Partner Company. Pass `company` to edit. */
export function CompanyDialog({
  open,
  company,
  onClose,
  onSaved,
}: {
  open: boolean;
  company?: CompanyRow | null;
  onClose: () => void;
  onSaved: (c: CompanyRow) => void;
}) {
  const [f, setF] = useState({ name: "", owner: "", mobile: "", email: "", category: "", reraNumber: "", address: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({
      name: company?.name ?? "",
      owner: company?.owner ?? "",
      mobile: company?.mobile ?? "",
      email: company?.email ?? "",
      category: company?.category ?? "",
      reraNumber: company?.reraNumber ?? "",
      address: company?.address ?? "",
    });
  }, [open, company]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!f.name.trim()) return toast.error("Company name is required");
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) return toast.error("Enter a valid email");
    setSaving(true);
    try {
      const res = await fetch(company ? `/api/cp-companies/${company._id}` : "/api/cp-companies", {
        method: company ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(d.error ?? "Could not save company");
      toast.success(company ? "Company updated" : "Company added");
      onSaved(d.company);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BdModal
      open={open}
      title={company ? "Edit Company" : "Add Company"}
      onClose={onClose}
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
        <BdField label="Company Name *" className="sm:col-span-2">
          <BdInput value={f.name} onChange={set("name")} placeholder="Company name" autoFocus />
        </BdField>
        <BdField label="Owner">
          <BdInput value={f.owner} onChange={set("owner")} placeholder="Owner name" />
        </BdField>
        <BdField label="Mobile">
          <BdInput value={f.mobile} onChange={set("mobile")} placeholder="+91-" />
        </BdField>
        <BdField label="Email">
          <BdInput type="email" value={f.email} onChange={set("email")} placeholder="Email" />
        </BdField>
        <BdField label="Category">
          <select value={f.category} onChange={set("category")} className="bd-input">
            <option value="">Select Category</option>
            {CP_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {f.category && !CP_CATEGORIES.includes(f.category) ? <option value={f.category}>{f.category}</option> : null}
          </select>
        </BdField>
        <BdField label="RERA Number" className="sm:col-span-2">
          <BdInput value={f.reraNumber} onChange={set("reraNumber")} placeholder="RERA number" />
        </BdField>
        <BdField label="Address" className="sm:col-span-2">
          <BdTextarea value={f.address} onChange={set("address")} placeholder="Address" />
        </BdField>
      </div>
    </BdModal>
  );
}
