"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { BdBadge, BdButton } from "@/components/bd";
import { SiteVisitDialog } from "@/components/leads/dialogs/ActionDialogs";
import { api } from "@/components/leads/ui/primitives";
import { fmtDT } from "@/components/leads/list/LeadsTable";
import type { TabCtx } from "../types";

interface Visit {
  _id: string;
  scheduledAt: string;
  status: string;
  mode?: string;
  projectId?: { name: string } | null;
  assignedTo?: { name: string } | null;
}

const STATUS_COLOR: Record<string, string> = {
  planned: "#3a5dc2",
  confirmed: "#3ec1d3",
  in_progress: "#e9b72a",
  done: "#37c47f",
  no_show: "#d9453f",
  cancelled: "#9a9ca6",
  rescheduled: "#ec8a2c",
};

export function SiteVisitTab({ ctx }: { ctx: TabCtx }) {
  const { lead } = ctx;
  const [visits, setVisits] = useState<Visit[] | null>(null);
  const [open, setOpen] = useState(false);
  const load = useCallback(() => {
    api<{ visits: Visit[] }>(`/api/visits?leadId=${lead._id}&range=all&limit=100`)
      .then((d) => setVisits(d.visits))
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Could not load site visits");
        setVisits([]);
      });
  }, [lead._id]);
  useEffect(load, [load]);

  const setStatus = async (v: Visit, status: string) => {
    try {
      await api(`/api/visits/${v._id}`, { method: "PATCH", json: { status } });
      toast.success("Site visit updated");
      load();
      ctx.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not update");
    }
  };

  return (
    <div className="rounded-[3px] border border-[#e6e9f2] bg-white">
      <header className="flex items-center justify-between border-b border-[#eef0f6] px-5 py-3.5">
        <h3 className="text-[16px] font-semibold text-[#2b2f3a]">Site Visits</h3>
        <BdButton onClick={() => setOpen(true)}>
          <Plus className="size-3.5" /> Schedule Site Visit
        </BdButton>
      </header>
      <div className="p-5">
        {visits === null ? (
          <p className="py-6 text-center text-[13px] text-[#8b90a0]">Loading…</p>
        ) : visits.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[#8b90a0]">No site visits scheduled for this lead.</p>
        ) : (
          <div className="divide-y divide-[#eef0f6]">
            {visits.map((v) => {
              const live = ["planned", "confirmed", "rescheduled", "in_progress"].includes(v.status);
              return (
                <div key={v._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-[#2b2f3a]">{v.projectId?.name ?? "Project"}</p>
                    <p className="mt-0.5 text-[12.5px] text-[#6b7186]">
                      {fmtDT(v.scheduledAt)}
                      {v.assignedTo?.name ? ` · ${v.assignedTo.name}` : ""}
                      {v.mode ? ` · ${v.mode.replace(/_/g, " ")}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <BdBadge color={STATUS_COLOR[v.status] ?? "#9a9ca6"}>{v.status.replace(/_/g, " ").toUpperCase()}</BdBadge>
                    {live ? (
                      <>
                        <BdButton variant="light" onClick={() => setStatus(v, "done")}>
                          Mark Done
                        </BdButton>
                        <BdButton variant="light" onClick={() => setStatus(v, "no_show")}>
                          No Show
                        </BdButton>
                        <BdButton variant="light" onClick={() => setStatus(v, "cancelled")}>
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
      <SiteVisitDialog
        open={open}
        onClose={() => setOpen(false)}
        leadId={lead._id}
        leadName={lead.contact.name}
        defaultProjectId={lead.primaryProjectId?._id}
        onDone={() => {
          load();
          ctx.reload();
        }}
      />
    </div>
  );
}
