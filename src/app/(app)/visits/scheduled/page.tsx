"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  BdBadge,
  BdButton,
  BdCard,
  BdEmptyRow,
  BdKpi,
  BdPage,
  BdTable,
  BdTableToolbar,
  BdTd,
  BdTh,
  BdTabs,
} from "@/components/bd";
import { downloadCsv } from "@/lib/csv";
import { leadHref } from "@/components/tasks/shared";

interface PlannedVisit {
  _id: string;
  scheduledAt: string;
  status: string;
  description?: string;
  remark?: string;
  leadId?: { _id: string; contact?: { name?: string; primaryPhone?: string }; description?: string };
  projectId?: { _id: string; name?: string };
  assignedToName?: string;
  assignedTo?: { _id: string; name?: string };
}

type Range = "today" | "tomorrow" | "week" | "all";
const RANGES: Array<{ key: Range; label: string }> = [
  { key: "today", label: "Today" },
  { key: "tomorrow", label: "Tomorrow" },
  { key: "week", label: "This week" },
  { key: "all", label: "All upcoming" },
];

/** SVP Dashboard: "Scheduled Visit Planned Report". */
export default function SVPDashboardPage() {
  const [items, setItems] = useState<PlannedVisit[]>([]);
  const [visited, setVisited] = useState(0);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>("today");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({ range, status: "planned,confirmed,rescheduled" });
    fetch(`/api/visits/scheduled?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setItems(d.visits ?? []);
        setVisited(d.visited ?? 0);
        setPage(1);
      })
      .catch(() => toast.error("Could not load planned visits."))
      .finally(() => setLoading(false));
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? items.filter((v) =>
        [v.leadId?.contact?.name, v.leadId?.contact?.primaryPhone, v.projectId?.name, v.assignedTo?.name, v.assignedToName]
          .filter(Boolean)
          .some((s) => String(s).toLowerCase().includes(q)),
      )
    : items;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const exportCsv = () =>
    downloadCsv(`svp-${range}`, [
      ["Name", "Scheduled Date", "Day", "Time", "Assigned To", "Project", "Description"],
      ...filtered.map((v) => {
        const d = new Date(v.scheduledAt);
        return [
          v.leadId?.contact?.name ?? "",
          d.toLocaleDateString("en-IN"),
          d.toLocaleDateString("en-IN", { weekday: "long" }),
          d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
          v.assignedToName ?? v.assignedTo?.name ?? "",
          v.projectId?.name ?? "",
          v.remark ?? v.description ?? v.leadId?.description ?? "",
        ];
      }),
    ]);

  return (
    <div>
      <div className="border-b border-[#e6e9f2] bg-white pt-2">
        <BdTabs tabs={RANGES} value={range} onChange={setRange} />
      </div>
      <BdPage>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <BdKpi label="Scheduled Visits" value={filtered.length} />
          <BdKpi label="Visited" value={visited} tone="green" />
        </div>
        <BdCard
          title="Scheduled Visit Planned Report"
          actions={
            <>
              <BdButton onClick={exportCsv}>Export</BdButton>
              <Link href="/tasks?tab=calendar" className="bd-btn-light inline-flex items-center">
                Calendar view
              </Link>
              <Link href="/tasks?tab=site-visit&new=1" className="bd-btn inline-flex items-center">
                Add
              </Link>
            </>
          }
        >
          <BdTableToolbar
            page={page}
            totalPages={totalPages}
            onPage={setPage}
            search={search}
            onSearch={(v) => {
              setSearch(v);
              setPage(1);
            }}
            pageSize={pageSize}
            onPageSize={(n) => {
              setPageSize(n);
              setPage(1);
            }}
          />
          <BdTable minWidth={900}>
            <thead>
              <tr>
                <BdTh>#</BdTh>
                <BdTh>Name</BdTh>
                <BdTh>Scheduled Date</BdTh>
                <BdTh>Day</BdTh>
                <BdTh>Time</BdTh>
                <BdTh>Assigned To</BdTh>
                <BdTh>Project</BdTh>
                <BdTh>Description</BdTh>
                <BdTh>Status</BdTh>
              </tr>
            </thead>
            <tbody>
              {pageItems.length === 0 ? (
                <BdEmptyRow colSpan={9} loading={loading} />
              ) : (
                pageItems.map((v, i) => {
                  const d = new Date(v.scheduledAt);
                  return (
                    <tr key={v._id}>
                      <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>
                      <BdTd>
                        <Link href={leadHref(v.leadId?._id)} className="text-[#1a0dab] underline underline-offset-2">
                          {v.leadId?.contact?.name ?? "Unknown lead"}
                        </Link>
                      </BdTd>
                      <BdTd>{d.toLocaleDateString("en-IN", { day: "2-digit", month: "2-digit", year: "numeric" })}</BdTd>
                      <BdTd>{d.toLocaleDateString("en-IN", { weekday: "long" })}</BdTd>
                      <BdTd className="tabular-nums">{d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })}</BdTd>
                      <BdTd>{v.assignedToName ?? v.assignedTo?.name ?? "-"}</BdTd>
                      <BdTd>{v.projectId?.name ?? "-"}</BdTd>
                      <BdTd className="max-w-xs">
                        <span className="line-clamp-2">{v.remark ?? v.description ?? v.leadId?.description ?? "-"}</span>
                      </BdTd>
                      <BdTd>
                        <BdBadge color={v.status === "confirmed" ? "#3a5dc2" : "#e9a52a"}>
                          {v.status === "confirmed" ? "Confirmed" : "Scheduled"}
                        </BdBadge>
                      </BdTd>
                    </tr>
                  );
                })
              )}
            </tbody>
          </BdTable>
        </BdCard>
      </BdPage>
    </div>
  );
}
