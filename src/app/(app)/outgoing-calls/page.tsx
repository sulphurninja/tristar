"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Download } from "lucide-react";
import { ReportShell } from "@/components/reports/ReportShell";
import {
  BdBadge,
  BdButton,
  BdCard,
  BdEmptyRow,
  BdKpi,
  BdSelect,
  BdTable,
  BdTableToolbar,
  BdTd,
  BdTh,
  formatBdDate,
} from "@/components/bd";
import { useReportFilters } from "@/hooks/useReportFilters";
import { downloadCsv } from "@/lib/csv";

interface Row {
  id: string;
  title: string;
  leadId: string | null;
  leadNumber: string;
  leadName: string;
  phone: string;
  agent: string;
  scheduleAt: string | null;
  completedAt: string | null;
  status: "pending" | "upcoming" | "completed" | "cancelled";
  delayed: boolean;
  remark: string;
}
interface Data {
  rows: Row[];
  summary: { total: number; completed: number; pending: number; delayed: number };
}

const STATUS_COLOR = { pending: "#e9b72a", upcoming: "#3d7be8", completed: "#37b24d", cancelled: "#9a9ca6" } as const;

export default function OutgoingCallsPage() {
  const f = useReportFilters("7d");
  const [status, setStatus] = useState("");
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const query = useMemo(() => {
    const p = new URLSearchParams(f.query);
    if (status) p.set("status", status);
    return p.toString();
  }, [f.query, status]);

  useEffect(() => {
    if (!f.ready) return;
    setLoading(true);
    let live = true;
    fetch(`/api/reports/outgoing-calls?${query}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => live && setData(d.error ? null : d))
      .catch(() => live && setData(null))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
  }, [query, f.ready]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = data?.rows ?? [];
    return q
      ? rows.filter((r) => [r.leadName, r.phone, r.leadNumber, r.agent, r.title, r.remark].some((v) => v?.toLowerCase().includes(q)))
      : rows;
  }, [data, search]);
  useEffect(() => setPage(1), [search, pageSize, query]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const s = data?.summary;

  return (
    <ReportShell
      title="Outgoing Calls"
      description="Call tasks scheduled in the selected window and how they were handled."
      range={f.range}
      onRangeChange={f.setRange}
      from={f.from}
      to={f.to}
      onDatesChange={f.onDatesChange}
      scope={f.scope}
      onScopeChange={f.setScope}
      onReset={() => {
        f.reset();
        setStatus("");
      }}
      rightExtra={
        <BdButton
          variant="light"
          disabled={!data}
          onClick={() =>
            downloadCsv(`outgoing-calls-${f.range}`, [
              ["Lead", "Lead No.", "Phone", "Sales Agent", "Scheduled", "Completed", "Status", "Delayed", "Remark"],
              ...filtered.map((r) => [
                r.leadName,
                r.leadNumber,
                r.phone,
                r.agent,
                r.scheduleAt ?? "",
                r.completedAt ?? "",
                r.status,
                r.delayed ? "Yes" : "No",
                r.remark,
              ]),
            ])
          }
        >
          <Download className="size-3.5" /> Export CSV
        </BdButton>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BdKpi label="Total Calls" value={s?.total ?? 0} tone="violet" />
        <BdKpi label="Completed" value={s?.completed ?? 0} tone="green" />
        <BdKpi label="Pending" value={s?.pending ?? 0} tone="yellow" />
        <BdKpi label="Delayed" value={s?.delayed ?? 0} tone="red" />
      </div>

      <BdCard>
        <BdTableToolbar
          page={page}
          totalPages={totalPages}
          onPage={setPage}
          search={search}
          onSearch={setSearch}
          pageSize={pageSize}
          onPageSize={setPageSize}
          left={
            <BdSelect
              className="w-[180px]"
              placeholder="All Status"
              value={status}
              onChange={setStatus}
              options={[
                { value: "pending", label: "Pending" },
                { value: "upcoming", label: "Upcoming" },
                { value: "completed", label: "Completed" },
                { value: "cancelled", label: "Cancelled" },
              ]}
            />
          }
        />
        <BdTable minWidth={980}>
          <thead>
            <tr>
              <BdTh>#</BdTh>
              <BdTh>Lead</BdTh>
              <BdTh>Phone</BdTh>
              <BdTh>Sales Agent</BdTh>
              <BdTh>Scheduled</BdTh>
              <BdTh>Completed</BdTh>
              <BdTh>Status</BdTh>
              <BdTh>Remark</BdTh>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <BdEmptyRow colSpan={8} loading={loading || !f.ready} />
            ) : (
              paged.map((r, i) => (
                <tr key={r.id}>
                  <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>
                  <BdTd>
                    {r.leadId ? (
                      <Link href={`/leads?open=${r.leadId}`} className="font-medium text-[#3a5dc2] hover:underline">
                        {r.leadName || r.title}
                      </Link>
                    ) : (
                      r.title
                    )}
                    {r.leadNumber ? <p className="text-[11.5px] text-[#8b90a0]">{r.leadNumber}</p> : null}
                  </BdTd>
                  <BdTd>{r.phone || "-"}</BdTd>
                  <BdTd>{r.agent}</BdTd>
                  <BdTd className="whitespace-nowrap">{formatBdDate(r.scheduleAt)}</BdTd>
                  <BdTd className="whitespace-nowrap">{formatBdDate(r.completedAt)}</BdTd>
                  <BdTd>
                    <span className="flex items-center gap-1.5">
                      <BdBadge color={STATUS_COLOR[r.status]} className="capitalize">
                        {r.status}
                      </BdBadge>
                      {r.delayed ? <BdBadge color="#e5484d">Delayed</BdBadge> : null}
                    </span>
                  </BdTd>
                  <BdTd className="max-w-[240px] truncate">{r.remark || "-"}</BdTd>
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
      </BdCard>
    </ReportShell>
  );
}
