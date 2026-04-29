"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  CalendarCheck,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Phone,
  Building2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { StatusPill } from "@/components/shared/StatusPill";
import { EmptyState } from "@/components/shared/EmptyState";
import { NewVisitSheet } from "@/components/visits/NewVisitSheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatPhone } from "@/lib/utils";

interface Visit {
  _id: string;
  scheduledAt: string;
  durationMinutes?: number;
  mode: "in_person" | "virtual" | "phygital";
  status: string;
  leadId?: { _id: string; contact?: { name?: string; primaryPhone?: string }; leadNumber?: string };
  projectId?: { _id: string; name?: string; code?: string; location?: { city?: string } };
  assignedTo?: { _id: string; name?: string };
}

const STATUS_TONE: Record<
  string,
  { label: string; tone: "neutral" | "info" | "primary" | "success" | "warning" | "danger" }
> = {
  planned: { label: "Planned", tone: "neutral" },
  confirmed: { label: "Confirmed", tone: "info" },
  in_progress: { label: "In progress", tone: "primary" },
  done: { label: "Done", tone: "success" },
  no_show: { label: "No show", tone: "danger" },
  cancelled: { label: "Cancelled", tone: "danger" },
  rescheduled: { label: "Rescheduled", tone: "warning" },
};

export default function VisitsPage() {
  const searchParams = useSearchParams();
  const defaultLead = searchParams.get("leadId") ?? undefined;
  const initialOpenNew = !!defaultLead || searchParams.get("new") === "1";

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [openNew, setOpenNew] = useState(initialOpenNew);
  const [range, setRange] = useState<"upcoming" | "today" | "past" | "all">("upcoming");
  const [status, setStatus] = useState("all");

  const params = useMemo(() => {
    const u = new URLSearchParams();
    u.set("range", range);
    if (status !== "all") u.set("status", status);
    return u.toString();
  }, [range, status]);

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/visits?${params}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setVisits(d.visits ?? []))
      .finally(() => setLoading(false));
  }, [params]);

  useEffect(() => {
    load();
  }, [load]);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/visits/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast.success(`Marked ${status.replace("_", " ")}`);
      load();
    } else {
      toast.error("Couldn't update");
    }
  };

  /* Group by date */
  const grouped = visits.reduce<Record<string, Visit[]>>((acc, v) => {
    const day = new Date(v.scheduledAt).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    if (!acc[day]) acc[day] = [];
    acc[day].push(v);
    return acc;
  }, {});

  return (
    <div className="flex flex-1 flex-col bg-white">
      {/* Toolbar */}
      <div className="sticky top-[72px] z-20 flex flex-col gap-3 border-b border-slate-200/70 bg-white px-7 py-4 lg:flex-row lg:items-center lg:px-10">
        <Tabs value={range} onValueChange={(v) => setRange(v as typeof range)}>
          <TabsList>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
            <TabsTrigger value="all">All</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-1 items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.entries(STATUS_TONE).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button onClick={() => setOpenNew(true)} className="h-10 gap-1.5 rounded-lg">
          <Plus className="size-4" strokeWidth={2} />
          Schedule visit
        </Button>
      </div>

      {/* Body */}
      {loading ? (
        <div className="space-y-3 p-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : visits.length === 0 ? (
        <div className="px-7 py-12 lg:px-10">
          <EmptyState
            icon={<CalendarCheck className="size-5 text-emerald-600" strokeWidth={1.75} />}
            title={range === "today" ? "No visits today" : range === "past" ? "No past visits" : "No upcoming visits"}
            description="Schedule your first site visit — we'll send reminders and confirmations on the day."
            action={
              <Button onClick={() => setOpenNew(true)} className="gap-1.5">
                <Plus className="size-4" strokeWidth={2} />
                Schedule a visit
              </Button>
            }
          />
        </div>
      ) : (
        <div className="px-7 py-6 lg:px-10">
          {Object.entries(grouped).map(([day, list]) => (
            <div key={day} className="mb-8">
              <h3 className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-wider text-slate-500">
                <Clock className="size-3.5" strokeWidth={1.75} />
                {day}
                <span className="font-mono text-slate-400">· {list.length}</span>
              </h3>
              <div className="space-y-2">
                {list.map((v) => {
                  const tone = STATUS_TONE[v.status] ?? STATUS_TONE.planned;
                  const time = new Date(v.scheduledAt).toLocaleTimeString("en-IN", {
                    hour: "numeric",
                    minute: "2-digit",
                  });
                  return (
                    <div
                      key={v._id}
                      className="grid grid-cols-12 items-center gap-4 rounded-xl bg-slate-50/60 px-4 py-3.5 transition-colors hover:bg-emerald-50/40"
                    >
                      <div className="col-span-2 flex flex-col">
                        <span className="text-[18px] font-bold tracking-tight text-slate-900 tabular-nums">
                          {time}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {v.durationMinutes ?? 60} min · {v.mode.replace("_", " ")}
                        </span>
                      </div>

                      <div className="col-span-4 flex min-w-0 items-center gap-3">
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-[12px] font-bold text-white">
                          {(v.leadId?.contact?.name ?? "?").charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-[13.5px] font-semibold text-slate-900">
                            {v.leadId?.contact?.name ?? "Unknown lead"}
                          </p>
                          <p className="truncate text-[11.5px] text-slate-500">
                            <Phone className="mr-1 inline size-3" strokeWidth={1.75} />
                            {v.leadId?.contact?.primaryPhone
                              ? formatPhone(v.leadId.contact.primaryPhone)
                              : "—"}
                          </p>
                        </div>
                      </div>

                      <div className="col-span-3 min-w-0">
                        <p className="truncate text-[13px] text-slate-700">
                          <Building2 className="mr-1 inline size-3.5 text-slate-400" strokeWidth={1.75} />
                          {v.projectId?.name ?? "—"}
                        </p>
                        {v.projectId?.location?.city ? (
                          <p className="truncate text-[11.5px] text-slate-500">
                            <MapPin className="mr-1 inline size-3" strokeWidth={1.75} />
                            {v.projectId.location.city}
                          </p>
                        ) : null}
                      </div>

                      <div className="col-span-1">
                        <StatusPill tone={tone.tone} dot>
                          {tone.label}
                        </StatusPill>
                      </div>

                      <div className="col-span-2 flex justify-end gap-1">
                        {v.status === "planned" || v.status === "confirmed" ? (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 rounded-lg text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                              onClick={() => updateStatus(v._id, "done")}
                            >
                              <CheckCircle2 className="size-3.5" strokeWidth={1.75} />
                              Done
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 gap-1 rounded-lg text-slate-500 hover:bg-red-50 hover:text-red-700"
                              onClick={() => updateStatus(v._id, "cancelled")}
                            >
                              <XCircle className="size-3.5" strokeWidth={1.75} />
                              Cancel
                            </Button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <NewVisitSheet
        open={openNew}
        onOpenChange={setOpenNew}
        onCreated={load}
        defaultLeadId={defaultLead}
      />
    </div>
  );
}
