"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput, BdSelect } from "@/components/bd";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { BdModal } from "./BdModal";

export const SOURCE_OPTIONS = [
  "walkin",
  "channel_partner",
  "telecalling",
  "website",
  "whatsapp_bot",
  "facebook",
  "instagram",
  "google_ads",
  "magicbricks",
  "99acres",
  "housing",
  "newspaper",
  "hoarding",
  "referral",
  "exhibition",
  "other",
].map((s) => ({ value: s, label: s.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase()) }));

export interface ProjectOpt {
  _id: string;
  name: string;
}

export function useProjects() {
  const [projects, setProjects] = useState<ProjectOpt[]>([]);
  useEffect(() => {
    fetch("/api/projects?limit=200", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => undefined);
  }, []);
  return projects;
}

export interface ContactFormValue {
  name: string;
  phone: string;
  email: string;
  projectId: string;
  assignedTo: string;
  source: string;
  description: string;
}

const EMPTY: ContactFormValue = {
  name: "",
  phone: "",
  email: "",
  projectId: "",
  assignedTo: "",
  source: "",
  description: "",
};

/** Add Contact (no `contactId`) or Edit Contact (with initial values + id). */
export function ContactModal({
  open,
  onClose,
  onSaved,
  contactId,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  contactId?: string;
  initial?: Partial<ContactFormValue>;
}) {
  const { users } = useDirectory();
  const projects = useProjects();
  const [form, setForm] = useState<ContactFormValue>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm({ ...EMPTY, ...initial });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (patch: Partial<ContactFormValue>) => setForm((f) => ({ ...f, ...patch }));

  const save = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Name and mobile are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(contactId ? `/api/contacts/${contactId}` : "/api/contacts", {
        method: contactId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactId ? { action: "update", ...form } : form),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "Couldn't save contact.");
        return;
      }
      toast.success(contactId ? "Contact updated" : "Contact added");
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BdModal
      open={open}
      onClose={onClose}
      title={contactId ? "Edit Contact" : "Add Contact"}
      footer={
        <>
          <BdButton variant="light" onClick={onClose}>
            Cancel
          </BdButton>
          <BdButton onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </BdButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <BdField label="Name *">
          <BdInput value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="Name" />
        </BdField>
        <BdField label="Mobile *">
          <BdInput value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="Mobile" />
        </BdField>
        <BdField label="Email">
          <BdInput type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="Email" />
        </BdField>
        <BdField label="Project">
          <BdSelect
            value={form.projectId}
            onChange={(v) => set({ projectId: v })}
            placeholder="Select Project"
            options={projects.map((p) => ({ value: p._id, label: p.name }))}
          />
        </BdField>
        <BdField label="Sales Agent">
          <BdSelect
            value={form.assignedTo}
            onChange={(v) => set({ assignedTo: v })}
            placeholder="Select Sales Agent"
            options={users.filter((u) => u.status !== "suspended").map((u) => ({ value: u._id, label: u.name }))}
          />
        </BdField>
        {!contactId ? (
          <BdField label="Source">
            <BdSelect value={form.source} onChange={(v) => set({ source: v })} placeholder="Select Source" options={SOURCE_OPTIONS} />
          </BdField>
        ) : null}
        <BdField label="Description" className="sm:col-span-2">
          <textarea
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            rows={3}
            className="bd-input !h-auto py-2"
            placeholder="Description"
          />
        </BdField>
      </div>
    </BdModal>
  );
}

const TASK_TYPES = [
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "site_visit", label: "Site Visit" },
  { value: "follow_up", label: "Follow Up" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "other", label: "Other" },
];

export function AddTaskModal({
  open,
  onClose,
  leadId,
  leadName,
  assignedTo,
  entityType = "contact",
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName: string;
  assignedTo?: string;
  entityType?: "lead" | "contact";
  onSaved?: () => void;
}) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState("call");
  const [scheduleAt, setScheduleAt] = useState("");
  const [remark, setRemark] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (open) {
      setTitle("");
      setType("call");
      setScheduleAt("");
      setRemark("");
    }
  }, [open]);

  const save = async () => {
    if (!title.trim()) {
      toast.error("Task title is required.");
      return;
    }
    if (!scheduleAt) {
      toast.error("Select the task date and time.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          scheduleAt: new Date(scheduleAt).toISOString(),
          remark: remark || undefined,
          leadId,
          entityType,
          assignedTo: assignedTo || undefined,
        }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(j.error || "Couldn't add task.");
        return;
      }
      toast.success("Task added");
      onSaved?.();
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BdModal
      open={open}
      onClose={onClose}
      title={`Add Task — ${leadName}`}
      width={520}
      footer={
        <>
          <BdButton variant="light" onClick={onClose}>
            Cancel
          </BdButton>
          <BdButton onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </BdButton>
        </>
      }
    >
      <div className="grid gap-4">
        <BdField label="Task Title *">
          <BdInput value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Task Title" />
        </BdField>
        <div className="grid gap-4 sm:grid-cols-2">
          <BdField label="Task Type">
            <BdSelect value={type} clearable={false} onChange={(v) => setType(v || "call")} options={TASK_TYPES} />
          </BdField>
          <BdField label="Schedule At *">
            <BdInput type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
          </BdField>
        </div>
        <BdField label="Remark">
          <textarea value={remark} onChange={(e) => setRemark(e.target.value)} rows={3} className="bd-input !h-auto py-2" placeholder="Remark" />
        </BdField>
      </div>
    </BdModal>
  );
}
