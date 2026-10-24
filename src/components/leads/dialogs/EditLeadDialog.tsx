"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BdField, BdInput, BdSelect } from "@/components/bd";
import { Modal, ModalActions, api } from "@/components/leads/ui/primitives";
import { CATEGORY_OPTIONS, useLeadOptions } from "@/components/leads/types";

interface EditableLead {
  _id: string;
  contact: { name: string; primaryPhone: string; email?: string };
  stage: string;
  priority?: string;
  category?: string;
  description?: string;
  tags?: string[];
  source?: { primary?: string };
  primaryProjectId?: { _id: string } | string | null;
}

export function EditLeadDialog({
  open,
  onClose,
  lead,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  lead: EditableLead | null;
  onSaved: () => void;
}) {
  const opts = useLeadOptions();
  const [f, setF] = useState({
    name: "", phone: "", email: "", stage: "", priority: "medium", category: "", source: "", projectId: "", tags: "", description: "",
  });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open || !lead) return;
    const proj = lead.primaryProjectId;
    setF({
      name: lead.contact.name,
      phone: lead.contact.primaryPhone,
      email: lead.contact.email ?? "",
      stage: lead.stage,
      priority: lead.priority ?? "medium",
      category: lead.category ?? "",
      source: lead.source?.primary ?? "",
      projectId: typeof proj === "string" ? proj : (proj?._id ?? ""),
      tags: (lead.tags ?? []).join(", "),
      description: lead.description ?? "",
    });
  }, [open, lead]);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  if (!lead) return null;

  const save = async () => {
    setBusy(true);
    try {
      await api(`/api/leads/${lead._id}`, {
        method: "PATCH",
        json: {
          contact: { name: f.name, primaryPhone: f.phone, email: f.email },
          stage: f.stage,
          priority: f.priority,
          category: f.category,
          source: f.source ? { primary: f.source } : undefined,
          primaryProjectId: f.projectId || null,
          tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
          description: f.description,
        },
      });
      toast.success("Lead updated");
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Lead"
      width={640}
      footer={<ModalActions onCancel={onClose} onSubmit={save} busy={busy} disabled={!f.name.trim() || !f.phone.trim()} />}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <BdField label="Name">
          <BdInput value={f.name} onChange={(e) => set("name")(e.target.value)} />
        </BdField>
        <BdField label="Primary No">
          <BdInput value={f.phone} onChange={(e) => set("phone")(e.target.value)} />
        </BdField>
        <BdField label="E-Mail">
          <BdInput type="email" value={f.email} onChange={(e) => set("email")(e.target.value)} />
        </BdField>
        <BdField label="Lead Stage">
          <BdSelect value={f.stage} onChange={set("stage")} clearable={false} options={opts.stages.map((s) => ({ value: s.key, label: s.label }))} />
        </BdField>
        <BdField label="Source">
          <BdSelect value={f.source} onChange={set("source")} placeholder="Select Source" options={opts.sources} />
        </BdField>
        <BdField label="Project">
          <BdSelect value={f.projectId} onChange={set("projectId")} placeholder="Select Project" options={opts.projects.map((p) => ({ value: p._id, label: p.name }))} />
        </BdField>
        <BdField label="Lead Category">
          <BdSelect value={f.category} onChange={set("category")} placeholder="Select Category" options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))} />
        </BdField>
        <BdField label="Priority">
          <BdSelect
            value={f.priority}
            onChange={set("priority")}
            clearable={false}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
              { value: "vip", label: "VIP" },
            ]}
          />
        </BdField>
        <BdField label="Tag" className="sm:col-span-2">
          <BdInput value={f.tags} onChange={(e) => set("tags")(e.target.value)} placeholder="Comma separated tags" />
        </BdField>
        <BdField label="Description" className="sm:col-span-2">
          <textarea value={f.description} onChange={(e) => set("description")(e.target.value)} rows={3} className="bd-input !h-auto py-2" />
        </BdField>
      </div>
    </Modal>
  );
}
