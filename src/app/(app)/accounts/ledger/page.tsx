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
} from "@/components/bd";
import { BdKebab, BdRowActions, BdConfirm } from "@/components/bd/BdOverlays";
import { LedgerFormDialog, LEDGER_GROUP_OPTIONS, type LedgerEditable } from "@/components/accounts/LedgerFormDialog";
import { LedgerStatementModal, drcr } from "@/components/accounts/LedgerStatementModal";
import { toCsv, downloadCsv } from "@/lib/bd-csv";
import { formatCurrency } from "@/lib/utils";

interface LedgerRow extends LedgerEditable {
  debit?: number;
  credit?: number;
  balance?: number;
}

const groupLabel = (v?: string) => LEDGER_GROUP_OPTIONS.find((g) => g.value === v)?.label ?? v ?? "-";

function LedgerInner() {
  const sp = useSearchParams();
  const [draft, setDraft] = useState({ type: "", q: "" });
  const [applied, setApplied] = useState({ type: "", q: "" });
  const [rows, setRows] = useState<LedgerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [tableQ, setTableQ] = useState("");
  const [formOpen, setFormOpen] = useState(sp.get("new") === "1");
  const [editing, setEditing] = useState<LedgerRow | null>(null);
  const [stmtId, setStmtId] = useState<string | null>(null);
  const [del, setDel] = useState<LedgerRow | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    const u = new URLSearchParams();
    if (applied.type) u.set("type", applied.type);
    const q = [applied.q, tableQ].filter(Boolean).join(" ").trim();
    if (q) u.set("q", q);
    fetch(`/api/ledger?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d.ledgers ?? []))
      .catch(() => toast.error("Could not load ledgers"))
      .finally(() => setLoading(false));
  }, [applied, tableQ]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);
  useEffect(() => setPage(1), [applied, tableQ, pageSize]);

  const remove = async () => {
    if (!del) return;
    const res = await fetch(`/api/ledger/${del._id}`, { method: "DELETE" });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return toast.error(d.error ?? "Could not delete ledger");
    toast.success("Ledger deleted");
    setDel(null);
    load();
  };

  const exportCsv = () => {
    downloadCsv(
      "ledgers.csv",
      toCsv(
        ["Ledger Name", "Group", "Mobile", "Email", "GST No", "Opening Balance", "Debit", "Credit", "Balance"],
        rows.map((l) => [l.name, groupLabel(l.type), l.mobile ?? "", l.email ?? "", l.gstNo ?? "", l.openingBalance ?? 0, l.debit ?? 0, l.credit ?? 0, l.balance ?? 0]),
      ),
    );
    toast.success(`Exported ${rows.length} ledgers`);
  };

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice((page - 1) * pageSize, page * pageSize);
  const totalDr = rows.reduce((s, l) => s + Math.max(l.balance ?? 0, 0), 0);
  const totalCr = rows.reduce((s, l) => s + Math.max(-(l.balance ?? 0), 0), 0);

  return (
    <BdPage>
      <BdCard title="Ledger">
        <div className="grid gap-4 md:grid-cols-3">
          <BdField label="Group">
            <BdSelect placeholder="Select Group" value={draft.type} onChange={(v) => setDraft((d) => ({ ...d, type: v }))} options={LEDGER_GROUP_OPTIONS} />
          </BdField>
          <BdField label="Search">
            <input className="bd-input" placeholder="Name, mobile, email, GST" value={draft.q} onChange={(e) => setDraft((d) => ({ ...d, q: e.target.value }))} onKeyDown={(e) => e.key === "Enter" && setApplied(draft)} />
          </BdField>
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <BdButton onClick={() => setApplied(draft)}>Search</BdButton>
          <BdButton
            variant="light"
            onClick={() => {
              setDraft({ type: "", q: "" });
              setApplied({ type: "", q: "" });
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
            <Plus className="size-3.5" /> Add Ledger
          </BdButton>
        </div>
      </BdCard>

      <div className="grid gap-4 sm:grid-cols-3">
        <BdStatCard title="Ledgers" value={rows.length} caption="Accounts matching filters" />
        <BdStatCard title="Total Debit Balance" value={formatCurrency(totalDr)} caption="Sum of ledgers in debit" />
        <BdStatCard title="Total Credit Balance" value={formatCurrency(totalCr)} caption="Sum of ledgers in credit" />
      </div>

      <BdCard title={`Ledger (${rows.length})`} actions={<BdKebab items={[{ label: "Export CSV", onSelect: exportCsv }, { label: "Refresh", onSelect: load }]} />}>
        <BdTableToolbar page={page} totalPages={totalPages} onPage={setPage} search={tableQ} onSearch={setTableQ} pageSize={pageSize} onPageSize={setPageSize} />
        <BdTable minWidth={1200}>
          <thead>
            <tr>
              <BdTh>SR. NO.</BdTh>
              <BdTh>LEDGER NAME</BdTh>
              <BdTh>GROUP</BdTh>
              <BdTh>MOBILE</BdTh>
              <BdTh>EMAIL</BdTh>
              <BdTh>GST NO.</BdTh>
              <BdTh className="text-right">OPENING BALANCE</BdTh>
              <BdTh className="text-right">DEBIT</BdTh>
              <BdTh className="text-right">CREDIT</BdTh>
              <BdTh className="text-right">BALANCE</BdTh>
              <BdTh>ACTION</BdTh>
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <BdEmptyRow colSpan={11} loading={loading} />
            ) : (
              pageRows.map((l, i) => (
                <tr key={l._id}>
                  <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>
                  <BdTd>
                    <button type="button" className="text-[#2d5bd6] underline" onClick={() => setStmtId(l._id)}>
                      {l.name}
                    </button>
                  </BdTd>
                  <BdTd>{groupLabel(l.type)}</BdTd>
                  <BdTd>{l.mobile ?? "-"}</BdTd>
                  <BdTd>{l.email ?? "-"}</BdTd>
                  <BdTd>{l.gstNo ?? "-"}</BdTd>
                  <BdTd className="whitespace-nowrap text-right">{formatCurrency(l.openingBalance ?? 0)}</BdTd>
                  <BdTd className="whitespace-nowrap text-right">{formatCurrency(l.debit ?? 0)}</BdTd>
                  <BdTd className="whitespace-nowrap text-right">{formatCurrency(l.credit ?? 0)}</BdTd>
                  <BdTd className="whitespace-nowrap text-right font-medium">{drcr(l.balance ?? 0)}</BdTd>
                  <BdTd>
                    <BdRowActions
                      items={[
                        { label: "View Statement", onSelect: () => setStmtId(l._id) },
                        { label: "Edit", onSelect: () => { setEditing(l); setFormOpen(true); } },
                        { label: "Delete", danger: true, onSelect: () => setDel(l) },
                      ]}
                    />
                  </BdTd>
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
      </BdCard>

      <LedgerFormDialog open={formOpen} ledger={editing} onClose={() => setFormOpen(false)} onSaved={load} />
      <LedgerStatementModal ledgerId={stmtId} onClose={() => setStmtId(null)} />
      <BdConfirm open={!!del} message={`Delete ledger "${del?.name}"?`} onClose={() => setDel(null)} onConfirm={remove} />
    </BdPage>
  );
}

export default function LedgerPage() {
  return (
    <Suspense fallback={null}>
      <LedgerInner />
    </Suspense>
  );
}
