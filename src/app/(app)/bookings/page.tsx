"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
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
import { MetricStrip } from "@/components/shared/MetricStrip";
import { FilterBar } from "@/components/shared/FilterBar";
import { FilterField } from "@/components/shared/FilterField";
import { DatePicker } from "@/components/ui/date-picker";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { AddBookingDialog } from "@/components/bookings/AddBookingDialog";
import { formatCurrency } from "@/lib/utils";
import { format } from "date-fns";

interface BookingRow {
  _id: string;
  bookingNumber?: string;
  customerName?: string;
  amount?: number;
  stage?: string;
  approvalStatus?: string;
  bookedAt?: string;
  projectId?: { name?: string; code?: string } | null;
  leadId?: { contact?: { name?: string }; leadNumber?: string } | null;
}

export default function BookingsPage() {
  const searchParams = useSearchParams();
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [total, setTotal] = useState(0);
  const [overview, setOverview] = useState({ monthBookings: 0, monthSales: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [projectId, setProjectId] = useState("all");
  const [agentId, setAgentId] = useState("all");
  const [bookedFrom, setBookedFrom] = useState<Date | undefined>();
  const [bookedTo, setBookedTo] = useState<Date | undefined>();
  const [projects, setProjects] = useState<Array<{ _id: string; name: string }>>([]);
  const [agents, setAgents] = useState<Array<{ _id: string; name: string }>>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [openAdd, setOpenAdd] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const load = useCallback(() => {
    setLoading(true);
    const u = new URLSearchParams({
      limit: String(pageSize),
      skip: String((page - 1) * pageSize),
    });
    if (q) u.set("q", q);
    if (approvalFilter !== "all") u.set("approvalStatus", approvalFilter);
    if (projectId !== "all") u.set("projectId", projectId);
    if (agentId !== "all") u.set("salesAgentId", agentId);
    if (bookedFrom) u.set("bookedFrom", format(bookedFrom, "yyyy-MM-dd"));
    if (bookedTo) u.set("bookedTo", format(bookedTo, "yyyy-MM-dd"));
    fetch(`/api/bookings?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setBookings(d.bookings ?? []);
        setTotal(d.total ?? 0);
        setOverview(d.overview ?? { monthBookings: 0, monthSales: 0 });
      })
      .finally(() => setLoading(false));
  }, [q, approvalFilter, projectId, agentId, bookedFrom, bookedTo, page, pageSize]);

  useEffect(() => {
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
  }, [load]);

  useEffect(() => {
    fetch("/api/projects?limit=100", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setProjects(d.projects ?? []));
    fetch("/api/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setAgents(d.users ?? []));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, approvalFilter, projectId, agentId, bookedFrom, bookedTo, pageSize]);

  useEffect(() => {
    if (searchParams.get("new") === "1") setOpenAdd(true);
  }, [searchParams]);

  const updateApproval = async (id: string, approvalStatus: "approved" | "rejected") => {
    const res = await fetch(`/api/bookings/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvalStatus }),
    });
    if (res.ok) {
      toast.success(`Booking ${approvalStatus}`);
      load();
    } else {
      toast.error("Could not update approval");
    }
  };

  return (
    <PageShell>
      <PageBody>
        <MetricStrip
          className="lg:grid-cols-3"
          items={[
            { key: "month", label: "Bookings this month", value: overview.monthBookings, tone: "primary" },
            { key: "sales", label: "Month sales", value: formatCurrency(overview.monthSales) },
            { key: "total", label: "In view", value: total, tone: "muted" },
          ]}
        />

        <Section>
          <FilterBar
            advancedTitle="Advanced booking filters"
            advancedDescription="Narrow by project, agent and booking dates."
            advanced={
              <>
                <FilterField label="Project">
                  <Select value={projectId} onValueChange={setProjectId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All projects" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All projects</SelectItem>
                      {projects.map((p) => (
                        <SelectItem key={p._id} value={p._id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
                <FilterField label="Sales agent">
                  <Select value={agentId} onValueChange={setAgentId}>
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="All agents" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All agents</SelectItem>
                      {agents.map((a) => (
                        <SelectItem key={a._id} value={a._id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FilterField>
                <div className="grid grid-cols-2 gap-3">
                  <FilterField label="Booked from">
                    <DatePicker value={bookedFrom} onChange={setBookedFrom} placeholder="From" />
                  </FilterField>
                  <FilterField label="Booked to">
                    <DatePicker value={bookedTo} onChange={setBookedTo} placeholder="To" />
                  </FilterField>
                </div>
              </>
            }
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
                    setApprovalFilter("all");
                    setProjectId("all");
                    setAgentId("all");
                    setBookedFrom(undefined);
                    setBookedTo(undefined);
                  }}
                >
                  Clear
                </Button>
                <Button size="sm" className="h-9 gap-1" onClick={() => setOpenAdd(true)}>
                  <Plus className="size-3.5" />
                  Add booking
                </Button>
              </>
            }
          >
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search bookings…"
              className="h-9 w-56"
            />
            <Select value={approvalFilter} onValueChange={setApprovalFilter}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue placeholder="Approval" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All approvals</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </FilterBar>
        </Section>

        <DataTableShell
          title="Bookings"
          count={total}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        >
          {loading ? (
            <div className="h-40 animate-pulse bg-slate-50" />
          ) : bookings.length === 0 ? (
            <EmptyState
              title="No bookings found"
              description="Add a booking or clear filters."
              action={
                <Button onClick={() => setOpenAdd(true)} className="gap-1.5">
                  <Plus className="size-4" />
                  Add booking
                </Button>
              }
            />
          ) : (
            <TableRoot>
              <thead>
                <tr>
                  <Th>#</Th>
                  <Th>Booking #</Th>
                  <Th>Customer</Th>
                  <Th>Project</Th>
                  <Th>Amount</Th>
                  <Th>Stage</Th>
                  <Th>Approval</Th>
                  <Th>Booked at</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b, i) => (
                  <tr key={b._id} className="hover:bg-slate-50/80">
                    <Td className="tabular-nums text-slate-400">
                      {(page - 1) * pageSize + i + 1}
                    </Td>
                    <Td className="font-medium text-emerald-700">{b.bookingNumber ?? "—"}</Td>
                    <Td>{b.customerName ?? b.leadId?.contact?.name ?? "—"}</Td>
                    <Td>{b.projectId?.name ?? "—"}</Td>
                    <Td className="tabular-nums font-medium">
                      {formatCurrency(b.amount ?? 0)}
                    </Td>
                    <Td>
                      <StatusPill tone="info">
                        {(b.stage ?? "—").replace(/_/g, " ")}
                      </StatusPill>
                    </Td>
                    <Td>
                      <StatusPill
                        tone={
                          b.approvalStatus === "approved"
                            ? "success"
                            : b.approvalStatus === "rejected"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {(b.approvalStatus ?? "pending").replace(/_/g, " ")}
                      </StatusPill>
                    </Td>
                    <Td className="whitespace-nowrap text-[12px] text-slate-500">
                      {b.bookedAt
                        ? new Date(b.bookedAt).toLocaleString("en-IN", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "—"}
                    </Td>
                    <Td className="text-right">
                      {b.approvalStatus === "pending" ? (
                        <div className="flex justify-end gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => updateApproval(b._id, "approved")}
                          >
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2 text-[11px] text-red-600"
                            onClick={() => updateApproval(b._id, "rejected")}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-[12px] text-slate-400">—</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableRoot>
          )}
        </DataTableShell>
      </PageBody>
      <AddBookingDialog open={openAdd} onOpenChange={setOpenAdd} onCreated={load} />
    </PageShell>
  );
}
