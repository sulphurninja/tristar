"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput, BdSelect } from "@/components/bd";
import { BdModal, BdTextarea } from "@/components/bd/BdOverlays";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { useAuth } from "@/contexts/AuthContext";
import { LeadPicker, api, toLocalInput, useLookups, type PickedLead } from "@/components/tasks/shared";

export const VISIT_TYPES = [
  { value: "site_visit", label: "Site Visit" },
  { value: "revisit", label: "Revisit" },
  { value: "final_visit", label: "Final Visit" },
  { value: "virtual", label: "Virtual Visit" },
];

export interface AddVisitInitial {
  lead?: PickedLead | null;
  scheduledAt?: string;
}

export function AddVisitModal({
  open,
  onClose,
  onCreated,
  initial,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
  initial?: AddVisitInitial;
}) {
  const { user } = useAuth();
  const { users } = useDirectory();
  const { projects, brokers } = useLookups();
  const [lead, setLead] = useState<PickedLead | null>(null);
  const [projectId, setProjectId] = useState("");
  const [when, setWhen] = useState("");
  const [visitType, setVisitType] = useState("site_visit");
  const [cpPresent, setCpPresent] = useState(false);
  const [brokerId, setBrokerId] = useState("");
  const [remark, setRemark] = useState("");
  const [assignee, setAssignee] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLead(initial?.lead ?? null);
    setProjectId("");
    setWhen(initial?.scheduledAt ?? toLocalInput(new Date(Date.now() + 24 * 60 * 60 * 1000)));
    setVisitType("site_visit");
    setCpPresent(false);
    setBrokerId("");
    setRemark("");
    setAssignee(user?.id ?? "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (open && user?.id) setAssignee((a) => a || user.id);
  }, [open, user?.id]);

  const canAssign = user && ["owner", "admin", "manager", "supervisor"].includes(user.role);

  const save = async () => {
    if (!lead) return toast.error("Select a lead first.");
    if (!projectId) return toast.error("Select a project.");
    if (!when) return toast.error("Choose a schedule date and time.");
    setSaving(true);
    try {
      await api("/api/visits", "POST", {
        leadId: lead._id,
        projectId,
        scheduledAt: new Date(when).toISOString(),
        visitType,
        mode: visitType === "virtual" ? "virtual" : "in_person",
        cpPresent,
        brokerId: cpPresent && brokerId ? brokerId : undefined,
        remark,
        assignedTo: assignee || undefined,
      });
      toast.success("Site visit scheduled.");
      onCreated();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not schedule the site visit.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BdModal
      open={open}
      onClose={onClose}
      title="Add Site Visit"
      width={600}
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
        <BdField label="Project">
          <BdSelect placeholder="Search & Select Project" value={projectId} onChange={setProjectId} options={projects} />
        </BdField>
        <BdField label="Schedule Date">
          <BdInput type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
        </BdField>
        <BdField label="Select Site Visit Type">
          <BdSelect value={visitType} onChange={(v) => setVisitType(v || "site_visit")} options={VISIT_TYPES} clearable={false} />
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
        <BdField label="CP Present">
          <label className="flex h-[38px] items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              checked={cpPresent}
              onChange={(e) => setCpPresent(e.target.checked)}
              className="size-4 accent-[#3a5dc2]"
            />
            Channel partner will accompany the lead
          </label>
        </BdField>
        <BdField label="Channel Partner">
          <BdSelect
            placeholder="Search & Select Channel Partner"
            value={brokerId}
            onChange={setBrokerId}
            options={brokers}
            disabled={!cpPresent}
          />
        </BdField>
        <BdField label="Remark" className="sm:col-span-2">
          <BdTextarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Add a remark" />
        </BdField>
      </div>
    </BdModal>
  );
}
