"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { PageShell, PageBody, Section } from "@/components/shared/PageShell";
import { FilterBar } from "@/components/shared/FilterBar";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddLedgerDialog } from "@/components/accounts/AddLedgerDialog";
import { formatCurrency, formatPhone } from "@/lib/utils";

interface LedgerRow {
  _id: string;
  name?: string;
  email?: string;
  mobile?: string;
  gstNo?: string;
  openingBalance?: number;
  type?: string;
}

export default function LedgerPage() {
  const [ledgers, setLedgers] = useState<LedgerRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openAdd, setOpenAdd] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(() => {
    setLoading(true);
    const u = new URLSearchParams();
    if (q) u.set("q", q);
    if (type !== "all") u.set("type", type);
    fetch(`/api/ledger?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setLedgers(d.ledgers ?? []);
        setTotal(d.total ?? (d.ledgers?.length ?? 0));
      })
      .finally(() => setLoading(false));
  }, [q, type]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [q, type, pageSize]);

  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return ledgers.slice(start, start + pageSize);
  }, [ledgers, page, pageSize]);

  return (
    <PageShell>
      <PageBody>
        <Section>
          <FilterBar
            actions={
              <>
                <Button size="sm" variant="outline" onClick={load}>
                  Search
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setQ("");
                    setType("all");
                  }}
                >
                  Clear
                </Button>
                <Button size="sm" className="h-9 gap-1" onClick={() => setOpenAdd(true)}>
                  <Plus className="size-3.5" />
                  Add ledger
                </Button>
              </>
            }
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, phone, GST…"
              className="h-9 w-56"
            />
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue placeholder="Group" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All groups</SelectItem>
                <SelectItem value="customer">Sundry Debtors</SelectItem>
                <SelectItem value="vendor">Sundry Creditors</SelectItem>
                <SelectItem value="broker">Channel Partner</SelectItem>
                <SelectItem value="bank">Bank Accounts</SelectItem>
                <SelectItem value="cash">Cash-in-hand</SelectItem>
                <SelectItem value="direct_income">Direct Income</SelectItem>
                <SelectItem value="direct_expense">Direct Expenses</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>
        </Section>

        <DataTableShell
          title="Ledgers"
          count={total}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        >
          {loading ? (
            <div className="h-40 animate-pulse bg-slate-50" />
          ) : pageRows.length === 0 ? (
            <EmptyState
              title="No ledgers found"
              description="Create a ledger account to get started."
              action={
                <Button onClick={() => setOpenAdd(true)} className="gap-1.5">
                  <Plus className="size-4" />
                  Add ledger
                </Button>
              }
            />
          ) : (
            <TableRoot>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Contact</Th>
                  <Th>Email</Th>
                  <Th>GST No.</Th>
                  <Th>Opening balance</Th>
                  <Th>Group</Th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((l) => (
                  <tr key={l._id} className="hover:bg-slate-50/80">
                    <Td className="font-medium text-emerald-700">{l.name ?? "—"}</Td>
                    <Td className="tabular-nums">{l.mobile ? formatPhone(l.mobile) : "—"}</Td>
                    <Td>{l.email ?? "—"}</Td>
                    <Td className="font-mono text-[12px]">{l.gstNo ?? "—"}</Td>
                    <Td className="tabular-nums font-medium">
                      {formatCurrency(l.openingBalance ?? 0)}
                    </Td>
                    <Td>
                      <StatusPill tone="info">
                        {(l.type ?? "customer").replace(/_/g, " ")}
                      </StatusPill>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableRoot>
          )}
        </DataTableShell>
      </PageBody>
      <AddLedgerDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={load} />
    </PageShell>
  );
}
