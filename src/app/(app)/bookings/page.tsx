"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  BdPage,
  BdCard,
  BdStatCard,
  BdField,
  BdSelect,
  BdButton,
  BdTable,
  BdTh,
  BdTd,
  BdEmptyRow,
  BdTableToolbar,
  BdBadge,
} from "@/components/bd";
import { TeamAgentSelects, scopeQuery, type TeamAgentValue } from "@/components/bd/TeamAgentSelects";
import { BdKebab, BdRowActions, BdConfirm } from "@/components/bd/BdOverlays";
import { BookingFormDialog, BOOKING_STAGES, type BookingEditable } from "@/components/bookings/BookingFormDialog";
import { BookingDetailModal } from "@/components/bookings/BookingDetailModal";
import { PaymentFormDialog } from "@/components/bookings/PaymentFormDialog";
import { toCsv, downloadCsv } from "@/lib/bd-csv";
import { formatCurrency } from "@/lib/utils";

interface BookingRow extends BookingEditable {
  bookingNumber?: string;
  approvalStatus?: string;
  paidAmount?: number;
  balanceAmount?: number;
  projectId?: { _id: string; name?: string } | null;
  leadId?: { _id: string; contact?: { name?: string }; leadNumber?: string } | null;
  salesAgentId?: { _id: string; name?: string } | null;
  brokerId?: { _id: string; name?: string; firmName?: string } | null;
}

interface Filters {
  scope: TeamAgentValue;
  projectId: string;
  approvalStatus: string;
  stage: string;
  from: string;
  to: string;
  q: string;
}

const EMPTY: Filters = { scope: { team: "", agent: "" }, projectId: "", approvalStatus: "", stage: "", from: "", to: "", q: "" };

const APPROVAL_COLOR: Record<string, string> = { approved: "#37a46b", rejected: "#e5484d", pending: "#e9a13a" };

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

