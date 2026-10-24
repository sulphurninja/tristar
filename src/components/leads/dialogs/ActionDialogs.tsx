"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BdField, BdInput, BdSelect } from "@/components/bd";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { Modal, ModalActions, api, toLocalInput } from "@/components/leads/ui/primitives";
import { useLeadOptions } from "@/components/leads/types";

interface Common {
  open: boolean;
  onClose: () => void;
  leadId: string;
  leadName?: string;
  onDone: () => void;
}

function useSubmit(onDone: () => void, onClose: () => void) {
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      onDone();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };
  return { busy, run };
}

const TASK_TYPES = [
  { value: "follow_up", label: "Follow Up" },
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "E-Mail" },
  { value: "other", label: "Other" },
];

/** Add Task / Add Follow-up / Schedule Meeting (same Task document, different default type). */
export function TaskDialog({
  open,
  onClose,
  leadId,
  leadName,
  onDone,
  defaultType = "follow_up",
  title = "Add Task",
}: Common & { defaultType?: string; title?: string }) {
  const { users } = useDirectory();
  const [form, setForm] = useState({ title: "", type: defaultType, when: toLocalInput(new Date(Date.now() + 3600_000)), assignedTo: "", remark: "" });
  const { busy, run } = useSubmit(onDone, onClose);
  useEffect(() => {
    if (open)
      setForm({
        title: "",
        type: defaultType,
        when: toLocalInput(new Date(Date.now() + 3600_000)),
        assignedTo: "",
        remark: "",
      });
  }, [open, defaultType]);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={leadName}
      footer={
        <ModalActions
          onCancel={onClose}
          busy={busy}
          disabled={!form.title.trim() || !form.when}
          submitLabel="Save"
          onSubmit={() =>
            run(
              () =>
                api(`/api/leads/${leadId}/followups`, {
                  method: "POST",
                  json: {
                    title: form.title,
                    type: form.type,
                    scheduleAt: new Date(form.when).toISOString(),
                    assignedTo: form.assignedTo || undefined,
                    remark: form.remark || undefined,
                  },
                }),
              "Task added",
            )
          }
        />
      }
    >
      <div className="space-y-4">
        <BdField label="Title">
          <BdInput value={form.title} onChange={(e) => set("title")(e.target.value)} placeholder="e.g. Call to discuss pricing" autoFocus />
        </BdField>
        <div className="grid grid-cols-2 gap-4">
          <BdField label="Type">
            <BdSelect value={form.type} onChange={set("type")} clearable={false} options={TASK_TYPES} />
          </BdField>
          <BdField label="Date & Time">
            <BdInput type="datetime-local" value={form.when} onChange={(e) => set("when")(e.target.value)} />
          </BdField>
        </div>
        <BdField label="Assign To">
          <BdSelect
            value={form.assignedTo}
            onChange={set("assignedTo")}
            placeholder="Lead owner"
            options={users.filter((u) => u.status !== "suspended").map((u) => ({ value: u._id, label: u.name }))}
          />
        </BdField>
        <BdField label="Remark">
          <textarea
            value={form.remark}
            onChange={(e) => set("remark")(e.target.value)}
            rows={3}
            className="bd-input !h-auto py-2"
            placeholder="Add a remark"
          />
        </BdField>
      </div>
    </Modal>
  );
}

const VISIT_MODES = [
  { value: "in_person", label: "In Person" },
  { value: "virtual", label: "Virtual" },
  { value: "phygital", label: "Phygital" },
];

