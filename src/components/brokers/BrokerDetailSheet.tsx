"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Phone,
  StickyNote,
  ListTodo,
  ChevronsLeft,
  ChevronsRight,
  X,
} from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { Sheet, SheetContent, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { StatusPill } from "@/components/shared/StatusPill";
import { CP_STAGES, CpFormDialog, type CpEditable } from "@/components/brokers/CpFormDialog";
import { AddTaskDialog } from "@/components/tasks/AddTaskDialog";
import { cn, formatPhone, initials } from "@/lib/utils";

interface Broker {
  _id: string;
  name: string;
  firmName?: string;
  phone: string;
  email?: string;
  altPhone?: string;
  cpCode?: string;
  status: string;
  notes?: string;
  rera?: { number?: string };
  location?: {
    addressLine?: string;
    locality?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
  rmName?: string;
  cpId?: number;
  stage?: string;
  companyId?: { _id: string; companyId: number; name: string; category?: string } | string | null;
  sourcingManagerId?: { _id: string; name: string } | string | null;
  panNumber?: string;
  gstNumber?: string;
  totalCommissionEarned?: number;
  totalCommissionPaid?: number;
  totalLeadsReferred?: number;
  totalDealsBooked?: number;
}

interface LeadRow {
  _id: string;
  contact?: { name?: string };
  stage?: string;
  createdAt?: string;
  description?: string;
  nextActionAt?: string;
}

interface TimelineItem {
  _id: string;
  type: string;
  description?: string;
  occurredAt: string;
  actorName?: string;
  leadName?: string;
}

interface VisitRow {
  _id: string;
  scheduledAt: string;
  status: string;
  projectId?: { name?: string } | null;
  leadId?: string;
}

interface BookingRow {
  _id: string;
  bookingNumber?: string;
  customerName?: string;
  amount?: number;
  approvalStatus?: string;
  bookedAt?: string;
}

interface TaskRow {
  _id: string;
  title: string;
  type?: string;
  status?: string;
  scheduleAt?: string;
  remark?: string;
}

interface Props {
  brokerId: string | null;
  brokerIds?: string[];
  onBrokerChange?: (id: string) => void;
  onOpenChange: (v: boolean) => void;
  onChanged: () => void;
}


const TABS = [
  ["notes", "Notes"],
  ["timeline", "Timeline"],
  ["call_log", "Call Log"],
  ["followup", "Followup"],
  ["site_visit", "Site Visit"],
  ["meeting", "Meeting"],
  ["lead", "Lead"],
  ["project", "Project"],
  ["booking", "Booking"],
  ["commission", "Commission"],
  ["locations", "Locations"],
] as const;

export function BrokerDetailSheet({
  brokerId,
  brokerIds = [],
  onBrokerChange,
  onOpenChange,
  onChanged,
}: Props) {
  const [broker, setBroker] = useState<Broker | null>(null);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [calls, setCalls] = useState<TimelineItem[]>([]);
  const [followups, setFollowups] = useState<TaskRow[]>([]);
  const [meetings, setMeetings] = useState<TaskRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [projectNames, setProjectNames] = useState<Record<string, string>>({});
  const [tab, setTab] = useState("lead");
  const [loading, setLoading] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [reload, setReload] = useState(0);

  const open = !!brokerId;
  const index = brokerId ? brokerIds.indexOf(brokerId) : -1;
  const canPrev = index > 0;
  const canNext = index >= 0 && index < brokerIds.length - 1;

  useEffect(() => {
    if (!brokerId) {
      setBroker(null);
      return;
    }
    setLoading(true);
    Promise.all([
      fetch(`/api/brokers/${brokerId}`).then((r) => r.json()),
      fetch(`/api/leads?limit=50&brokerId=${brokerId}`).then((r) => r.json()),
      fetch(`/api/brokers/${brokerId}/timeline`).then((r) => r.json()),
      fetch("/api/projects?limit=100").then((r) => r.json()),
    ])
      .then(([b, l, t, p]) => {
        setBroker(b.broker ?? null);
        setNoteDraft(b.broker?.notes ?? "");
        setLeads(l.leads ?? []);
        setTimeline(t.timeline ?? []);
        setCalls(t.calls ?? []);
        setFollowups(t.followups ?? []);
        setMeetings(t.meetings ?? []);
        setVisits(t.visits ?? []);
        setBookings(t.bookings ?? []);
        const ids = (t.projects ?? []).map((x: string | { _id: string }) =>
          typeof x === "string" ? x : x._id,
        );
        setProjectIds(ids);
        const map: Record<string, string> = {};
        for (const proj of p.projects ?? []) map[proj._id] = proj.name;
        setProjectNames(map);
      })
      .finally(() => setLoading(false));
  }, [brokerId, reload]);

  const updateStatus = async (stage: string) => {
    if (!brokerId) return;
    const res = await fetch(`/api/brokers/${brokerId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage }),
    });
    if (res.ok) {
      const d = await res.json();
      setBroker(d.broker);
      toast.success("Stage updated");
      onChanged();
    }
  };

  const saveNote = async () => {
    if (!brokerId) return;
    setSavingNote(true);
    try {
      const res = await fetch(`/api/brokers/${brokerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: noteDraft }),
      });
      if (!res.ok) {
        toast.error("Could not save note");
        return;
      }
      const d = await res.json();
      setBroker(d.broker);
      setNoteDraft(d.broker?.notes ?? noteDraft);
      toast.success("Note saved");
      onChanged();
    } finally {
      setSavingNote(false);
    }
  };

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent width="full" hideClose className="bg-slate-50 p-0">
        <DialogPrimitive.Title className="sr-only">Channel Partner Information</DialogPrimitive.Title>
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5">
          <div>
            <h2 className="text-[16px] font-semibold text-slate-900">
              Channel Partner Information
            </h2>
            {brokerIds.length > 0 && index >= 0 ? (
              <p className="text-[12px] tabular-nums text-slate-500">
                {index + 1} / {brokerIds.length}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 px-0"
              disabled={!canPrev}
              onClick={() => canPrev && onBrokerChange?.(brokerIds[index - 1])}
            >
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 px-0"
              disabled={!canNext}
              onClick={() => canNext && onBrokerChange?.(brokerIds[index + 1])}
            >
              <ChevronsRight className="size-4" />
            </Button>
            <Button variant="outline" size="sm" className="h-8" onClick={() => setEditOpen(true)} disabled={!broker}>
              Edit
            </Button>
            <SheetClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 px-0">
                <X className="size-4" />
              </Button>
            </SheetClose>
          </div>
        </div>

        {loading && !broker ? (
          <div className="flex flex-1 items-center justify-center text-[13px] text-slate-500">
            Loading…
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[280px_1fr]">
            <aside className="scrollbar-hide overflow-y-auto border-r border-slate-200 bg-white p-5">
              <div className="flex flex-col items-center text-center">
                <div className="flex size-16 items-center justify-center rounded-full bg-[#3a5dc2] text-[18px] font-bold text-white">
                  {initials(broker?.name)}
                </div>
                <h3 className="mt-3 text-[15px] font-bold uppercase tracking-wide text-slate-900">
                  {broker?.name}
                </h3>
                {broker?.firmName ? (
                  <p className="mt-0.5 text-[12px] text-slate-500">{broker.firmName}</p>
                ) : null}
              </div>

              <div className="mt-5 grid grid-cols-3 gap-2">
                <Quick
                  icon={StickyNote}
                  label="Note"
                  color="bg-sky-500"
                  onClick={() => setTab("notes")}
                />
                <Quick
                  icon={Phone}
                  label="Call"
                  color="bg-green-600"
                  onClick={() => {
                    if (broker?.phone) {
                      fetch(`/api/brokers/${broker._id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ touch: true }),
                      }).then(onChanged);
                      window.location.href = `tel:${broker.phone}`;
                    }
                    setTab("call_log");
                  }}
                />
                <Quick
                  icon={ListTodo}
                  label="Task"
                  color="bg-violet-500"
                  onClick={() => setTaskOpen(true)}
                />
              </div>

              <div className="mt-5">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  Stage
                </p>
                <Select value={broker?.stage || "Open"} onValueChange={updateStatus}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CP_STAGES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-5 divide-y divide-slate-100 text-[13px]">
                <Row label="E-mail" value={broker?.email || "Not Available"} />
                <Row label="Primary Number" value={formatPhone(broker?.phone ?? "")} />
                <Row
                  label="Alternate Number"
                  value={broker?.altPhone ? formatPhone(broker.altPhone) : "Not Available"}
                />
                <Row label="CP ID" value={broker?.cpId != null ? String(broker.cpId) : "Not Available"} />
                <Row
                  label="Company Name"
                  value={
                    broker && typeof broker.companyId === "object" && broker.companyId
                      ? `${broker.companyId.name} (${broker.companyId.companyId})`
                      : broker?.firmName || "—"
                  }
                />
                <Row
                  label="Sourcing Manager"
                  value={
                    broker && typeof broker.sourcingManagerId === "object" && broker.sourcingManagerId
                      ? broker.sourcingManagerId.name
                      : "Not Available"
                  }
                />
                <Row label="PAN" value={broker?.panNumber || "Not Available"} />
                <Row label="GST" value={broker?.gstNumber || "Not Available"} />
                <Row label="RERA" value={broker?.rera?.number || "Not Available"} />
                <Row label="Leads referred" value={String(broker?.totalLeadsReferred ?? leads.length)} />
                <Row label="Deals booked" value={String(broker?.totalDealsBooked ?? bookings.length)} />
              </div>
            </aside>

            <section className="flex min-h-0 flex-col overflow-hidden">
              <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 flex-1 flex-col">
                <div className="scrollbar-hide shrink-0 overflow-x-auto border-b border-slate-200 bg-white px-3 pt-2">
                  <TabsList className="h-auto w-max bg-transparent p-0">
                    {TABS.map(([value, label]) => (
                      <TabsTrigger
                        key={value}
                        value={value}
                        className="rounded-t-md rounded-b-none px-3 py-2 text-[12.5px] data-[state=active]:bg-[#3a5dc2] data-[state=active]:text-white data-[state=active]:shadow-none"
                      >
                        {label}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </div>

                <div className="scrollbar-hide min-h-0 flex-1 overflow-y-auto p-4">
                  <TabsContent value="notes" className="mt-0 space-y-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h4 className="text-[14px] font-semibold text-slate-900">Partner notes</h4>
                        <Button size="sm" className="h-8" onClick={saveNote} disabled={savingNote}>
                          {savingNote ? "Saving…" : "Save"}
                        </Button>
                      </div>
                      <Textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Add notes about this channel partner…"
                        className="min-h-36"
                      />
                    </div>
                  </TabsContent>

                  <TabsContent value="timeline" className="mt-0">
                    <ActivityFeed items={timeline} empty="No timeline activity yet." />
                  </TabsContent>

                  <TabsContent value="call_log" className="mt-0">
                    <ActivityFeed items={calls} empty="No call logs for this partner's leads." />
                  </TabsContent>

                  <TabsContent value="followup" className="mt-0">
                    <TaskFeed items={followups} empty="No follow-up tasks." />
                  </TabsContent>

                  <TabsContent value="site_visit" className="mt-0">
                    {visits.length === 0 ? (
                      <Empty>No site visits linked to this partner's leads.</Empty>
                    ) : (
                      <ul className="space-y-2">
                        {visits.map((v) => (
                          <li
                            key={v._id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px]"
                          >
                            <div>
                              <p className="font-medium">{v.projectId?.name ?? "Visit"}</p>
                              <p className="text-[12px] text-slate-500">
                                {new Date(v.scheduledAt).toLocaleString("en-IN")}
                              </p>
                            </div>
                            <StatusPill tone="info">{v.status}</StatusPill>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>

                  <TabsContent value="meeting" className="mt-0">
                    <TaskFeed items={meetings} empty="No meetings logged." />
                  </TabsContent>

                  <TabsContent value="lead" className="mt-0">
                    <DataTableShell title="Leads" count={leads.length}>
                      {leads.length === 0 ? (
                        <p className="py-10 text-center text-[13px] text-slate-500">No Data Found</p>
                      ) : (
                        <TableRoot>
                          <thead>
                            <tr>
                              <Th>Sr.</Th>
                              <Th>Date</Th>
                              <Th>Name</Th>
                              <Th>Details</Th>
                              <Th>Stage</Th>
                              <Th>Remaining</Th>
                            </tr>
                          </thead>
                          <tbody>
                            {leads.map((l, i) => (
                              <tr key={l._id}>
                                <Td>{i + 1}</Td>
                                <Td className="text-[12px] text-slate-500">
                                  {l.createdAt
                                    ? new Date(l.createdAt).toLocaleDateString("en-IN")
                                    : "—"}
                                </Td>
                                <Td className="font-medium text-[#2d5bd6]">
                                  {l.contact?.name ?? "—"}
                                </Td>
                                <Td className="max-w-[200px] truncate">{l.description || "—"}</Td>
                                <Td>
                                  <StatusPill tone="info">
                                    {(l.stage ?? "—").replace(/_/g, " ")}
                                  </StatusPill>
                                </Td>
                                <Td className="text-[12px] text-slate-500">
                                  {l.nextActionAt
                                    ? new Date(l.nextActionAt).toLocaleDateString("en-IN")
                                    : "—"}
                                </Td>
                              </tr>
                            ))}
                          </tbody>
                        </TableRoot>
                      )}
                    </DataTableShell>
                  </TabsContent>

                  <TabsContent value="project" className="mt-0">
                    {projectIds.length === 0 ? (
                      <Empty>No active projects mapped to this partner.</Empty>
                    ) : (
                      <ul className="space-y-2">
                        {projectIds.map((id) => (
                          <li
                            key={id}
                            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px] font-medium"
                          >
                            {projectNames[id] ?? id}
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>

                  <TabsContent value="booking" className="mt-0">
                    {bookings.length === 0 ? (
                      <Empty>No bookings for this partner.</Empty>
                    ) : (
                      <ul className="space-y-2">
                        {bookings.map((b) => (
                          <li
                            key={b._id}
                            className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px]"
                          >
                            <div>
                              <p className="font-medium">
                                {b.customerName ?? b.bookingNumber ?? "Booking"}
                              </p>
                              <p className="text-[12px] text-slate-500">
                                {b.bookedAt
                                  ? new Date(b.bookedAt).toLocaleDateString("en-IN")
                                  : ""}
                                {b.amount != null ? ` · ₹${b.amount.toLocaleString("en-IN")}` : ""}
                              </p>
                            </div>
                            <StatusPill tone="success">
                              {(b.approvalStatus ?? "pending").replace(/_/g, " ")}
                            </StatusPill>
                          </li>
                        ))}
                      </ul>
                    )}
                  </TabsContent>

                  <TabsContent value="commission" className="mt-0">
                    <div className="grid gap-3 sm:grid-cols-3">
                      {[
                        ["Commission earned", broker?.totalCommissionEarned ?? 0],
                        ["Commission paid", broker?.totalCommissionPaid ?? 0],
                        [
                          "Commission pending",
                          Math.max((broker?.totalCommissionEarned ?? 0) - (broker?.totalCommissionPaid ?? 0), 0),
                        ],
                      ].map(([label, v]) => (
                        <div key={String(label)} className="rounded-[3px] border border-slate-200 bg-white p-4">
                          <p className="text-[12px] text-slate-500">{label}</p>
                          <p className="mt-1 text-[20px] font-medium text-slate-900">
                            {"₹"}
                            {Number(v).toLocaleString("en-IN")}
                          </p>
                        </div>
                      ))}
                    </div>
                    <p className="mt-3 text-[12px] text-slate-500">
                      Booking value referred: {"₹"}
                      {bookings.reduce((a, b) => a + (b.amount ?? 0), 0).toLocaleString("en-IN")} across {bookings.length} booking
                      {bookings.length === 1 ? "" : "s"}.
                    </p>
                  </TabsContent>

                  <TabsContent value="locations" className="mt-0">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 text-[13px]">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                        Registered location
                      </p>
                      <p className="mt-2 font-medium text-slate-900">
                        {[
                          broker?.location?.addressLine,
                          broker?.location?.locality,
                          broker?.location?.city,
                          broker?.location?.state,
                          broker?.location?.pincode,
                        ]
                          .filter(Boolean)
                          .join(", ") || "Not Available"}
                      </p>
                    </div>
                  </TabsContent>
                </div>
              </Tabs>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
    <CpFormDialog
      open={editOpen}
      broker={broker as unknown as CpEditable}
      onClose={() => setEditOpen(false)}
      onSaved={() => {
        setReload((n) => n + 1);
        onChanged();
      }}
    />
    <AddTaskDialog
      open={taskOpen}
      onOpenChange={setTaskOpen}
      brokerId={broker?._id}
      brokerName={broker?.name}
      onCreated={() => {
        setTab("followup");
        onChanged();
        if (brokerId) {
          fetch(`/api/brokers/${brokerId}/timeline`)
            .then((r) => r.json())
            .then((t) => {
              setFollowups(t.followups ?? []);
              setMeetings(t.meetings ?? []);
            });
        }
      }}
    />
    </>
  );
}

function Quick({
  icon: Icon,
  label,
  color,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  color: string;
  onClick?: () => void;
}) {
  return (
    <button type="button" onClick={onClick} className="flex flex-col items-center gap-1">
      <span className={cn("flex size-10 items-center justify-center rounded-full text-white", color)}>
        <Icon className="size-4" />
      </span>
      <span className="text-[10px] font-medium text-slate-600">{label}</span>
    </button>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 py-2.5">
      <span className="text-slate-500">{label}</span>
      <span className="max-w-[55%] truncate text-right font-medium text-slate-800">{value}</span>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white py-16 text-center text-[13px] text-slate-500">
      {children}
    </div>
  );
}

function ActivityFeed({ items, empty }: { items: TimelineItem[]; empty: string }) {
  if (!items.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li key={a._id} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px]">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium capitalize text-slate-800">
              {a.type.replace(/_/g, " ")}
              {a.leadName ? ` · ${a.leadName}` : ""}
            </p>
            <span className="shrink-0 text-[11px] text-slate-400">
              {new Date(a.occurredAt).toLocaleString("en-IN")}
            </span>
          </div>
          {a.description ? <p className="mt-1 text-slate-600">{a.description}</p> : null}
        </li>
      ))}
    </ul>
  );
}

function TaskFeed({ items, empty }: { items: TaskRow[]; empty: string }) {
  if (!items.length) return <Empty>{empty}</Empty>;
  return (
    <ul className="space-y-2">
      {items.map((t) => (
        <li key={t._id} className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-[13px]">
          <div className="flex items-center justify-between gap-2">
            <p className="font-medium text-slate-800">{t.title}</p>
            <StatusPill tone="info">{(t.status ?? "pending").replace(/_/g, " ")}</StatusPill>
          </div>
          <p className="mt-1 text-[12px] text-slate-500">
            {t.scheduleAt ? new Date(t.scheduleAt).toLocaleString("en-IN") : ""}
            {t.remark ? ` · ${t.remark}` : ""}
          </p>
        </li>
      ))}
    </ul>
  );
}
