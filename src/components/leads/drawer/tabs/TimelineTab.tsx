"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BdButton } from "@/components/bd";
import { api } from "@/components/leads/ui/primitives";
import { fmtDT } from "@/components/leads/list/LeadsTable";
import type { TabCtx } from "../types";

export interface ActivityRow {
  _id: string;
  type: string;
  description?: string;
  occurredAt: string;
  channel?: string;
  direction?: string;
  durationSec?: number;
  actorId?: { name: string } | null;
  metadata?: Record<string, unknown>;
}

const TONE: Record<string, string> = {
  call_made: "#2fb67c",
  call_missed: "#d9453f",
  whatsapp_sent: "#2fb67c",
  sms_sent: "#ec8a2c",
  email_sent: "#e0566a",
  stage_changed: "#3a5dc2",
  lead_assigned: "#7a66e0",
  site_visit_scheduled: "#8a5cd6",
  followup_set: "#e9b72a",
  meeting_logged: "#3ec1d3",
  comment_added: "#6b7186",
};

export const titleOf = (t: string) => t.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

export function useActivities(leadId: string, channel?: string) {
  const [rows, setRows] = useState<ActivityRow[] | null>(null);
  const load = useCallback(() => {
    api<{ activities: ActivityRow[] }>(`/api/leads/${leadId}/activities${channel ? `?channel=${channel}` : ""}`)
      .then((d) => setRows(d.activities))
      .catch((e) => {
        toast.error(e instanceof Error ? e.message : "Could not load activity");
        setRows([]);
      });
  }, [leadId, channel]);
  useEffect(load, [load]);
  return { rows, reload: load };
}

export function ActivityList({ rows, empty }: { rows: ActivityRow[] | null; empty: string }) {
  if (rows === null) return <p className="py-8 text-center text-[13px] text-[#8b90a0]">Loading…</p>;
  if (rows.length === 0) return <p className="py-8 text-center text-[13px] text-[#8b90a0]">{empty}</p>;
  return (
    <ol className="relative ml-2 border-l border-[#e3e6ef]">
      {rows.map((a) => (
        <li key={a._id} className="relative pb-5 pl-6">
          <span className="absolute -left-[6px] top-1 size-3 rounded-full border-2 border-white" style={{ background: TONE[a.type] ?? "#9a9ca6" }} />
          <p className="text-[14px] font-medium text-[#2b2f3a]">{titleOf(a.type)}</p>
          {a.description ? <p className="mt-0.5 whitespace-pre-wrap text-[13.5px] text-[#4a4f5f]">{a.description}</p> : null}
          <p className="mt-0.5 text-[12px] text-[#8b90a0]">
            {fmtDT(a.occurredAt)}
            {a.actorId?.name ? ` · ${a.actorId.name}` : ""}
            {a.durationSec ? ` · ${Math.round(a.durationSec / 60 * 10) / 10} min` : ""}
            {a.direction ? ` · ${a.direction === "inbound" ? "Incoming" : "Outgoing"}` : ""}
          </p>
        </li>
      ))}
    </ol>
  );
}

export function TimelineTab({ ctx }: { ctx: TabCtx }) {
  const { rows, reload } = useActivities(ctx.lead._id);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const add = async () => {
    if (!note.trim()) return;
    setBusy(true);
    try {
      await api(`/api/leads/${ctx.lead._id}/activities`, { method: "POST", json: { type: "comment_added", description: note } });
      setNote("");
      reload();
      ctx.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add note");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="rounded-[3px] border border-[#e6e9f2] bg-white p-5">
      <div className="mb-5 flex gap-2">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Add a note to the timeline"
          className="bd-input"
        />
        <BdButton onClick={add} disabled={busy || !note.trim()}>
          Add Note
        </BdButton>
      </div>
      <ActivityList rows={rows} empty="No activity yet." />
    </div>
  );
}
