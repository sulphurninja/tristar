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
import { BdKebab, BdRowActions, BdConfirm } from "@/components/bd/BdOverlays";
import { CampaignFormDialog, CHANNELS, CAMPAIGN_STATUSES, type CampaignEditable } from "@/components/campaigns/CampaignFormDialog";
import { toCsv, downloadCsv } from "@/lib/bd-csv";
import { formatCurrency } from "@/lib/utils";

interface CampaignRow extends CampaignEditable {
  leads?: number;
  bookings?: number;
}

const STATUS_COLOR: Record<string, string> = { draft: "#8b90a0", active: "#37a46b", paused: "#e9a13a", completed: "#3a5dc2" };
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");
const label = (list: Array<{ value: string; label: string }>, v?: string) => list.find((x) => x.value === v)?.label ?? v ?? "-";

function CampaignsInner() {
  const sp = useSearchParams();
  const [draft, setDraft] = useState({ channel: "", status: "", q: "" });
  const [applied, setApplied] = useState({ channel: "", status: "", q: "" });
  const [rows, setRows] = useState<CampaignRow[]>([]);
  const [summary, setSummary] = useState({ active: 0, paused: 0, completed: 0, draft: 0, budget: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [tableQ, setTableQ] = useState("");
  const [formOpen, setFormOpen] = useState(sp.get("new") === "1");
  const [editing, setEditing] = useState<CampaignRow | null>(null);
  const [del, setDel] = useState<CampaignRow | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const u = new URLSearchParams();
    if (applied.channel) u.set("channel", applied.channel);
    if (applied.status) u.set("status", applied.status);
    const q = [applied.q, tableQ].filter(Boolean).join(" ").trim();
    if (q) u.set("q", q);
    fetch(`/api/campaigns?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.campaigns ?? []);
        if (d.summary) setSummary(d.summary);
      })
      .catch(() => toast.error("Could not load campaigns"))
      .finally(() => setLoading(false));
  }, [applied, tableQ]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => setPage(1), [applied, tableQ, pageSize]);

  const setStatus = async (c: CampaignRow, status: string) => {
    const res = await fetch(`/api/campaigns/${c._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) return toast.error("Could not change status");
    toast.success(`Campaign marked ${status}`);
    load();
  };

  const remove = async () => {
    if (!del) return;
    const res = await fetch(`/api/campaigns/${del._id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not delete campaign");
    toast.success("Campaign deleted");
    setDel(null);
    load();
  };

  const exportCsv = () => {
    downloadCsv(
      "campaigns.csv",
      toCsv(
        ["Campaign", "Channel", "Status", "UTM Source", "UTM Medium", "UTM Campaign", "Budget", "Start", "End", "Leads", "Bookings", "Cost Per Lead"],
        rows.map((c) => [c.name, label(CHANNELS, c.channel), label(CAMPAIGN_STATUSES, c.status), c.utmSource ?? "", c.utmMedium ?? "", c.utmCampaign ?? "", c.budget ?? "", fmt(c.startDate), fmt(c.endDate), c.leads ?? 0, c.bookings ?? 0, c.budget && c.leads ? Math.round(c.budget / c.leads) : ""]),
      ),
    );
    toast.success(`Exported ${rows.length} campaigns`);
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const toggleStat = (status: string) => {
    const next = applied.status === status ? "" : status;
    setDraft((d) => ({ ...d, status: next }));
    setApplied((a) => ({ ...a, status: next }));
  };

  return (
    <BdPage>
      <BdCard title="Campaigns">
        <div className="grid gap-4 md:grid-cols-3">
          <BdField label="Channel">
            <BdSelect placeholder="Select Channel" value={draft.channel} onChange={(v) => setDraft((d) => ({ ...d, channel: v }))} options={CHANNELS} />
          </BdField>
          <BdField label="Status">
            <BdSelect placeholder="Select Status" value={draft.status} onChange={(v) => setDraft((d) => ({ ...d, status: v }))} options={CAMPAIGN_STATUSES} />
          </BdField>
          <BdField label="Search">
            <input className="bd-input" placeholder="Campaign name" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && setApplied(draft)} />
          </BdField>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <BdButton onClick={() => setApplied(draft)}>Search</BdButton>
          <BdButton
            variant="light"
            onClick={() => {
              const e = { channel: "", status: "", q: "" };
              setDraft(e);
              setApplied(e);
              setTableQ("");
            }}
          >
            Clear
          </BdButton>
          <BdButton
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-3.5" /> Add Campaign
          </BdButton>
        </div>
      </BdCard>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BdStatCard title="Active" value={summary.active} caption="Campaigns running now" active={applied.status === "active"} onClick={() => toggleStat("active")} />
        <BdStatCard title="Paused" value={summary.paused} caption="Campaigns on hold" active={applied.status === "paused"} onClick={() => toggleStat("paused")} />
        <BdStatCard title="Completed" value={summary.completed} caption="Finished campaigns" active={applied.status === "completed"} onClick={() => toggleStat("completed")} />
        <BdStatCard title="Total Budget" value={formatCurrency(summary.budget)} caption="Across all campaigns" />
      </div>

      <BdCard title={`Campaigns (${rows.length})`} actions={<BdKebab items={[{ label: "Export CSV", onSelect: exportCsv }, { label: "Refresh", onSelect: load }]} />}>
        <BdTableToolbar page={page} totalPages={totalPages} onPage={setPage} search={tableQ} onSearch={setTableQ} pageSize={pageSize} onPageSize={setPageSize} />
        <BdTable minWidth={1300}>
          <thead>
            <tr>
              <BdTh>SR. NO.</BdTh>
              <BdTh>CAMPAIGN</BdTh>
              <BdTh>CHANNEL</BdTh>
              <BdTh>STATUS</BdTh>
              <BdTh>UTM SOURCE</BdTh>
              <BdTh>UTM MEDIUM</BdTh>
              <BdTh>UTM CAMPAIGN</BdTh>
              <BdTh>BUDGET</BdTh>
              <BdTh>START DATE</BdTh>
              <BdTh>END DATE</BdTh>
              <BdTh>LEADS</BdTh>
              <BdTh>BOOKINGS</BdTh>
              <BdTh>COST / LEAD</BdTh>
              <BdTh>ACTION</BdTh>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <BdEmptyRow colSpan={14} loading={loading} />
            ) : (
              pageRows.map((c, i) => (
                <tr key={c._id}>
                  <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>
                  <BdTd className="font-medium">{c.name}</BdTd>
                  <BdTd>{label(CHANNELS, c.channel)}</BdTd>
                  <BdTd>
                    <BdBadge color={STATUS_COLOR[c.status ?? "draft"]}>{label(CAMPAIGN_STATUSES, c.status).toUpperCase()}</BdBadge>
                  </BdTd>
                  <BdTd>{c.utmSource ?? "-"}</BdTd>
                  <BdTd>{c.utmMedium ?? "-"}</BdTd>
                  <BdTd>{c.utmCampaign ?? "-"}</BdTd>
                  <BdTd className="whitespace-nowrap">{c.budget != null ? formatCurrency(c.budget) : "-"}</BdTd>
                  <BdTd className="whitespace-nowrap">{fmt(c.startDate)}</BdTd>
                  <BdTd className="whitespace-nowrap">{fmt(c.endDate)}</BdTd>
                  <BdTd>{c.leads ?? 0}</BdTd>
                  <BdTd>{c.bookings ?? 0}</BdTd>
                  <BdTd className="whitespace-nowrap">{c.budget && c.leads ? formatCurrency(Math.round(c.budget / c.leads)) : "-"}</BdTd>
                  <BdTd>
                    <BdRowActions
                      items={[
                        { label: "Edit", onSelect: () => { setEditing(c); setFormOpen(true); } },
                        { label: "Mark Active", hidden: c.status === "active", onSelect: () => setStatus(c, "active") },
                        { label: "Pause", hidden: c.status !== "active", onSelect: () => setStatus(c, "paused") },
                        { label: "Mark Completed", hidden: c.status === "completed", onSelect: () => setStatus(c, "completed") },
                        { label: "Delete", danger: true, onSelect: () => setDel(c) },
                      ]}
                    />
                  </BdTd>
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
      </BdCard>

      <CampaignFormDialog open={formOpen} campaign={editing} onClose={() => setFormOpen(false)} onSaved={load} />
      <BdConfirm open={!!del} message={`Delete campaign "${del?.name}"?`} onClose={() => setDel(null)} onConfirm={remove} />
    </BdPage>
  );
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={null}>
      <CampaignsInner />
    </Suspense>
  );
}
