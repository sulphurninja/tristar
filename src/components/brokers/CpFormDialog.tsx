"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput, BdSelect } from "@/components/bd";
import { BdModal, BdTextarea } from "@/components/bd/BdOverlays";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { CompanyDialog, type CompanyRow } from "@/components/brokers/CompanyDialog";

export const CP_STAGES = ["Open", "Contacted", "Interested", "Empanelled", "Dormant", "Closed"];

export interface CpEditable {
  _id: string;
  name: string;
  phone: string;
  altPhone?: string;
  email?: string;
  stage?: string;
  companyId?: string | { _id: string } | null;
  sourcingManagerId?: string | { _id: string } | null;
  rera?: { number?: string };
  panNumber?: string;
  gstNumber?: string;
  location?: { addressLine?: string; city?: string; state?: string; pincode?: string };
  notes?: string;
}

const idOf = (v: unknown) => (v && typeof v === "object" ? String((v as { _id: string })._id) : v ? String(v) : "");

/** Add / Edit Channel Partner. Pass `broker` to edit, `defaultCompanyId` to preselect a company. */
export function CpFormDialog({
  open,
  broker,
  defaultCompanyId,
  onClose,
  onSaved,
}: {
  open: boolean;
  broker?: CpEditable | null;
  defaultCompanyId?: string;
  onClose: () => void;
  onSaved: (id?: string) => void;
}) {
  const { users } = useDirectory();
  const [companies, setCompanies] = useState<CompanyRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [newCompany, setNewCompany] = useState(false);
  const [f, setF] = useState({
    name: "",
    phone: "",
    altPhone: "",
    email: "",
    stage: "Open",
    companyId: "",
    sourcingManagerId: "",
    reraNumber: "",
    panNumber: "",
    gstNumber: "",
    addressLine: "",
    city: "",
    state: "",
    pincode: "",
    notes: "",
  });

  const loadCompanies = () =>
    fetch("/api/cp-companies?limit=500", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies ?? []))
      .catch(() => undefined);

  useEffect(() => {
    if (!open) return;
    loadCompanies();
    setF({
      name: broker?.name ?? "",
      phone: broker?.phone ?? "",
      altPhone: broker?.altPhone ?? "",
      email: broker?.email ?? "",
      stage: broker?.stage ?? "Open",
      companyId: idOf(broker?.companyId) || defaultCompanyId || "",
      sourcingManagerId: idOf(broker?.sourcingManagerId),
      reraNumber: broker?.rera?.number ?? "",
      panNumber: broker?.panNumber ?? "",
      gstNumber: broker?.gstNumber ?? "",
      addressLine: broker?.location?.addressLine ?? "",
      city: broker?.location?.city ?? "",
      state: broker?.location?.state ?? "",
      pincode: broker?.location?.pincode ?? "",
      notes: broker?.notes ?? "",
    });
  }, [open, broker, defaultCompanyId]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!f.name.trim()) return toast.error("Contact person is required");
    if (!f.phone.trim()) return toast.error("Mobile is required");
    if (f.email.trim() && !/^\S+@\S+\.\S+$/.test(f.email.trim())) return toast.error("Enter a valid email");
    setSaving(true);
    try {
      const payload = {
        name: f.name,
        phone: f.phone,
        altPhone: f.altPhone,
        email: f.email,
        stage: f.stage,
        companyId: f.companyId,
        sourcingManagerId: f.sourcingManagerId,
        rera: { number: f.reraNumber },
        panNumber: f.panNumber,
        gstNumber: f.gstNumber,
        location: { addressLine: f.addressLine, city: f.city, state: f.state, pincode: f.pincode },
        notes: f.notes,
      };
      const res = await fetch(broker ? `/api/brokers/${broker._id}` : "/api/brokers", {
        method: broker ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(d.error ?? "Could not save channel partner");
      toast.success(broker ? "Channel partner updated" : "Channel partner added");
      onSaved(d.broker?._id);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <BdModal
        open={open}
        title={broker ? "Edit Channel Partner" : "Add Channel Partner"}
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
          <BdField label="Contact Person *">
            <BdInput value={f.name} onChange={set("name")} placeholder="Contact person" autoFocus />
          </BdField>
          <BdField label="Mobile *">
            <BdInput value={f.phone} onChange={set("phone")} placeholder="+91-" />
          </BdField>
          <BdField label="Alternate Mobile">
            <BdInput value={f.altPhone} onChange={set("altPhone")} placeholder="Alternate mobile" />
          </BdField>
          <BdField label="Email">
            <BdInput type="email" value={f.email} onChange={set("email")} placeholder="Email" />
          </BdField>
          <BdField label="Company">
            <div className="flex gap-2">
              <BdSelect
                className="flex-1"
                placeholder="Select Company"
                value={f.companyId}
                onChange={(v) => setF((p) => ({ ...p, companyId: v }))}
                options={companies.map((c) => ({ value: c._id, label: `${c.name} (${c.companyId})` }))}
              />
              <BdButton variant="light" onClick={() => setNewCompany(true)} title="Add Company">
                +
              </BdButton>
            </div>
          </BdField>
          <BdField label="Sourcing Manager">
            <BdSelect
              placeholder="Select Sourcing Manager"
              value={f.sourcingManagerId}
              onChange={(v) => setF((p) => ({ ...p, sourcingManagerId: v }))}
              options={users.filter((u) => u.status !== "suspended").map((u) => ({ value: u._id, label: u.name }))}
            />
          </BdField>
          <BdField label="Stage">
            <select value={f.stage} onChange={set("stage")} className="bd-input">
              {CP_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              {f.stage && !CP_STAGES.includes(f.stage) ? <option value={f.stage}>{f.stage}</option> : null}
            </select>
          </BdField>
          <BdField label="RERA Number">
            <BdInput value={f.reraNumber} onChange={set("reraNumber")} placeholder="RERA number" />
          </BdField>
          <BdField label="PAN Number">
            <BdInput value={f.panNumber} onChange={set("panNumber")} placeholder="PAN" />
          </BdField>
          <BdField label="GST Number">
            <BdInput value={f.gstNumber} onChange={set("gstNumber")} placeholder="GSTIN" />
          </BdField>
          <BdField label="Address" className="sm:col-span-2">
            <BdTextarea value={f.addressLine} onChange={set("addressLine")} placeholder="Address" />
          </BdField>
          <BdField label="City">
            <BdInput value={f.city} onChange={set("city")} placeholder="City" />
          </BdField>
          <BdField label="State">
            <BdInput value={f.state} onChange={set("state")} placeholder="State" />
          </BdField>
          <BdField label="Pincode">
            <BdInput value={f.pincode} onChange={set("pincode")} placeholder="Pincode" />
          </BdField>
          <BdField label="Notes" className="sm:col-span-2">
            <BdTextarea value={f.notes} onChange={set("notes")} placeholder="Notes" />
          </BdField>
        </div>
      </BdModal>
      <CompanyDialog
        open={newCompany}
        onClose={() => setNewCompany(false)}
        onSaved={(c) => {
          setCompanies((p) => [...p, c]);
          setF((p) => ({ ...p, companyId: c._id, reraNumber: p.reraNumber || c.reraNumber || "" }));
        }}
      />
    </>
  );
}
