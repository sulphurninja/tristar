"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Filter } from "lucide-react";
import { toast } from "sonner";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BdBadge,
  BdButton,
  BdCard,
  BdEmptyRow,
  BdField,
  BdPage,
  BdSelect,
  BdTable,
  BdTableToolbar,
  BdTd,
  BdTh,
  formatBdDate,
} from "@/components/bd";
import { TeamAgentSelects, scopeQuery, type TeamAgentValue } from "@/components/bd/TeamAgentSelects";
import { ColumnPicker, type ColumnDef } from "@/components/crm/ColumnPicker";
import { RowMenu } from "@/components/crm/RowMenu";
import { ContactModal, AddTaskModal } from "@/components/crm/ContactModals";
import { downloadCsv } from "@/components/crm/csv";

interface Contact {
  _id: string;
  leadNumber?: string;
  contact: { name: string; primaryPhone: string; email?: string };
  stage?: string;
  contactStatus?: "lead" | "unqualified";
  convertedToContactAt?: string;
  createdAt: string;
  source?: { primary?: string };
  primaryProjectId?: { _id: string; name?: string } | null;
  assignedTo?: { _id: string; name?: string } | null;
  description?: string;
}

interface Summary {
  total: number;
  lead: number;
  unqualified: number;
}

const COLUMNS: ColumnDef[] = [
  { key: "leadNumber", label: "Contact #" },
  { key: "name", label: "Name" },
  { key: "mobile", label: "Mobile" },
  { key: "email", label: "Email" },
  { key: "status", label: "Status" },
  { key: "stage", label: "Stage" },
  { key: "project", label: "Project" },
  { key: "source", label: "Source" },
  { key: "agent", label: "Sales Agent" },
  { key: "converted", label: "Converted On" },
];
const DEFAULT_COLS = ["name", "mobile", "email", "status", "stage", "project", "agent", "converted"];

const cap = (s?: string) => (s ? s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "-");