export function SiteVisitDialog({
  open,
  onClose,
  leadId,
  leadName,
  onDone,
  defaultProjectId,
}: Common & { defaultProjectId?: string }) {
  const opts = useLeadOptions();
  const { users } = useDirectory();
  const [form, setForm] = useState({ projectId: defaultProjectId ?? "", when: toLocalInput(new Date(Date.now() + 86400_000)), mode: "in_person", assignedTo: "" });
  const { busy, run } = useSubmit(onDone, onClose);
  useEffect(() => {
    if (open)
      setForm({ projectId: defaultProjectId ?? "", when: toLocalInput(new Date(Date.now() + 86400_000)), mode: "in_person", assignedTo: "" });
  }, [open, defaultProjectId]);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule Site Visit"
      subtitle={leadName}
      footer={
        <ModalActions
          onCancel={onClose}
          busy={busy}
          disabled={!form.projectId || !form.when}
          submitLabel="Schedule"
          onSubmit={() =>
            run(
              () =>
                api("/api/visits", {
                  method: "POST",
                  json: {
                    leadId,
                    projectId: form.projectId,
                    scheduledAt: new Date(form.when).toISOString(),
                    mode: form.mode,
                    assignedTo: form.assignedTo || undefined,
                  },
                }),
              "Site visit scheduled",
            )
          }
        />
      }
    >
      <div className="space-y-4">
        <BdField label="Project">
          <BdSelect
            value={form.projectId}
            onChange={set("projectId")}
            placeholder="Select Project"
            options={opts.projects.map((p) => ({ value: p._id, label: p.name }))}
          />
        </BdField>
        <div className="grid grid-cols-2 gap-4">
          <BdField label="Date & Time">
            <BdInput type="datetime-local" value={form.when} onChange={(e) => set("when")(e.target.value)} />
          </BdField>
          <BdField label="Mode">
            <BdSelect value={form.mode} onChange={set("mode")} clearable={false} options={VISIT_MODES} />
          </BdField>
        </div>
        <BdField label="Assign To">
          <BdSelect
            value={form.assignedTo}
            onChange={set("assignedTo")}
            placeholder="Lead owner"
            options={users.filter((u) => u.status !== "suspended").map((u) => ({ value: u._id, label: u.name }))}
          />
        </BdField>
      </div>
    </Modal>
  );
}

export function NoteDialog({ open, onClose, leadId, leadName, onDone }: Common) {
  const [text, setText] = useState("");
  const { busy, run } = useSubmit(onDone, onClose);
  useEffect(() => {
    if (open) setText("");
  }, [open]);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Note"
      subtitle={leadName}
      footer={
        <ModalActions
          onCancel={onClose}
          busy={busy}
          disabled={!text.trim()}
          submitLabel="Save Note"
          onSubmit={() =>
            run(
              () => api(`/api/leads/${leadId}/activities`, { method: "POST", json: { type: "comment_added", description: text } }),
              "Note added",
            )
          }
        />
      }
    >
      <BdField label="Note">
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="bd-input !h-auto py-2"
          placeholder="Write a note about this lead"
        />
      </BdField>
    </Modal>
  );
}

export function CallLogDialog({ open, onClose, leadId, leadName, onDone, phone }: Common & { phone?: string }) {
  const [form, setForm] = useState({ outcome: "call_made", direction: "outbound", minutes: "", notes: "" });
  const { busy, run } = useSubmit(onDone, onClose);
  useEffect(() => {
    if (open) setForm({ outcome: "call_made", direction: "outbound", minutes: "", notes: "" });
  }, [open]);
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Log Call"
      subtitle={leadName}
      footer={
        <>
          {phone ? (
            <a href={`tel:${phone}`} className="bd-btn-light mr-auto inline-flex items-center">
              Call {phone}
            </a>
          ) : null}
          <ModalActions
            onCancel={onClose}
            busy={busy}
            submitLabel="Save Call Log"
            onSubmit={() =>
              run(
                () =>
                  api(`/api/leads/${leadId}/activities`, {
                    method: "POST",
                    json: {
                      type: form.outcome,
                      channel: "call",
                      direction: form.direction,
                      durationSec: form.minutes ? Math.round(Number(form.minutes) * 60) : undefined,
                      description: form.notes || (form.outcome === "call_missed" ? "Call not answered" : "Call connected"),
                    },
                  }),
                "Call logged",
              )
            }
          />
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <BdField label="Outcome">
            <BdSelect
              value={form.outcome}
              onChange={set("outcome")}
              clearable={false}
              options={[
                { value: "call_made", label: "Connected" },
                { value: "call_missed", label: "Not Answered" },
              ]}
            />
          </BdField>
          <BdField label="Direction">
            <BdSelect
              value={form.direction}
              onChange={set("direction")}
              clearable={false}
              options={[
                { value: "outbound", label: "Outgoing" },
                { value: "inbound", label: "Incoming" },
              ]}
            />
          </BdField>
        </div>
        <BdField label="Duration (minutes)">
          <BdInput type="number" min={0} step="0.5" value={form.minutes} onChange={(e) => set("minutes")(e.target.value)} />
        </BdField>
        <BdField label="Notes">
          <textarea value={form.notes} onChange={(e) => set("notes")(e.target.value)} rows={3} className="bd-input !h-auto py-2" />
        </BdField>
      </div>
    </Modal>
  );
}
