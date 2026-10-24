"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput, BdSelect } from "@/components/bd";
import { BdModal, BdTextarea } from "@/components/bd/BdOverlays";
import { BdLeadPicker, type LeadHit } from "@/components/bd/BdLeadPicker";
import { useDirectory } from "@/components/bd/TeamAgentSelects";

export const BOOKING_STAGES = ["booked", "agreement", "registered", "possession", "cancelled"];

export interface BookingEditable {
  _id: string;
  customerName?: string;
  amount?: number;
  stage?: string;
  source?: string;
  notes?: string;
  bookedAt?: string;
  leadId?: { _id: string; contact?: { name?: string }; leadNumber?: string } | string | null;
  projectId?: { _id: string } | string | null;
  brokerId?: { _id: string } | string | null;
  salesAgentId?: { _id: string } | string | null;
}

const idOf = (v: unknown) => (v && typeof v === "object" ? String((v as { _id: string })._id) : v ? String(v) : "");

function localDT(d?: string) {
  const dt = d ? new Date(d) : new Date();
  dt.setMinutes(dt.getMinutes() - dt.getTimezoneOffset());
  return dt.toISOString().slice(0, 16);
}

/** Add / Edit Booking (pass `booking` to edit). */
export function BookingFormDialog({
  open,
  booking,
  onClose,
  onSaved,
}: {
  open: boolean;
  booking?: BookingEditable | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const { users } = useDirectory();
  const [projects, setProjects] = useState<Array<{ _id: string; name: string }>>([]);
  const [brokers, setBrokers] = useState<Array<{ _id: string; name: string; firmName?: string }>>([]);
  const [lead, setLead] = useState<LeadHit | null>(null);
  const [f, setF] = useState({ customerName: "", amount: "", projectId: "", brokerId: "", salesAgentId: "", stage: "booked", source: "", notes: "", bookedAt: localDT() });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    const l = booking?.leadId && typeof booking.leadId === "object" ? booking.leadId : null;
    setLead(l ? { _id: l._id, leadNumber: l.leadNumber, contact: l.contact } : null);
    setF({
      customerName: booking?.customerName ?? "",
      amount: booking?.amount != null ? String(booking.amount) : "",
      projectId: idOf(booking?.projectId),
      brokerId: idOf(booking?.brokerId),
      salesAgentId: idOf(booking?.salesAgentId),
      stage: booking?.stage ?? "booked",
      source: booking?.source ?? "",
      notes: booking?.notes ?? "",
      bookedAt: localDT(booking?.bookedAt),
    });
    Promise.all([
      fetch("/api/projects?limit=300", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/brokers?limit=500", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([p, b]) => {
        setProjects(p.projects ?? []);
        setBrokers(b.brokers ?? []);
      })
      .catch(() => undefined);
  }, [open, booking]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    const name = f.customerName.trim() || lead?.contact?.name || "";
    if (!name) return toast.error("Customer name is required");
    if (f.amount === "" || !(Number(f.amount) >= 0)) return toast.error("Enter a valid amount");
    setSaving(true);
    try {
      const payload = {
        customerName: name,
        amount: Number(f.amount),
        leadId: lead?._id ?? "",
        projectId: f.projectId,
        brokerId: f.brokerId,
        salesAgentId: f.salesAgentId || undefined,
        stage: f.stage,
        source: f.source,
        notes: f.notes,
        bookedAt: f.bookedAt ? new Date(f.bookedAt).toISOString() : undefined,
      };
      const res = await fetch(booking ? `/api/bookings/${booking._id}` : "/api/bookings", {
        method: booking ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(d.error ?? "Could not save booking");
      toast.success(booking ? "Booking updated" : "Booking created");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BdModal
      open={open}
      title={booking ? "Edit Booking" : "Add Booking"}
      onClose={onClose}
      width={720}
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
        <BdField label="Lead" className="sm:col-span-2">
          <BdLeadPicker
            value={lead}
            onChange={(l) => {
              setLead(l);
              if (l?.contact?.name && !f.customerName) setF((p) => ({ ...p, customerName: l.contact?.name ?? "" }));
            }}
          />
        </BdField>
        <BdField label="Customer Name *">
          <BdInput value={f.customerName} onChange={set("customerName")} placeholder="Customer name" />
        </BdField>
        <BdField label="Amount *">
          <BdInput type="number" min={0} value={f.amount} onChange={set("amount")} placeholder="0" />
        </BdField>
        <BdField label="Project">
          <BdSelect placeholder="Select Project" value={f.projectId} onChange={(v) => setF((p) => ({ ...p, projectId: v }))} options={projects.map((p) => ({ value: p._id, label: p.name }))} />
        </BdField>
        <BdField label="Sales Agent">
          <BdSelect placeholder="Select Sales Agent" value={f.salesAgentId} clearable={false} onChange={(v) => setF((p) => ({ ...p, salesAgentId: v }))} options={users.filter((u) => u.status !== "suspended").map((u) => ({ value: u._id, label: u.name }))} />
        </BdField>
        <BdField label="Channel Partner">
          <BdSelect placeholder="Select Channel Partner" value={f.brokerId} onChange={(v) => setF((p) => ({ ...p, brokerId: v }))} options={brokers.map((b) => ({ value: b._id, label: b.firmName ? `${b.name} (${b.firmName})` : b.name }))} />
        </BdField>
        <BdField label="Stage">
          <select value={f.stage} onChange={set("stage")} className="bd-input capitalize">
            {BOOKING_STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            {f.stage && !BOOKING_STAGES.includes(f.stage) ? <option value={f.stage}>{f.stage}</option> : null}
          </select>
        </BdField>
        <BdField label="Source">
          <BdInput value={f.source} onChange={set("source")} placeholder="Lead source" />
        </BdField>
        <BdField label="Booked At">
          <BdInput type="datetime-local" value={f.bookedAt} onChange={set("bookedAt")} />
        </BdField>
        <BdField label="Notes" className="sm:col-span-2">
          <BdTextarea value={f.notes} onChange={set("notes")} placeholder="Notes" />
        </BdField>
      </div>
    </BdModal>
  );
}
