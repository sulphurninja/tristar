"use client";

import { useCallback, useEffect, useState } from "react";
import { BdButton, BdField, BdTable, BdTh, BdTd, BdEmptyRow } from "@/components/bd";
import { BdModal } from "@/components/bd/BdOverlays";
import { toCsv, downloadCsv } from "@/lib/bd-csv";
import { formatCurrency } from "@/lib/utils";

interface Stmt {
  ledger: { name: string; type: string; openingBalance: number };
  opening: number;
  entries: Array<{
    _id: string;
    date: string;
    voucherNumber?: string;
    type?: string;
    particulars: string;
    narration?: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
  totalDebit: number;
  totalCredit: number;
  closing: number;
}

export const drcr = (n: number) => `${formatCurrency(Math.abs(n))} ${n >= 0 ? "Dr" : "Cr"}`;
const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

/** Ledger statement with date filter and running balance (Dr positive). */
export function LedgerStatementModal({ ledgerId, onClose }: { ledgerId: string | null; onClose: () => void }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applied, setApplied] = useState({ from: "", to: "" });
  const [data, setData] = useState<Stmt | null>(null);

  useEffect(() => {
    setFrom("");
    setTo("");
    setApplied({ from: "", to: "" });
    setData(null);
  }, [ledgerId]);

  const load = useCallback(() => {
    if (!ledgerId) return;
    const u = new URLSearchParams();
    if (applied.from) u.set("dateFrom", applied.from);
    if (applied.to) u.set("dateTo", applied.to);
    fetch(`/api/ledger/${ledgerId}/statement?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setData)
      .catch(() => undefined);
  }, [ledgerId, applied]);
  useEffect(load, [load]);

  const exportCsv = () => {
    if (!data) return;
    downloadCsv(
      `ledger-${data.ledger.name.replace(/\s+/g, "-").toLowerCase()}.csv`,
      toCsv(
        ["Date", "Voucher No", "Type", "Particulars", "Narration", "Debit", "Credit", "Balance"],
        [
          ["", "", "", "Opening Balance", "", "", "", data.opening],
          ...data.entries.map((e) => [fmt(e.date), e.voucherNumber ?? "", e.type ?? "", e.particulars, e.narration ?? "", e.debit || "", e.credit || "", e.balance]),
          ["", "", "", "Closing Balance", "", data.totalDebit, data.totalCredit, data.closing],
        ],
      ),
    );
  };

  return (
    <BdModal open={!!ledgerId} title={`Ledger Statement${data ? ` - ${data.ledger.name}` : ""}`} onClose={onClose} width={1000} footer={<BdButton variant="light" onClick={onClose}>Close</BdButton>}>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <BdField label="From">
          <input type="date" className="bd-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </BdField>
        <BdField label="To">
          <input type="date" className="bd-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </BdField>
        <BdButton onClick={() => setApplied({ from, to })}>Search</BdButton>
        <BdButton
          variant="light"
          onClick={() => {
            setFrom("");
            setTo("");
            setApplied({ from: "", to: "" });
          }}
        >
          Clear
        </BdButton>
        <BdButton variant="light" onClick={exportCsv} disabled={!data}>
          Export CSV
        </BdButton>
      </div>
      <BdTable minWidth={800}>
        <thead>
          <tr>
            <BdTh>DATE</BdTh>
            <BdTh>VOUCHER NO.</BdTh>
            <BdTh>PARTICULARS</BdTh>
            <BdTh>NARRATION</BdTh>
            <BdTh className="text-right">DEBIT</BdTh>
            <BdTh className="text-right">CREDIT</BdTh>
            <BdTh className="text-right">BALANCE</BdTh>
          </tr>
        </thead>
        <tbody>
          {!data ? (
            <BdEmptyRow colSpan={7} loading />
          ) : (
            <>
              <tr className="bg-[#f6f8fd]">
                <BdTd colSpan={6} className="font-medium">Opening Balance</BdTd>
                <BdTd className="text-right font-medium">{drcr(data.opening)}</BdTd>
              </tr>
              {data.entries.length === 0 ? <BdEmptyRow colSpan={7} /> : null}
              {data.entries.map((e) => (
                <tr key={e._id}>
                  <BdTd className="whitespace-nowrap">{fmt(e.date)}</BdTd>
                  <BdTd>{e.voucherNumber ?? "-"}</BdTd>
                  <BdTd>{e.particulars}</BdTd>
                  <BdTd>{e.narration ?? "-"}</BdTd>
                  <BdTd className="text-right">{e.debit ? formatCurrency(e.debit) : ""}</BdTd>
                  <BdTd className="text-right">{e.credit ? formatCurrency(e.credit) : ""}</BdTd>
                  <BdTd className="whitespace-nowrap text-right">{drcr(e.balance)}</BdTd>
                </tr>
              ))}
              <tr className="bg-[#f6f8fd]">
                <BdTd colSpan={4} className="font-medium">Closing Balance</BdTd>
                <BdTd className="text-right font-medium">{formatCurrency(data.totalDebit)}</BdTd>
                <BdTd className="text-right font-medium">{formatCurrency(data.totalCredit)}</BdTd>
                <BdTd className="whitespace-nowrap text-right font-medium">{drcr(data.closing)}</BdTd>
              </tr>
            </>
          )}
        </tbody>
      </BdTable>
    </BdModal>
  );
}
