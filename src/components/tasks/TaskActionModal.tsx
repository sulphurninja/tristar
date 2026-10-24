"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput, BdSelect } from "@/components/bd";
import { BdConfirm, BdModal, BdTextarea } from "@/components/bd/BdOverlays";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { api, toLocalInput, type TaskRow } from "./shared";

export type TaskActionMode = "complete" | "reschedule" | "reassign" | "remark" | "delete";

/**
 * One modal for every row / bulk action on tasks. `tasks` holds one task for a
 * row action or several for a bulk action.
 */
export function TaskActionModal({
  mode,
  tasks,
  onClose,
  onDone,
}: {
  mode: TaskActionMode | null;
  tasks: TaskRow[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { users } = useDirectory();
  const [remark, setRemark] = useState("");
  const [when, setWhen] = useState("");
  const [agent, setAgent] = useState("");
  const [busy, setBusy] = useState(false);
  const bulk = tasks.length > 1;

  useEffect(() => {
    if (!mode) return;
    setRemark(mode === "remark" ? (tasks[0]?.remark ?? "") : "");
    setWhen(toLocalInput(tasks[0]?.scheduleAt ?? new Date()));
    setAgent("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  if (!mode || !tasks.length) return null;

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
  const ids = tasks.map((t) => t._id);

  if (mode === "delete") {
    return (
      <BdConfirm
        open
        busy={busy}
        title="Delete Task"
        message={bulk ? `Delete ${tasks.length} selected tasks? This cannot be undone.` : `Delete the task "${tasks[0].title}"? This cannot be undone.`}
        onClose={onClose}
        onConfirm={() =>
          run(
            () => (bulk ? api("/api/tasks/bulk", "POST", { action: "delete", ids }) : api(`/api/tasks/${ids[0]}`, "DELETE")),
            "Task deleted.",
          )
        }
      />
    );
  }

  const cfg = {
    complete: { title: "Mark As Completed", cta: "Mark As Completed" },
    reschedule: { title: "Reschedule", cta: "Reschedule" },
    reassign: { title: bulk ? "Reassign Tasks" : "Reassign", cta: "Reassign" },
    remark: { title: "Add Remark", cta: "Save" },
  }[mode];

  const submit = () => {
    if (mode === "complete") {
      return run(
        () =>
          bulk
            ? api("/api/tasks/bulk", "POST", { action: "complete", ids })
            : api(`/api/tasks/${ids[0]}`, "PATCH", { status: "completed", ...(remark.trim() ? { remark: remark.trim() } : {}) }),
        bulk ? "Tasks marked as completed." : "Task marked as completed.",
      );
    }
    if (mode === "reschedule") {
      if (!when) return toast.error("Choose a new date and time.");
      return run(() => api(`/api/tasks/${ids[0]}`, "PATCH", { scheduleAt: new Date(when).toISOString() }), "Task rescheduled.");
    }
    if (mode === "reassign") {
      if (!agent) return toast.error("Select an agent.");
      return run(
        () =>
          bulk
            ? api("/api/tasks/bulk", "POST", { action: "reassign", ids, assignedTo: agent })
            : api(`/api/tasks/${ids[0]}`, "PATCH", { assignedTo: agent }),
        "Task reassigned.",
      );
    }
    if (!remark.trim()) return toast.error("Enter a remark.");
    return run(() => api(`/api/tasks/${ids[0]}`, "PATCH", { remark: remark.trim() }), "Remark saved.");
  };

  return (
    <BdModal
      open
      onClose={onClose}
      title={cfg.title}
      width={480}
      footer={
        <>
          <BdButton variant="light" onClick={onClose}>
            Cancel
          </BdButton>
          <BdButton disabled={busy} onClick={submit}>
            {busy ? "Please wait…" : cfg.cta}
          </BdButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-[13px] text-[#5a6072]">{bulk ? `${tasks.length} tasks selected` : tasks[0].title}</p>
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
        {mode === "remark" || (mode === "complete" && !bulk) ? (
          <BdField label="Remark">
            <BdTextarea value={remark} onChange={(e) => setRemark(e.target.value)} placeholder="Add a remark" />
          </BdField>
        ) : null}
      </div>
    </BdModal>
  );
}
