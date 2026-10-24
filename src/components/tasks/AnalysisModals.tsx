"use client";

import { useEffect, useState } from "react";
import { BdKpi, BdTable, BdTd, BdTh } from "@/components/bd";
import { BdModal } from "@/components/bd/BdOverlays";
import { typeLabel } from "./shared";

function Bars({ rows, color = "#3a5dc2" }: { rows: Array<{ label: string; value: number }>; color?: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  if (!rows.length) return <p className="py-2 text-[13px] text-[#8b90a0]">No data for the current filters.</p>;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[150px_1fr_44px] items-center gap-3 text-[13px]">
          <span className="truncate text-[#2b2f3a]" title={r.label}>
            {r.label}
          </span>
          <span className="h-2.5 rounded-full bg-[#eef0f6]">
            <span className="block h-full rounded-full" style={{ width: `${(r.value / max) * 100}%`, background: color }} />
          </span>
          <span className="text-right tabular-nums text-[#5a6072]">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-5">
      <h4 className="mb-2 text-[14px] font-semibold text-[#2b2f3a]">{title}</h4>
      {children}
    </div>
  );
}

function useAnalysis<T>(open: boolean, url: string) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (!open) return;
    setData(null);
    setErr("");
    fetch(url, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error ?? "Failed to load analysis");
        setData(d);
      })
      .catch((e) => setErr(e instanceof Error ? e.message : "Failed to load analysis"));
  }, [open, url]);
  return { data, err };
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending",
  completed: "Completed",
  cancelled: "Cancelled",
  planned: "Scheduled",
  confirmed: "Confirmed",
  rescheduled: "Rescheduled",
  in_progress: "In Progress",
  done: "Visited",
  no_show: "No Show",
};

interface TaskAnalysis {
  total: number;
  overdue: number;
  completionRate: number;
  byStatus: Array<{ status: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
  byAgent: Array<{ name: string; total: number; completed: number; pending: number; overdue: number }>;
}

export function TaskAnalysisModal({ open, onClose, params }: { open: boolean; onClose: () => void; params: string }) {
  const { data, err } = useAnalysis<TaskAnalysis>(open, `/api/tasks/analysis?${params}`);
  return (
    <BdModal open={open} onClose={onClose} title="Task Analysis" width={820}>
      {err ? <p className="text-[13px] text-[#e5484d]">{err}</p> : null}
      {!data && !err ? <p className="py-6 text-center text-[13px] text-[#8b90a0]">Loading…</p> : null}
      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <BdKpi label="Total Tasks" value={data.total} />
            <BdKpi label="Overdue" value={data.overdue} tone="red" />
            <BdKpi label="Completion Rate" value={`${data.completionRate}%`} tone="green" />
          </div>
          <Section title="By Status">
            <Bars rows={data.byStatus.map((s) => ({ label: STATUS_LABEL[s.status] ?? s.status, value: s.count }))} />
          </Section>
          <Section title="By Activity Type">
            <Bars color="#7a66e0" rows={data.byType.map((t) => ({ label: typeLabel(t.type), value: t.count }))} />
          </Section>
          <Section title="By Agent">
            <BdTable minWidth={520}>
              <thead>
                <tr>
                  <BdTh>Agent</BdTh>
                  <BdTh>Total</BdTh>
                  <BdTh>Completed</BdTh>
                  <BdTh>Pending</BdTh>
                  <BdTh>Overdue</BdTh>
                </tr>
              </thead>
              <tbody>
                {data.byAgent.map((a) => (
                  <tr key={a.name}>
                    <BdTd>{a.name}</BdTd>
                    <BdTd>{a.total}</BdTd>
                    <BdTd>{a.completed}</BdTd>
                    <BdTd>{a.pending}</BdTd>
                    <BdTd>{a.overdue}</BdTd>
                  </tr>
                ))}
                {!data.byAgent.length ? (
                  <tr>
                    <BdTd colSpan={5} className="text-center text-[#8b90a0]">
                      No data available
                    </BdTd>
                  </tr>
                ) : null}
              </tbody>
            </BdTable>
          </Section>
        </>
      ) : null}
    </BdModal>
  );
}

interface VisitAnalysis {
  total: number;
  cpPresent: number;
  conversionRate: number;
  byStatus: Array<{ status: string; count: number }>;
  byType: Array<{ type: string; count: number }>;
  byProject: Array<{ name: string; count: number }>;
  byAgent: Array<{ name: string; total: number; completed: number; noShow: number; cancelled: number }>;
}

const VISIT_TYPE_LABEL: Record<string, string> = {
  site_visit: "Site Visit",
  revisit: "Revisit",
  final_visit: "Final Visit",
  virtual: "Virtual Visit",
};

export function VisitAnalysisModal({ open, onClose, params }: { open: boolean; onClose: () => void; params: string }) {
  const { data, err } = useAnalysis<VisitAnalysis>(open, `/api/visits/analysis?${params}`);
  return (
    <BdModal open={open} onClose={onClose} title="Site Visit Analysis" width={820}>
      {err ? <p className="text-[13px] text-[#e5484d]">{err}</p> : null}
      {!data && !err ? <p className="py-6 text-center text-[13px] text-[#8b90a0]">Loading…</p> : null}
      {data ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <BdKpi label="Total Site Visits" value={data.total} />
            <BdKpi label="Visited" value={`${data.conversionRate}%`} tone="green" hint="share of visits completed" />
            <BdKpi label="CP Present" value={data.cpPresent} tone="violet" />
          </div>
          <Section title="By Status">
            <Bars rows={data.byStatus.map((s) => ({ label: STATUS_LABEL[s.status] ?? s.status, value: s.count }))} />
          </Section>
          <Section title="By Visit Type">
            <Bars color="#7a66e0" rows={data.byType.map((t) => ({ label: VISIT_TYPE_LABEL[t.type] ?? t.type, value: t.count }))} />
          </Section>
          <Section title="By Project">
            <Bars color="#37c47f" rows={data.byProject.map((p) => ({ label: p.name, value: p.count }))} />
          </Section>
          <Section title="By Agent">
            <BdTable minWidth={520}>
              <thead>
                <tr>
                  <BdTh>Agent</BdTh>
                  <BdTh>Total</BdTh>
                  <BdTh>Visited</BdTh>
                  <BdTh>No Show</BdTh>
                  <BdTh>Cancelled</BdTh>
                </tr>
              </thead>
              <tbody>
                {data.byAgent.map((a) => (
                  <tr key={a.name}>
                    <BdTd>{a.name}</BdTd>
                    <BdTd>{a.total}</BdTd>
                    <BdTd>{a.completed}</BdTd>
                    <BdTd>{a.noShow}</BdTd>
                    <BdTd>{a.cancelled}</BdTd>
                  </tr>
                ))}
                {!data.byAgent.length ? (
                  <tr>
                    <BdTd colSpan={5} className="text-center text-[#8b90a0]">
                      No data available
                    </BdTd>
                  </tr>
                ) : null}
              </tbody>
            </BdTable>
          </Section>
        </>
      ) : null}
    </BdModal>
  );
}
