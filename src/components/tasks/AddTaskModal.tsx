"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput, BdSelect } from "@/components/bd";
import { BdModal, BdTextarea } from "@/components/bd/BdOverlays";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { useAuth } from "@/contexts/AuthContext";
import { ACTIVITY_TYPES, LeadPicker, REMINDERS, api, toLocalInput, type PickedLead } from "./shared";

export interface AddTaskInitial {
  lead?: PickedLead | null;
  scheduleAt?: string;
}

export function AddTaskModal({
  open,
  onClose,
  onCreated,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initial?: AddTaskInitial;
}) {
  const { user } = useAuth();
  const { users } = useDirectory();
  const [lead, setLead] = useState<PickedLead | null>(null);
  const [type, setType] = useState("call");
  const [when, setWhen] = useState("");
  const [remark, setRemark] = useState("");
  const [assignee, setAssignee] = useState("");
  const [remind, setRemind] = useState(true);
  const [reminder, setReminder] = useState("15");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLead(initial?.lead ?? null);
    setType("call");
    setWhen(initial?.scheduleAt ?? toLocalInput(new Date(Date.now() + 60 * 60 * 1000)));
    setRemark("");
    setAssignee(user?.id ?? "");
    setRemind(true);
    setReminder("15");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && user?.id) setAssignee((a) => a || user.id);
  }, [open, user?.id]);

  const canAssign = user && ["owner", "admin", "manager", "supervisor"].includes(user.role);

  const save = async () => {
    if (!lead) return toast.error("Select a lead first.");
    if (!when) return toast.error("Choose a schedule date and time.");
    setSaving(true);
    try {
      await api("/api/tasks", "POST", {
        leadId: lead._id,
        type,
        scheduleAt: new Date(when).toISOString(),
        remark,
        assignedTo: assignee || undefined,
        remindMe: remind,
        reminderMinutes: Number(reminder),
      });
      toast.success("Task added.");
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add task.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BdModal
      open={open}
      onClose={onClose}
      title="Add Task"
      width={560}
      footer={
        <>
          <BdButton variant="light" onClick={onClose}>
            Cancel
          </BdButton>
          <BdButton disabled={saving} onClick={save}>
            {saving ? "Saving…" : "Save"}
          </BdButton>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <BdField label="Lead" className="sm:col-span-2">
          <LeadPicker value={lead} onChange={setLead} disabled={!!initial?.lead} />
        </BdField>
        <BdField label="Activity type">
          <BdSelect value={type} onChange={(v) => setType(v || "call")} options={ACTIVITY_TYPES} clearable={false} />
        </BdField>
        <BdField label="Schedule Date">
          <BdInput type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </BdField>
        <BdField label="Assigned To">
          <BdSelect
            value={assignee}
            onChange={setAssignee}
            placeholder="Select Sales Agent"
            disabled={!canAssign}
            clearable={false}
            options={users.filter((u) => u.status !== "suspended").map((u) => ({ value: u._id, label: u.name }))}
          />
        </BdField>
        <BdField label="Remind Me">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={remind}
              onChange={(e) => setRemind(e.target.checked)}
              className="size-4 accent-[#3a5dc2]"
            />
            <BdSelect value={reminder} onChange={(v) => setReminder(v || "15")} options={REMINDERS} clearable={false} disabled={!remind} />
          </div>
        </BdField>
        <BdField label="Remark" className="sm:col-span-2">
          <BdTextarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Add a remark" />
        </BdField>
      </div>
    </BdModal>
  );
}
