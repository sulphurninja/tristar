"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput, BdSelect } from "@/components/bd";
import { BdConfirm, BdModal, BdTextarea } from "@/components/bd/BdOverlays";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { api, toLocalInput, type VisitRow } from "@/components/tasks/shared";

export type VisitActionMode = "complete" | "reschedule" | "cancel" | "noshow" | "reassign" | "remark" | "delete";

const INTEREST = [
  { value: "very_high", label: "Very High" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
  { value: "none", label: "Not Interested" },
];

/** Every row / bulk action on site visits lives in this one modal. */
export function VisitActionModal({
  mode,
  visits,
  onClose,
  onDone,
}: {
  mode: VisitActionMode | null;
  visits: VisitRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { users } = useDirectory();
  const [text, setText] = useState("");
  const [when, setWhen] = useState("");
  const [agent, setAgent] = useState("");
  const [interest, setInterest] = useState("medium");
  const [followUp, setFollowUp] = useState(true);
  const [busy, setBusy] = useState(false);
  const bulk = visits.length > 1;

  useEffect(() => {
    if (!mode) return;
    setText(mode === "remark" ? (visits[0]?.remark ?? "") : "");
    setWhen(toLocalInput(visits[0]?.scheduledAt ?? new Date()));
    setAgent("");
    setInterest("medium");
    setFollowUp(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (!mode || !visits.length) return null;
  const ids = visits.map((v) => v._id);
  const label = bulk ? `${visits.length} site visits selected` : `${visits[0].leadId?.contact?.name ?? "Lead"} — ${visits[0].projectId?.name ?? "Site visit"}`;

  const run = async (fn: () => Promise<unknown>, msg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(msg);
      onDone();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };
  const patch = (body: Record<string, unknown>, msg: string) => run(() => api(`/api/visits/${ids[0]}`, "PATCH", body), msg);

  if (mode === "delete" || mode === "noshow") {
    const del = mode === "delete";
    return (
      <BdConfirm
        open
        busy={busy}
        title={del ? "Delete Site Visit" : "Mark as No Show"}
        confirmLabel={del ? "Delete" : "Mark No Show"}
        message={del ? `Delete the site visit for ${label}? This cannot be undone.` : `Mark ${label} as No Show?`}
        onClose={onClose}
        onConfirm={() => (del ? run(() => api(`/api/visits/${ids[0]}`, "DELETE"), "Site visit deleted.") : patch({ status: "no_show" }, "Marked as No Show."))}
      />
    );
  }

  const cfg = {
    complete: { title: "Mark Completed", cta: "Mark Completed" },
    reschedule: { title: "Reschedule", cta: "Reschedule" },
    cancel: { title: bulk ? "Cancel Site Visits" : "Cancel Site Visit", cta: "Cancel Site Visit" },
    reassign: { title: "Reassign", cta: "Reassign" },
    remark: { title: "Add Remark", cta: "Save" },
  }[mode];

  const submit = () => {
    if (mode === "complete") {
      if (bulk) return run(() => api("/api/visits/bulk", "POST", { action: "complete", ids }), "Site visits marked completed.");
      return patch(
        { status: "done", feedback: { interest, notes: text, followUpRequired: followUp } },
        "Site visit marked completed.",
      );
    }
    if (mode === "cancel") {
      if (bulk) return run(() => api("/api/visits/bulk", "POST", { action: "cancel", ids }), "Site visits cancelled.");
      return patch({ status: "cancelled", cancelReason: text }, "Site visit cancelled.");
    }
    if (mode === "reschedule") {
      if (!when) return toast.error("Choose a new date and time.");
      return patch({ scheduledAt: new Date(when).toISOString() }, "Site visit rescheduled.");
    }
    if (mode === "reassign") {
      if (!agent) return toast.error("Select an agent.");
      return bulk
        ? run(() => api("/api/visits/bulk", "POST", { action: "reassign", ids, assignedTo: agent }), "Site visits reassigned.")
        : patch({ assignedTo: agent }, "Site visit reassigned.");
    }
    if (!text.trim()) return toast.error("Enter a remark.");
    return patch({ remark: text.trim() }, "Remark saved.");
  };

  return (
    <BdModal
      open
      onClose={onClose}
      title={cfg.title}
      width={500}
      footer={
        <>
          <BdButton variant="light" onClick={onClose}>
            Close
          </BdButton>
          <BdButton variant={mode === "cancel" ? "danger" : "primary"} disabled={busy} onClick={submit}>
            {busy ? "Please wait…" : cfg.cta}
          </BdButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[13px] text-[#5a6072]">{label}</p>
        {mode === "reschedule" ? (
          <BdField label="Schedule Date">
            <BdInput type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          </BdField>
        ) : null}
        {mode === "reassign" ? (
          <BdField label="Assigned To">
            <BdSelect
              value={agent}
              onChange={setAgent}
              placeholder="Select Sales Agent"
              options={users.filter((u) => u.status !== "suspended").map((u) => ({ value: u._id, label: u.name }))}
            />
          </BdField>
        ) : null}
        {mode === "complete" && !bulk ? (
          <>
            <BdField label="Customer Interest">
              <BdSelect value={interest} onChange={(v) => setInterest(v || "medium")} options={INTEREST} clearable={false} />
            </BdField>
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} className="size-4 accent-[#3a5dc2]" />
              Follow-up required
            </label>
          </>
        ) : null}
        {(mode === "complete" && !bulk) || mode === "remark" || (mode === "cancel" && !bulk) ? (
          <BdField label={mode === "complete" ? "Feedback" : mode === "cancel" ? "Reason" : "Remark"}>
            <BdTextarea value={text} onChange={(e) => setText(e.target.value)} placeholder={mode === "complete" ? "Visit feedback" : mode === "cancel" ? "Reason for cancelling" : "Add a remark"} />
          </BdField>
        ) : null}
      </div>
    </BdModal>
  );
}