function ContactsPageInner() {
  const router = useRouter();
  const [draft, setDraft] = useState<TeamAgentValue>({ team: "", agent: "" });
  const [applied, setApplied] = useState<TeamAgentValue>({ team: "", agent: "" });
  const [showFilter, setShowFilter] = useState(false);
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [cols, setCols] = useState<string[]>(DEFAULT_COLS);
  const [rows, setRows] = useState<Contact[]>([]);
  const [total, setTotal] = useState(0);
  const [summary, setSummary] = useState<Summary>({ total: 0, lead: 0, unqualified: 0 });
  const [timeline, setTimeline] = useState<Array<{ date: string; Total: number; Lead: number; Unqualified: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [edit, setEdit] = useState<Contact | null>(null);
  const [task, setTask] = useState<Contact | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQ(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => setPage(1), [q, status, applied, pageSize]);

  const load = useCallback(() => {
    setLoading(true);
    const u = scopeQuery(applied);
    u.set("limit", String(pageSize));
    u.set("skip", String((page - 1) * pageSize));
    if (q) u.set("q", q);
    if (status) u.set("status", status);
    fetch(`/api/contacts?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.contacts ?? []);
        setTotal(d.total ?? 0);
        setSummary(d.counts ?? { total: 0, lead: 0, unqualified: 0 });
        setTimeline(d.timeline ?? []);
      })
      .finally(() => setLoading(false));
  }, [applied, q, status, page, pageSize]);

  useEffect(load, [load]);

  const act = async (id: string, body: Record<string, unknown>, okMsg: string) => {
    const res = await fetch(`/api/contacts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(j.error || "Action failed.");
    else {
      toast.success(okMsg);
      load();
    }
  };
  const remove = async (c: Contact) => {
    if (!window.confirm(`Delete contact "${c.contact.name}" permanently? This also removes its activity log and tasks.`)) return;
    const res = await fetch(`/api/contacts/${c._id}`, { method: "DELETE" });
    const j = await res.json().catch(() => ({}));
    if (!res.ok) toast.error(j.error || "Couldn't delete.");
    else {
      toast.success("Contact deleted");
      load();
    }
  };

  const exportCsv = async () => {
    const u = scopeQuery(applied);
    u.set("limit", "500");
    if (q) u.set("q", q);
    if (status) u.set("status", status);
    const d = await fetch(`/api/contacts?${u}`, { cache: "no-store" }).then((r) => r.json());
    const list: Contact[] = d.contacts ?? [];
    downloadCsv(
      "contacts.csv",
      ["Contact #", "Name", "Mobile", "Email", "Status", "Stage", "Project", "Source", "Sales Agent", "Converted On"],
      list.map((c) => [
        c.leadNumber,
        c.contact.name,
        c.contact.primaryPhone,
        c.contact.email,
        c.contactStatus === "unqualified" ? "Unqualified" : "Lead",
        cap(c.stage),
        c.primaryProjectId?.name,
        cap(c.source?.primary),
        c.assignedTo?.name,
        formatBdDate(c.convertedToContactAt ?? c.createdAt),
      ]),
    );
  };

  const pct = (n: number) => (summary.total ? Math.round((n / summary.total) * 100) : 0);
  const pie = useMemo(
    () =>
      summary.total
        ? [
            { name: "Lead", value: summary.lead, color: "#e6b422" },
            { name: "Unqualified", value: summary.unqualified, color: "#b84fc2" },
          ]
        : [{ name: "None", value: 1, color: "#e8eaf2" }],
    [summary],
  );
  const show = (k: string) => cols.includes(k);
  const visibleCount = 2 + cols.length;

  return (
    <BdPage>
      <BdCard bodyClassName="!p-4">
        <div className="flex flex-wrap items-center justify-end gap-4">
          <TeamAgentSelects value={draft} onChange={setDraft} />
          <div className="flex items-center gap-1.5">
            <BdButton onClick={() => setApplied(draft)}>Apply</BdButton>
            <BdButton
              variant="light"
              className="!bg-[#e8eaf2] !text-[#2b2f3a] !border-transparent"
              onClick={() => {
                setDraft({ team: "", agent: "" });
                setApplied({ team: "", agent: "" });
                setStatus("");
                setSearch("");
              }}
            >
              Clear
            </BdButton>
            <button
              type="button"
              aria-label="Filters"
              onClick={() => setShowFilter((s) => !s)}
              className="inline-flex h-[31px] w-9 items-center justify-center rounded-[3px] bg-[#ee6a37] text-white hover:bg-[#d95a2a]"
            >
              <Filter className="size-3.5" />
            </button>
          </div>
        </div>
        {showFilter ? (
          <div className="mt-4 grid gap-4 border-t border-[#eef0f6] pt-4 sm:grid-cols-3">
            <BdField label="Status">
              <BdSelect
                value={status}
                onChange={setStatus}
                placeholder="All"
                options={[
                  { value: "lead", label: "Lead" },
                  { value: "unqualified", label: "Unqualified" },
                ]}
              />
            </BdField>
          </div>
        ) : null}
      </BdCard>

      <BdCard title="Contacts">
        <div className="flex flex-wrap items-center justify-center gap-10 py-2">
          <div className="size-[170px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pie} dataKey="value" innerRadius={52} outerRadius={80} stroke="none" isAnimationActive={false}>
                  {pie.map((p) => (
                    <Cell key={p.name} fill={p.color} />
                  ))}
                </Pie>
                {summary.total ? <Tooltip /> : null}
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-stretch gap-6">
            {[
              { label: "Total", n: summary.total, p: summary.total ? 100 : 0, c: "#3a5dc2" },
              { label: "Lead", n: summary.lead, p: pct(summary.lead), c: "#e6b422" },
              { label: "Unqualified", n: summary.unqualified, p: pct(summary.unqualified), c: "#b84fc2" },
            ].map((s) => (
              <div key={s.label} className="flex items-stretch gap-3">
                <span className="w-[3px] rounded" style={{ background: s.c }} />
                <div className="text-center">
                  <p className="text-[18px] text-[#2b2f3a]">{s.n}</p>
                  <p className="text-[12px] text-[#8b90a0]">{s.label}</p>
                  <p className="mt-1 text-[16px] text-[#8b90a0]">{s.p}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </BdCard>

      <BdCard>
        <div className="h-[300px]">
          {timeline.length === 0 ? (
            <div className="flex h-full items-center justify-center text-[13px] text-[#8b90a0]">No data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="#eef0f6" vertical />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(d: string) => d.slice(5)} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend layout="vertical" align="right" verticalAlign="middle" iconType="plainline" />
                <Line type="monotone" dataKey="Total" stroke="#e8321f" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="Lead" stroke="#1a1ae6" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                <Line type="monotone" dataKey="Unqualified" stroke="#2f7d1f" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </BdCard>

      <BdCard
        title="Contacts"
        actions={
          <>
            <BdButton variant="light" onClick={exportCsv}>
              Export CSV
            </BdButton>
            <BdButton onClick={() => setAddOpen(true)}>Add Contact</BdButton>
          </>
        }
      >
        <BdTableToolbar
          page={page}
          totalPages={Math.ceil(total / pageSize)}
          onPage={setPage}
          search={search}
          onSearch={setSearch}
          pageSize={pageSize}
          onPageSize={setPageSize}
          left={<span className="text-[12.5px] text-[#8b90a0]">{total} total</span>}
          right={<ColumnPicker columns={COLUMNS} visible={cols} onChange={setCols} />}
        />
        <BdTable minWidth={980}>
          <thead>
            <tr>
              <BdTh>#</BdTh>
              {COLUMNS.filter((c) => show(c.key)).map((c) => (
                <BdTh key={c.key}>{c.label}</BdTh>
              ))}
              <BdTh>Action</BdTh>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <BdEmptyRow colSpan={visibleCount} loading={loading} />
            ) : (
              rows.map((c, i) => (
                <tr key={c._id}>
                  <BdTd className="text-[#8b90a0]">{(page - 1) * pageSize + i + 1}</BdTd>
                  {show("leadNumber") ? <BdTd>{c.leadNumber ?? "-"}</BdTd> : null}
                  {show("name") ? (
                    <BdTd>
                      <button
                        type="button"
                        onClick={() => router.push(`/leads?open=${c._id}`)}
                        className="text-left font-medium text-[#3a5dc2] hover:underline"
                      >
                        {c.contact.name}
                      </button>
                    </BdTd>
                  ) : null}
                  {show("mobile") ? <BdTd className="whitespace-nowrap">{c.contact.primaryPhone}</BdTd> : null}
                  {show("email") ? <BdTd>{c.contact.email || "-"}</BdTd> : null}
                  {show("status") ? (
                    <BdTd>
                      <BdBadge color={c.contactStatus === "unqualified" ? "#b84fc2" : "#e6b422"}>
                        {c.contactStatus === "unqualified" ? "UNQUALIFIED" : "LEAD"}
                      </BdBadge>
                    </BdTd>
                  ) : null}
                  {show("stage") ? <BdTd>{cap(c.stage)}</BdTd> : null}
                  {show("project") ? <BdTd>{c.primaryProjectId?.name ?? "-"}</BdTd> : null}
                  {show("source") ? <BdTd>{cap(c.source?.primary)}</BdTd> : null}
                  {show("agent") ? <BdTd>{c.assignedTo?.name ?? "-"}</BdTd> : null}
                  {show("converted") ? <BdTd className="whitespace-nowrap">{formatBdDate(c.convertedToContactAt ?? c.createdAt)}</BdTd> : null}
                  <BdTd>
                    <RowMenu
                      items={[
                        { label: "Open", onClick: () => router.push(`/leads?open=${c._id}`) },
                        { label: "Edit", onClick: () => setEdit(c) },
                        c.contactStatus === "unqualified"
                          ? { label: "Mark Lead", onClick: () => act(c._id, { action: "set_status", status: "lead" }, "Marked as Lead") }
                          : { label: "Mark Unqualified", onClick: () => act(c._id, { action: "set_status", status: "unqualified" }, "Marked Unqualified") },
                        { label: "Convert Back To Lead", onClick: () => act(c._id, { action: "convert_back" }, "Converted back to lead") },
                        { label: "Add Task", onClick: () => setTask(c) },
                        { label: "Delete", danger: true, onClick: () => remove(c) },
                      ]}
                    />
                  </BdTd>
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
      </BdCard>

      <ContactModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={load} />
      <ContactModal
        open={!!edit}
        onClose={() => setEdit(null)}
        onSaved={load}
        contactId={edit?._id}
        initial={
          edit
            ? {
                name: edit.contact.name,
                phone: edit.contact.primaryPhone,
                email: edit.contact.email ?? "",
                projectId: edit.primaryProjectId?._id ?? "",
                assignedTo: edit.assignedTo?._id ?? "",
                description: edit.description ?? "",
              }
            : undefined
        }
      />
      {task ? (
        <AddTaskModal
          open
          onClose={() => setTask(null)}
          leadId={task._id}
          leadName={task.contact.name}
          assignedTo={task.assignedTo?._id}
        />
      ) : null}
    </BdPage>
  );
}

export default function ContactsPage() {
  return (
    <Suspense>
      <ContactsPageInner />
    </Suspense>
  );
}
