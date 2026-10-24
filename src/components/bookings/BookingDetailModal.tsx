"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { BdButton, BdTable, BdTh, BdTd, BdEmptyRow, BdBadge } from "@/components/bd";
import { BdModal, BdRowActions, BdConfirm } from "@/components/bd/BdOverlays";
import { PaymentFormDialog, type PaymentEditable } from "@/components/bookings/PaymentFormDialog";
import { printReceipt } from "@/components/bookings/receipt";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";

interface Detail {
  _id: string;
  bookingNumber?: string;
  customerName?: string;
  amount?: number;
  paidAmount?: number;
  balanceAmount?: number;
  stage?: string;
  approvalStatus?: string;
  source?: string;
  notes?: string;
  bookedAt?: string;
  projectId?: { name?: string } | null;
  leadId?: { contact?: { name?: string }; leadNumber?: string } | null;
  salesAgentId?: { name?: string } | null;
  brokerId?: { name?: string; firmName?: string } | null;
}

interface Pay extends PaymentEditable {
  receiptNumber?: string;
  finalAmount?: number;
  totalAmount?: number;
}

const fmt = (d?: string) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-");

/** Booking details with its payment ledger (balance = amount - net payments). */
export function BookingDetailModal({
  bookingId,
  onClose,
  onChanged,
}: {
  bookingId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const { workspace } = useAuth();
  const [d, setD] = useState<Detail | null>(null);
  const [pays, setPays] = useState<Pay[]>([]);
  const [payOpen, setPayOpen] = useState(false);
  const [editPay, setEditPay] = useState<Pay | null>(null);
  const [delPay, setDelPay] = useState<Pay | null>(null);

  const load = useCallback(() => {
    if (!bookingId) return;
    fetch(`/api/bookings/${bookingId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((x) => {
        setD(x.booking ?? null);
        setPays(x.payments ?? []);
      })
      .catch(() => toast.error("Could not load booking"));
  }, [bookingId]);

  useEffect(() => {
    setD(null);
    setPays([]);
    load();
  }, [load]);

  const removePay = async () => {
    if (!delPay) return;
    const res = await fetch(`/api/payments/${delPay._id}`, { method: "DELETE" });
    if (!res.ok) return toast.error("Could not delete payment");
    toast.success("Payment deleted");
    setDelPay(null);
    load();
    onChanged();
  };

  const cell = (k: string, v: React.ReactNode) => (
    <div>
      <p className="text-[12px] font-bold text-[#2b2f3a]">{k}</p>
      <p className="text-[13.5px] text-[#2b2f3a]">{v || "-"}</p>
    </div>
  );

  return (
    <>
      <BdModal
        open={!!bookingId}
        title={`Booking ${d?.bookingNumber ?? ""}`}
        onClose={onClose}
        width={980}
        footer={<BdButton variant="light" onClick={onClose}>Close</BdButton>}
      >
        {!d ? (
          <p className="py-8 text-center text-[13px] text-[#8b90a0]">Loading…</p>
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              {cell("Customer", d.customerName ?? d.leadId?.contact?.name)}
              {cell("Project", d.projectId?.name)}
              {cell("Booked On", fmt(d.bookedAt))}
              {cell("Sales Agent", d.salesAgentId?.name)}
              {cell("Channel Partner", d.brokerId ? `${d.brokerId.name}${d.brokerId.firmName ? ` (${d.brokerId.firmName})` : ""}` : "")}
              {cell("Source", d.source)}
              {cell("Stage", <span className="capitalize">{d.stage}</span>)}
              {cell("Approval", <span className="capitalize">{d.approvalStatus}</span>)}
              {cell("Notes", d.notes)}
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["Booking Amount", d.amount ?? 0],
                ["Received", d.paidAmount ?? 0],
                ["Balance", d.balanceAmount ?? 0],
              ].map(([k, v]) => (
                <div key={String(k)} className="bd-card rounded-[3px] px-4 py-3">
                  <p className="text-[13px] text-[#5a6072]">{k}</p>
                  <p className="mt-1 text-[20px] font-medium text-[#2b2f3a]">{formatCurrency(Number(v))}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-center justify-between">
              <h4 className="text-[15px] font-medium">Payments ({pays.length})</h4>
              <BdButton
                onClick={() => {
                  setEditPay(null);
                  setPayOpen(true);
                }}
              >
                Add Payment
              </BdButton>
            </div>
            <BdTable className="mt-3" minWidth={760}>
              <thead>
                <tr>
                  <BdTh>RECEIPT NO.</BdTh>
                  <BdTh>DATE</BdTh>
                  <BdTh>TYPE</BdTh>
                  <BdTh>MODE</BdTh>
                  <BdTh>FINAL AMOUNT</BdTh>
                  <BdTh>ACTION</BdTh>
                </tr>
              </thead>
              <tbody>
                {pays.length === 0 ? (
                  <BdEmptyRow colSpan={6} />
                ) : (
                  pays.map((p) => (
                    <tr key={p._id}>
                      <BdTd>{p.receiptNumber ?? "-"}</BdTd>
                      <BdTd>{fmt(p.date)}</BdTd>
                      <BdTd>
                        <BdBadge color={p.type === "refund" ? "#e5484d" : "#37a46b"}>{p.type === "refund" ? "REFUND" : "RECEIPT"}</BdBadge>
                      </BdTd>
                      <BdTd className="uppercase">{p.paymentType}</BdTd>
                      <BdTd>{formatCurrency(p.finalAmount ?? 0)}</BdTd>
                      <BdTd>
                        <BdRowActions
                          items={[
                            { label: "Print Receipt", onSelect: () => printReceipt({ ...p, bookingId: { bookingNumber: d.bookingNumber } }, workspace?.name ?? "Tristar Realtors") },
                            { label: "Edit", onSelect: () => { setEditPay(p); setPayOpen(true); } },
                            { label: "Delete", danger: true, onSelect: () => setDelPay(p) },
                          ]}
                        />
                      </BdTd>
                    </tr>
                  ))
                )}
              </tbody>
            </BdTable>
          </>
        )}
      </BdModal>
      <PaymentFormDialog
        open={payOpen}
        payment={editPay}
        bookingId={bookingId ?? undefined}
        onClose={() => setPayOpen(false)}
        onSaved={() => {
          load();
          onChanged();
        }}
      />
      <BdConfirm
        open={!!delPay}
        message={`Delete payment ${delPay?.receiptNumber ?? ""}? The booking balance will be recalculated.`}
        onClose={() => setDelPay(null)}
        onConfirm={removePay}
      />
    </>
  );
}
