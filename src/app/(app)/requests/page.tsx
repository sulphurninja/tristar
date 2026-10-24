"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Download, Plus, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BdBadge,
  BdButton,
  BdCard,
  BdEmptyRow,
  BdField,
  BdInput,
  BdPage,
  BdSelect,
  BdTable,
  BdTableToolbar,
  BdTabs,
  BdTd,
  BdTh,
  formatBdDate,
} from "@/components/bd";
import { useAuth } from "@/contexts/AuthContext";
import { hasRole, type Role } from "@/lib/roles";
import { downloadCsv } from "@/lib/csv";

interface RequestRow {
  _id: string;
  type: string;
  title: string;
  description?: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  decision?: string;
  raisedBy?: { _id: string; name: string };
  assignedTo?: { _id: string; name: string };
  createdAt: string;
  decidedAt?: string;
}

const TYPES = [
  { value: "reassignment", label: "Lead reassignment" },
  { value: "status_override", label: "Status override" },
  { value: "lead_delete", label: "Delete lead" },
  { value: "data_export", label: "Data export" },
  { value: "duplicate_claim", label: "Claim duplicate" },
  { value: "site_visit_extension", label: "Site visit extension" },
  { value: "discount_approval", label: "Discount approval" },
  { value: "other", label: "Other" },
];
const TYPE_LABEL = Object.fromEntries(TYPES.map((t) => [t.value, t.label])) as Record<string, string>;
const STATUS_COLOR = { pending: "#e9b72a", approved: "#37b24d", rejected: "#e5484d", cancelled: "#9a9ca6" } as const;

type Tab = "pending" | "approved" | "rejected" | "all";

export default function RequestsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<RequestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tab !== "all") params.set("status", tab);
    fetch(`/api/requests?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setItems(d.requests ?? []))
      .catch(() => toast.error("Couldn't load requests"))
      .finally(() => setLoading(false));
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);
  useEffect(() => setPage(1), [tab, search, pageSize]);

  const canApprove = user ? hasRole(user.role as Role, "manager") : false;

  const act = async (r: RequestRow, status: "approved" | "rejected" | "cancelled") => {
    let decision: string | undefined;
    if (status !== "cancelled" && canApprove) {
      const note = window.prompt(`Add a note for this ${status === "approved" ? "approval" : "rejection"} (optional)`, "");
      if (note === null) return;
      decision = note.trim() || undefined;
    }
    const res = await fetch(`/api/requests/${r._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...(decision ? { decision } : {}) }),
    });
    const j = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success(`Request ${status}`);
      load();
    } else toast.error(j.error || "Couldn't update request.");
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((r) =>
      [r.title, r.description, TYPE_LABEL[r.type], r.raisedBy?.name, r.assignedTo?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [items, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <BdPage>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[20px] font-semibold text-[#2b2f3a]">Requests</h1>
        <div className="flex gap-2">
          <BdButton
            variant="light"
            onClick={() =>
              downloadCsv(`requests-${tab}`, [
                ["Type", "Title", "Description", "Raised By", "Assigned To", "Status", "Raised On", "Decided On", "Decision"],
                ...filtered.map((r) => [
                  TYPE_LABEL[r.type] ?? r.type,
                  r.title,
                  r.description ?? "",
                  r.raisedBy?.name ?? "",
                  r.assignedTo?.name ?? "",
                  r.status,
                  r.createdAt,
                  r.decidedAt ?? "",
                  r.decision ?? "",
                ]),
              ])
            }
          >
            <Download className="size-3.5" /> Export CSV
          </BdButton>
          <BdButton onClick={() => setOpenNew(true)}>
            <Plus className="size-3.5" /> New Request
          </BdButton>
        </div>
      </div>

      <div>
        <BdTabs<Tab>
          value={tab}
          onChange={setTab}
          tabs={[
            { key: "pending", label: "Pending" },
            { key: "approved", label: "Approved" },
            { key: "rejected", label: "Rejected" },
            { key: "all", label: "All" },
          ]}
        />
        <BdCard className="rounded-tl-none">
          <BdTableToolbar
            page={page}
            totalPages={totalPages}
            onPage={setPage}
            search={search}
            onSearch={setSearch}
            pageSize={pageSize}
            onPageSize={setPageSize}
          />
          <BdTable minWidth={980}>
            <thead>
              <tr>
                <BdTh>#</BdTh>
                <BdTh>Type</BdTh>
                <BdTh>Title</BdTh>
                <BdTh>Raised By</BdTh>
                <BdTh>Assigned To</BdTh>
                <BdTh>Raised On</BdTh>
                <BdTh>Status</BdTh>
                <BdTh className="text-right">Action</BdTh>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <BdEmptyRow colSpan={8} loading={loading} />
              ) : (
                paged.map((r, i) => (
                  <tr key={r._id}>
                    <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>
                    <BdTd>{TYPE_LABEL[r.type] ?? r.type}</BdTd>
                    <BdTd className="max-w-[320px]">
                      <p className="font-medium">{r.title}</p>
                      {r.description ? <p className="text-[11.5px] text-[#8b90a0]">{r.description}</p> : null}
                      {r.decision ? <p className="text-[11.5px] italic text-[#5a6072]">Note: {r.decision}</p> : null}
                    </BdTd>
                    <BdTd>{r.raisedBy?.name ?? "-"}</BdTd>
                    <BdTd>{r.assignedTo?.name ?? "-"}</BdTd>
                    <BdTd className="whitespace-nowrap">{formatBdDate(r.createdAt)}</BdTd>
                    <BdTd>
                      <BdBadge color={STATUS_COLOR[r.status]} className="capitalize">
                        {r.status}
                      </BdBadge>
                    </BdTd>
                    <BdTd className="text-right">
                      {r.status === "pending" ? (
                        <div className="flex justify-end gap-1.5">
                          {canApprove ? (
                            <>
                              <BdButton onClick={() => act(r, "approved")}>
                                <Check className="size-3.5" /> Approve
                              </BdButton>
                              <BdButton variant="danger" onClick={() => act(r, "rejected")}>
                                <X className="size-3.5" /> Reject
                              </BdButton>
                            </>
                          ) : r.raisedBy?._id === user?.id ? (
                            <BdButton variant="light" onClick={() => act(r, "cancelled")}>
                              Cancel
                            </BdButton>
                          ) : null}
                        </div>
                      ) : null}
                    </BdTd>
                  </tr>
                ))
              )}
            </tbody>
          </BdTable>
        </BdCard>
      </div>

      <NewRequestDialog open={openNew} onOpenChange={setOpenNew} onCreated={load} />
    </BdPage>
  );
}

function NewRequestDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ type: "reassignment", title: "", description: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) setForm({ type: "reassignment", title: "", description: "" });
  }, [open]);

  const submit = async () => {
    if (!form.title.trim()) return toast.error("Add a title.");
    setSaving(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || "Couldn't raise request.");
      toast.success("Request raised");
      onCreated();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Request</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <BdField label="Type">
            <BdSelect clearable={false} value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={TYPES} />
          </BdField>
          <BdField label="Title">
            <BdInput
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="Reassign lead TS-2026-00012 to Aman"
            />
          </BdField>
          <BdField label="Description">
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Why this needs approval."
              className="w-full rounded-[3px] border border-[#dfe3ee] p-2.5 text-[13px]"
            />
          </BdField>
        </div>
        <DialogFooter>
          <BdButton variant="light" onClick={() => onOpenChange(false)}>
            Cancel
          </BdButton>
          <BdButton onClick={submit} disabled={saving}>
            {saving ? "Saving…" : "Raise Request"}
          </BdButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