function BookingsInner() {
  const sp = useSearchParams();
  const [draft, setDraft] = useState<Filters>(EMPTY);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [rows, setRows] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [overview, setOverview] = useState({ monthBookings: 0, monthSales: 0, pending: 0, filteredAmount: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [tableQ, setTableQ] = useState("");
  const [tableQd, setTableQd] = useState("");
  const [projects, setProjects] = useState<Array<{ _id: string; name: string }>>([]);

  const [formOpen, setFormOpen] = useState(sp.get("new") === "1");
  const [editing, setEditing] = useState<BookingRow | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [payFor, setPayFor] = useState<string | null>(null);
  const [del, setDel] = useState<BookingRow | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setTableQd(tableQ), 300);
    return () => clearTimeout(t);
  }, [tableQ]);

  useEffect(() => {
    fetch("/api/projects?limit=300", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []))
      .catch(() => undefined);
  }, []);

  const query = useCallback(
    (extra?: Record<string, string>) => {
      const u = scopeQuery(applied.scope);
      if (applied.projectId) u.set("projectId", applied.projectId);
      if (applied.approvalStatus) u.set("approvalStatus", applied.approvalStatus);
      if (applied.stage) u.set("stage", applied.stage);
      if (applied.from) u.set("bookedFrom", applied.from);
      if (applied.to) u.set("bookedTo", applied.to);
      const q = [applied.q, tableQd].filter(Boolean).join(" ").trim();
      if (q) u.set("q", q);
      for (const [k, v] of Object.entries(extra ?? {})) u.set(k, v);
      return u;
    },
    [applied, tableQd],
  );

  const load = useCallback(() => {
    setLoading(true);
    const u = query({ limit: String(pageSize), skip: String((page - 1) * pageSize) });
    fetch(`/api/bookings?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.bookings ?? []);
        setTotal(d.total ?? 0);
        if (d.overview) setOverview(d.overview);
      })
      .catch(() => toast.error("Could not load bookings"))
      .finally(() => setLoading(false));
  }, [query, page, pageSize]);

  useEffect(load, [load]);
  useEffect(() => setPage(1), [applied, tableQd, pageSize]);

  const setApproval = async (b: BookingRow, approvalStatus: "approved" | "rejected") => {
    const res = await fetch(`/api/bookings/${b._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalStatus }),
    });
    if (!res.ok) return toast.error("Could not update approval");
    toast.success(`Booking ${approvalStatus}`);
    load();
  };

  const remove = async () => {
    if (!del) return;
    const res = await fetch(`/api/bookings/${del._id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(d.error ?? "Could not delete booking");
    toast.success("Booking deleted");
    setDel(null);
    load();
  };

  const exportCsv = async () => {
    const t = toast.loading("Preparing export…");
    try {
      const d = await fetch(`/api/bookings?${query({ export: "1" })}`, { cache: "no-store" }).then((r) => r.json());
      const list: BookingRow[] = d.bookings ?? [];
      downloadCsv(
        "bookings.csv",
        toCsv(
          ["Booking No", "Date", "Customer", "Project", "Sales Agent", "Channel Partner", "Amount", "Received", "Balance", "Stage", "Approval"],
          list.map((b) => [
            b.bookingNumber ?? "",
            fmt(b.bookedAt),
            b.customerName ?? b.leadId?.contact?.name ?? "",
            b.projectId?.name ?? "",
            b.salesAgentId?.name ?? "",
            b.brokerId?.name ?? "",
            b.amount ?? 0,
            b.paidAmount ?? 0,
            b.balanceAmount ?? 0,
            b.stage ?? "",
            b.approvalStatus ?? "",
          ]),
        ),
      );
      toast.success(`Exported ${list.length} bookings`, { id: t });
    } catch {
      toast.error("Export failed", { id: t });
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const apply = () => setApplied(draft);
  const clear = () => {
    setDraft(EMPTY);
    setApplied(EMPTY);
    setTableQ("");
  };

  return (
    <BdPage>
      <BdCard title="Bookings">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <BdField label="Team / Sales Agent" className="md:col-span-2">
            <TeamAgentSelects value={draft.scope} onChange={(scope) => setDraft((d) => ({ ...d, scope }))} selectClassName="!w-full flex-1 min-w-[200px]" className="flex-nowrap" />
          </BdField>
          <BdField label="Project">
            <BdSelect placeholder="Select Project" value={draft.projectId} onChange={(v) => setDraft((d) => ({ ...d, projectId: v }))} options={projects.map((p) => ({ value: p._id, label: p.name }))} />
          </BdField>
          <BdField label="Approval Status">
            <BdSelect
              placeholder="Select Approval Status"
              value={draft.approvalStatus}
              onChange={(v) => setDraft((d) => ({ ...d, approvalStatus: v }))}
              options={[
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" },
              ]}
            />
          </BdField>
          <BdField label="Stage">
            <BdSelect placeholder="Select Stage" value={draft.stage} onChange={(v) => setDraft((d) => ({ ...d, stage: v }))} options={BOOKING_STAGES.map((s) => ({ value: s, label: s.charAt(0).toUpperCase() + s.slice(1) }))} />
          </BdField>
          <BdField label="Booked From">
            <input type="date" className="bd-input" value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} />
          </BdField>
          <BdField label="Booked To">
            <input type="date" className="bd-input" value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} />
          </BdField>
          <BdField label="Search">
            <input className="bd-input" placeholder="Customer or booking no." value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && apply()} />
          </BdField>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <BdButton onClick={apply}>Search</BdButton>
          <BdButton variant="light" onClick={clear}>
            Clear
          </BdButton>
          <BdButton
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-3.5" /> Add Booking
          </BdButton>
        </div>
      </BdCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BdStatCard title="Bookings This Month" value={overview.monthBookings} caption="Booked since the 1st of this month" />
        <BdStatCard title="Month Sales" value={formatCurrency(overview.monthSales)} caption="Total booking value this month" />
        <BdStatCard
          title="Pending Approval"
          value={overview.pending}
          caption="Bookings waiting for approval"
          active={applied.approvalStatus === "pending"}
          onClick={() => {
            const next = applied.approvalStatus === "pending" ? "" : "pending";
            setDraft((d) => ({ ...d, approvalStatus: next }));
            setApplied((a) => ({ ...a, approvalStatus: next }));
          }}
        />
        <BdStatCard title="In View" value={formatCurrency(overview.filteredAmount)} caption={`${total} booking${total === 1 ? "" : "s"} matching filters`} />
      </div>

      <BdCard title={`Bookings (${total})`} actions={<BdKebab items={[{ label: "Export CSV", onSelect: exportCsv }, { label: "Refresh", onSelect: load }]} />}>
        <BdTableToolbar page={page} totalPages={totalPages} onPage={setPage} search={tableQ} onSearch={setTableQ} pageSize={pageSize} onPageSize={setPageSize} />
        <BdTable minWidth={1300}>
          <thead>
            <tr>
              <BdTh>SR. NO.</BdTh>
              <BdTh>BOOKING NO.</BdTh>
              <BdTh>DATE</BdTh>
              <BdTh>CUSTOMER</BdTh>
              <BdTh>PROJECT</BdTh>
              <BdTh>SALES AGENT</BdTh>
              <BdTh>CHANNEL PARTNER</BdTh>
              <BdTh>AMOUNT</BdTh>
              <BdTh>RECEIVED</BdTh>
              <BdTh>BALANCE</BdTh>
              <BdTh>STAGE</BdTh>
              <BdTh>APPROVAL</BdTh>
              <BdTh>ACTION</BdTh>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <BdEmptyRow colSpan={13} loading={loading} />
            ) : (
              rows.map((b, i) => (
                <tr key={b._id}>
                  <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>
                  <BdTd>
                    <button type="button" className="text-[#2d5bd6] underline" onClick={() => setDetailId(b._id)}>
                      {b.bookingNumber ?? "-"}
                    </button>
                  </BdTd>
                  <BdTd className="whitespace-nowrap">{fmt(b.bookedAt)}</BdTd>
                  <BdTd>{b.customerName ?? b.leadId?.contact?.name ?? "-"}</BdTd>
                  <BdTd>{b.projectId?.name ?? "-"}</BdTd>
                  <BdTd>{b.salesAgentId?.name ?? "-"}</BdTd>
                  <BdTd>{b.brokerId?.name ?? "-"}</BdTd>
                  <BdTd className="whitespace-nowrap">{formatCurrency(b.amount ?? 0)}</BdTd>
                  <BdTd className="whitespace-nowrap">{formatCurrency(b.paidAmount ?? 0)}</BdTd>
                  <BdTd className="whitespace-nowrap">{formatCurrency(b.balanceAmount ?? 0)}</BdTd>
                  <BdTd className="capitalize">{b.stage ?? "-"}</BdTd>
                  <BdTd>
                    <BdBadge color={APPROVAL_COLOR[b.approvalStatus ?? "pending"] ?? "#8b90a0"}>{(b.approvalStatus ?? "pending").toUpperCase()}</BdBadge>
                  </BdTd>
                  <BdTd>
                    <BdRowActions
                      items={[
                        { label: "View", onSelect: () => setDetailId(b._id) },
                        { label: "Add Payment", onSelect: () => setPayFor(b._id) },
                        { label: "Approve", hidden: b.approvalStatus === "approved", onSelect: () => setApproval(b, "approved") },
                        { label: "Reject", hidden: b.approvalStatus === "rejected", onSelect: () => setApproval(b, "rejected") },
                        { label: "Edit", onSelect: () => { setEditing(b); setFormOpen(true); } },
                        { label: "Delete", danger: true, onSelect: () => setDel(b) },
                      ]}
                    />
                  </BdTd>
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
      </BdCard>

      <BookingFormDialog open={formOpen} booking={editing} onClose={() => setFormOpen(false)} onSaved={load} />
      <BookingDetailModal bookingId={detailId} onClose={() => setDetailId(null)} onChanged={load} />
      <PaymentFormDialog open={!!payFor} bookingId={payFor ?? undefined} onClose={() => setPayFor(null)} onSaved={load} />
      <BdConfirm open={!!del} message={`Delete booking ${del?.bookingNumber ?? ""}?`} onClose={() => setDel(null)} onConfirm={remove} />
    </BdPage>
  );
}

export default function BookingsPage() {
  return (
    <Suspense fallback={null}>
      <BookingsInner />
    </Suspense>
  );
}
