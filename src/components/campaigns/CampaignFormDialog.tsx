"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput } from "@/components/bd";
import { BdModal, BdTextarea } from "@/components/bd/BdOverlays";

export const CHANNELS = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "google", label: "Google" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
  { value: "other", label: "Other" },
];
export const CAMPAIGN_STATUSES = [
  { value: "draft", label: "Draft" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "completed", label: "Completed" },
];

export interface CampaignEditable {
  _id: string;
  name: string;
  channel?: string;
  status?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  budget?: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
}

const day = (d?: string) => (d ? new Date(d).toISOString().slice(0, 10) : "");

export function CampaignFormDialog({
  open,
  campaign,
  onClose,
  onSaved,
}: {
  open: boolean;
  campaign?: CampaignEditable | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [f, setF] = useState({ name: "", channel: "other", status: "draft", utmSource: "", utmMedium: "", utmCampaign: "", budget: "", startDate: "", endDate: "", notes: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setF({
      name: campaign?.name ?? "",
      channel: campaign?.channel ?? "other",
      status: campaign?.status ?? "draft",
      utmSource: campaign?.utmSource ?? "",
      utmMedium: campaign?.utmMedium ?? "",
      utmCampaign: campaign?.utmCampaign ?? "",
      budget: campaign?.budget != null ? String(campaign.budget) : "",
      startDate: day(campaign?.startDate),
      endDate: day(campaign?.endDate),
      notes: campaign?.notes ?? "",
    });
  }, [open, campaign]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setF((p) => ({ ...p, [k]: e.target.value }));

  const submit = async () => {
    if (!f.name.trim()) return toast.error("Campaign name is required");
    if (f.startDate && f.endDate && f.endDate < f.startDate) return toast.error("End date cannot be before start date");
    setSaving(true);
    try {
      const res = await fetch(campaign ? `/api/campaigns/${campaign._id}` : "/api/campaigns", {
        method: campaign ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(d.error ?? "Could not save campaign");
      toast.success(campaign ? "Campaign updated" : "Campaign created");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BdModal
      open={open}
      title={campaign ? "Edit Campaign" : "Add Campaign"}
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
        <BdField label="Campaign Name *" className="sm:col-span-2">
          <BdInput value={f.name} onChange={set("name")} placeholder="Campaign name" autoFocus />
        </BdField>
        <BdField label="Channel">
          <select value={f.channel} onChange={set("channel")} className="bd-input">
            {CHANNELS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </BdField>
        <BdField label="Status">
          <select value={f.status} onChange={set("status")} className="bd-input">
            {CAMPAIGN_STATUSES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </BdField>
        <BdField label="UTM Source">
          <BdInput value={f.utmSource} onChange={set("utmSource")} placeholder="facebook" />
        </BdField>
        <BdField label="UTM Medium">
          <BdInput value={f.utmMedium} onChange={set("utmMedium")} placeholder="cpc" />
        </BdField>
        <BdField label="UTM Campaign" className="sm:col-span-2">
          <BdInput value={f.utmCampaign} onChange={set("utmCampaign")} placeholder="Leads from this utm campaign value are attributed here" />
        </BdField>
        <BdField label="Budget">
          <BdInput type="number" min={0} value={f.budget} onChange={set("budget")} placeholder="0" />
        </BdField>
        <div />
        <BdField label="Start Date">
          <BdInput type="date" value={f.startDate} onChange={set("startDate")} />
        </BdField>
        <BdField label="End Date">
          <BdInput type="date" value={f.endDate} onChange={set("endDate")} />
        </BdField>
        <BdField label="Notes" className="sm:col-span-2">
          <BdTextarea value={f.notes} onChange={set("notes")} placeholder="Notes" />
        </BdField>
      </div>
    </BdModal>
  );
}
