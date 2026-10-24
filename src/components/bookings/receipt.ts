import { formatCurrency } from "@/lib/utils";

export interface ReceiptPayment {
  receiptNumber?: string;
  type?: string;
  date?: string;
  customerName?: string;
  paymentFor?: string;
  paymentType?: string;
  bankDetails?: string;
  ledgerAccount?: string;
  netAmount?: number;
  taxAmount?: number;
  tds?: number;
  totalAmount?: number;
  finalAmount?: number;
  bookingId?: { bookingNumber?: string } | string | null;
}

const esc = (s: unknown) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Opens a printable payment receipt in a new window. */
export function printReceipt(p: ReceiptPayment, company: string) {
  const w = window.open("", "_blank", "width=800,height=900");
  if (!w) return false;
  const booking = p.bookingId && typeof p.bookingId === "object" ? p.bookingId.bookingNumber : "";
  const row = (k: string, v: string) => `<tr><th>${esc(k)}</th><td>${esc(v || "-")}</td></tr>`;
  const title = p.type === "refund" ? "Payment Refund" : "Payment Receipt";
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} ${esc(p.receiptNumber)}</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;color:#222;margin:40px}
h1{font-size:20px;margin:0}h2{font-size:15px;font-weight:600;margin:4px 0 24px;color:#555}
table{width:100%;border-collapse:collapse;margin-top:8px}
th,td{border:1px solid #d9dce6;padding:9px 12px;font-size:13px;text-align:left}
th{width:34%;background:#f4f6fc;font-weight:600}
.amt td,.amt th{font-size:15px;font-weight:700}
.foot{margin-top:60px;display:flex;justify-content:space-between;font-size:12px;color:#555}
@media print{button{display:none}}
</style></head><body>
<h1>${esc(company)}</h1><h2>${esc(title)}</h2>
<table>
${row("Receipt No.", p.receiptNumber ?? "")}
${row("Date", p.date ? new Date(p.date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "")}
${row("Received From", p.customerName ?? "")}
${row("Booking", booking ?? "")}
${row("Payment For", p.paymentFor ?? "")}
${row("Payment Type", (p.paymentType ?? "").toUpperCase())}
${row("Reference / Bank", p.bankDetails ?? "")}
${row("Ledger Account", p.ledgerAccount ?? "")}
${row("Net Amount", formatCurrency(p.netAmount ?? 0))}
${row("Tax Amount", formatCurrency(p.taxAmount ?? 0))}
${row("TDS", formatCurrency(p.tds ?? 0))}
<tr class="amt"><th>Amount ${p.type === "refund" ? "Refunded" : "Received"}</th><td>${esc(formatCurrency(p.finalAmount ?? 0))}</td></tr>
</table>
<div class="foot"><span>Customer signature</span><span>Authorised signatory</span></div>
<p style="margin-top:30px"><button onclick="window.print()">Print</button></p>
<script>window.onload=function(){setTimeout(function(){window.print()},300)}</script>
</body></html>`);
  w.document.close();
  return true;
}
