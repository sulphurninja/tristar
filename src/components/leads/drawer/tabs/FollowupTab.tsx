"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Plus } from "lucide-react";
import { toast } from "sonner";
import { BdBadge, BdButton } from "@/components/bd";
import { TaskDialog } from "@/components/leads/dialogs/ActionDialogs";
import { api } from "@/components/leads/ui/primitives";
import { fmtDT } from "@/components/leads/list/LeadsTable";
import type { TabCtx } from "../types";

interface TaskRow {
  _id: string;
  title: string;
  type: string;
  status: string;
  scheduleAt?: string;
  remark?: string;
  assignedTo?: { name: string } | null;
}

/** Followup tab (kind="followup") and Meeting tab (kind="meeting") - both are Task documents tied to the lead. */
export function FollowupTab({ ctx, kind }: { ctx: TabCtx; kind: "followup" | "meeting" }) {
  const { lead } = ctx;
  const [tasks, setTasks] = useState<TaskRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(() => {
    api<{ tasks: TaskRow[] }>(`/api/leads/${lead._id}/followups?kind=${kind}`)
      .then((d) => setTasks(d.tasks))
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Could not load");
        setTasks([]);
      });
  }, [lead._id, kind]);
  useEffect(load, [load]);

  const setStatus = async (t: TaskRow, status: string) => {
    try {
      await api(`/api/leads/${lead._id}/followups`, { method: "PATCH", json: { taskId: t._id, status } });
      load();
      ctx.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  };

  const now = Date.now();
  const label = kind === "meeting" ? "Meeting" : "Followup";
  return (
    <div className="rounded-[3px] border border-[#e6e9f2] bg-white">
      <header className="flex items-center justify-between border-b border-[#eef0f6] px-5 py-3.5">
        <h3 className="text-[16px] font-semibold text-[#2b2f3a]">{kind === "meeting" ? "Meetings" : "Followups"}</h3>
        <BdButton onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> {kind === "meeting" ? "Schedule Meeting" : "Add Followup"}
        </BdButton>
      </header>
      <div className="p-5">
        {tasks === null ? (
          <p className="py-6 text-center text-[13px] text-[#8b90a0]">Loading…</p>
        ) : tasks.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[#8b90a0]">No {label.toLowerCase()}s yet.</p>
        ) : (
          <div className="divide-y divide-[#eef0f6]">
            {tasks.map((t) => {
              const done = t.status === "completed" || t.status === "cancelled";
              const overdue = !done && t.scheduleAt && new Date(t.scheduleAt).getTime() < now;
              return (
                <div key={t._id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className={`text-[14px] font-medium ${done ? "text-[#8b90a0] line-through" : "text-[#2b2f3a]"}`}>{t.title}</p>
                    <p className="mt-0.5 text-[12.5px] text-[#6b7186]">
                      {fmtDT(t.scheduleAt)}
                      {t.assignedTo?.name ? ` · ${t.assignedTo.name}` : ""}
                      {` · ${t.type.replace(/_/g, " ")}`}
                    </p>
                    {t.remark ? <p className="mt-0.5 text-[13px] text-[#4a4f5f]">{t.remark}</p> : null}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {overdue ? <BdBadge color="#d9453f">Overdue</BdBadge> : null}
                    {t.status === "completed" ? <BdBadge color="#37c47f">Completed</BdBadge> : null}
                    {t.status === "cancelled" ? <BdBadge color="#9a9ca6">Cancelled</BdBadge> : null}
                    {!done ? (
                      <>
                        <BdButton variant="light" onClick={() => setStatus(t, "completed")}>
                          <Check className="size-3.5" /> Done
                        </BdButton>
                        <BdButton variant="light" onClick={() => setStatus(t, "cancelled")}>
                          Cancel
                        </BdButton>
                      </>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <TaskDialog
        open={open}
        onClose={() => setOpen(false)}
        leadId={lead._id}
        leadName={lead.contact.name}
        defaultType={kind === "meeting" ? "meeting" : "follow_up"}
        title={kind === "meeting" ? "Schedule Meeting" : "Add Followup"}
        onDone={() => {
          load();
          ctx.reload();
        }}
      />
    </div>
  );
}
