"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { BdSelect, type BdOption } from "@/components/bd";
import { BdDateRange, ymd } from "@/components/bd/DateInputs";
import { cn } from "@/lib/utils";

/* ───────────── option lists ───────────── */

export const ACTIVITY_TYPES: BdOption[] = [
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "site_visit", label: "Site Visit" },
  { value: "follow_up", label: "Follow Up" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "other", label: "Other" },
];

export const DATE_RANGES: BdOption[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "last7", label: "Last 7 Days" },
  { value: "next7", label: "Next 7 Days" },
  { value: "thismonth", label: "This Month" },
  { value: "lastmonth", label: "Last Month" },
  { value: "custom", label: "Custom range" },
];

export const ENTITY_TYPES: BdOption[] = [
  { value: "lead", label: "Lead" },
  { value: "contact", label: "Contact" },
  { value: "broker", label: "Channel Partner" },
  { value: "other", label: "Other" },
];

export const REMINDERS: BdOption[] = [
  { value: "5", label: "5 Minute" },
  { value: "15", label: "15 Minute" },
  { value: "30", label: "30 Minute" },
  { value: "60", label: "1 Hour" },
  { value: "120", label: "2 Hour" },
  { value: "1440", label: "1 Day" },
];

export const typeLabel = (t?: string) => ACTIVITY_TYPES.find((a) => a.value === t)?.label ?? t ?? "-";

/* ───────────── row types ───────────── */

export interface LeadRef {
  _id: string;
  leadNumber?: string;
  isContact?: boolean;
  contact?: { name?: string; primaryPhone?: string };
  assignedTo?: { _id: string; name?: string } | null;
  brokerId?: { _id: string; name?: string; firmName?: string } | null;
  primaryProjectId?: { _id: string; name?: string } | null;
}
export interface UserRef {
  _id: string;
  name?: string;
}
export interface TaskRow {
  _id: string;
  createdAt: string;
  scheduleAt?: string;
  title: string;
  type: string;
  status: "pending" | "upcoming" | "completed" | "cancelled";
  remark?: string;
  entityType?: string;
  leadId?: LeadRef | null;
  assignedTo?: UserRef | null;
  assignedBy?: UserRef | null;
}
export interface VisitRow {
  _id: string;
  createdAt: string;
  scheduledAt: string;
  status: string;
  remark?: string;
  mode?: string;
  visitType?: string;
  cpPresent?: boolean;
  rescheduleCount?: number;
  frequency?: number | null;
  leadId?: LeadRef | null;
  projectId?: { _id: string; name?: string } | null;
  assignedTo?: UserRef | null;
  assignedBy?: UserRef | null;
  brokerId?: { _id: string; name?: string; firmName?: string } | null;
  feedback?: { interest?: string; notes?: string };
}

export function ordinal(n?: number | null) {
  if (!n) return "-";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]} Visit`;
}

/* ───────────── small pieces ───────────── */

export function leadHref(id?: string) {
  return id ? `/leads?open=${id}` : "#";
}

export function LeadLink({ lead }: { lead?: LeadRef | null }) {
  if (!lead) return <span className="text-[#8b90a0]">-</span>;
  return (
    <Link href={leadHref(lead._id)} className="text-[#1a0dab] underline underline-offset-2 hover:text-[#3a5dc2]">
      {lead.contact?.name || "Unnamed"}
    </Link>
  );
}

export function CategoryBadge({ lead }: { lead?: LeadRef | null }) {
  if (!lead) return null;
  return (
    <span
      className="inline-block rounded-[2px] px-2 py-[4px] text-[11px] font-medium uppercase leading-none text-white"
      style={{ background: lead.isContact ? "#6b7280" : "#3a5dc2" }}
    >
      {lead.isContact ? "Contact" : "Lead"}
    </span>
  );
}

export function mobileOf(lead?: LeadRef | null) {
  const p = lead?.contact?.primaryPhone;
  if (!p) return "-";
  return /^\d{10}$/.test(p) ? `+91-${p}` : p;
}

/** Convert a Date/ISO string to the value format of <input type="datetime-local">. */
export function toLocalInput(d?: string | Date | null) {
  const dt = d ? new Date(d) : new Date();
  if (Number.isNaN(dt.getTime())) return "";
  const p = (n: number) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}T${p(dt.getHours())}:${p(dt.getMinutes())}`;
}

/* ───────────── date range filter ───────────── */

export interface RangeValue {
  range: string;
  from: string;
  to: string;
}

/**
 * The "Date Range" control: preset dropdown (clearable) that reveals real
 * from/to date inputs when "Custom range" is chosen.
 */
export function DateRangeFilter({ value, onChange }: { value: RangeValue; onChange: (v: RangeValue) => void }) {
  return (
    <div className="space-y-2">
      <BdSelect
        value={value.range}
        placeholder="Select Date Range"
        options={DATE_RANGES}
        onChange={(range) =>
          onChange({
            range,
            from: range === "custom" ? value.from || ymd() : "",
            to: range === "custom" ? value.to || ymd() : "",
          })
        }
      />
      {value.range === "custom" ? (
        <BdDateRange from={value.from} to={value.to} onChange={(r) => onChange({ range: "custom", ...r })} />
      ) : null}
    </div>
  );
}

export function rangeParams(v: RangeValue, p: URLSearchParams) {
  if (!v.range) return;
  p.set("range", v.range);
  if (v.range === "custom") {
    p.set("from", v.from);
    p.set("to", v.to);
  }
}

/* ───────────── lookups (projects, channel partners, lead sources) ───────────── */

export interface Lookups {
  projects: BdOption[];
  brokers: BdOption[];
  sources: BdOption[];
  brokerRm: Record<string, string>;
}
let lookupCache: Lookups | null = null;

export function useLookups(): Lookups {
  const [v, setV] = useState<Lookups>(lookupCache ?? { projects: [], brokers: [], sources: [], brokerRm: {} });
  useEffect(() => {
    if (lookupCache) return;
    const j = (u: string) => fetch(u, { cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
    Promise.all([j("/api/projects?limit=500"), j("/api/brokers?limit=200"), j("/api/sources")]).then(([p, b, s]) => {
      lookupCache = {
        projects: (p.projects ?? []).map((x: { _id: string; name: string }) => ({ value: x._id, label: x.name })),
        brokers: (b.brokers ?? []).map((x: { _id: string; name: string; firmName?: string }) => ({
          value: x._id,
          label: x.firmName ? `${x.firmName} (${x.name})` : x.name,
        })),
        sources: (s.sources ?? []).map((x: { key: string; label: string }) => ({ value: x.key, label: x.label })),
        brokerRm: {},
      };
      setV(lookupCache);
    });
  }, []);
  return v;
}

/* ───────────── persisted column selection ───────────── */

export function useColumns(storageKey: string, all: string[]) {
  const [cols, setCols] = useState<string[]>(all);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as string[];
        const valid = parsed.filter((k) => all.includes(k));
        if (valid.length) setCols(valid);
      }
    } catch {
      /* storage unavailable */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);
  const update = useCallback(
    (next: string[]) => {
      const ordered = all.filter((k) => next.includes(k));
      setCols(ordered);
      try {
        localStorage.setItem(storageKey, JSON.stringify(ordered));
      } catch {
        /* ignore */
      }
    },
    [storageKey, all],
  );
  return [cols, update] as const;
}

/* ───────────── lead picker ───────────── */

export interface PickedLead {
  _id: string;
  name: string;
  phone?: string;
}

export function LeadPicker({
  value,
  onChange,
  disabled,
}: {
  value: PickedLead | null;
  onChange: (l: PickedLead | null) => void;
  disabled?: boolean;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<PickedLead[]>([]);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const seq = useRef(0);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    const my = ++seq.current;
    setBusy(true);
    const t = setTimeout(() => {
      fetch(`/api/leads?q=${encodeURIComponent(term)}&limit=8`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (my !== seq.current) return;
          setResults(
            (d.leads ?? []).map((l: { _id: string; contact?: { name?: string; primaryPhone?: string } }) => ({
              _id: l._id,
              name: l.contact?.name ?? "Unnamed",
              phone: l.contact?.primaryPhone,
            })),
          );
        })
        .catch(() => undefined)
        .finally(() => my === seq.current && setBusy(false));
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  if (value) {
    return (
      <div className="bd-input flex items-center justify-between">
        <span className="truncate">
          {value.name}
          {value.phone ? <span className="ml-2 text-[#8b90a0]">{value.phone}</span> : null}
        </span>
        {!disabled ? (
          <button type="button" aria-label="Change lead" onClick={() => onChange(null)} className="text-[#7c8296] hover:text-[#2b2f3a]">
            <X className="size-3.5" />
          </button>
        ) : null}
      </div>
    );
  }
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#9aa1b5]" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder="Search lead by name or phone"
        className="bd-input !pl-8"
      />
      {open && q.trim().length >= 2 ? (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-[4px] bg-white p-1 shadow-lg ring-1 ring-slate-900/10">
          {busy && !results.length ? <p className="px-3 py-2 text-[13px] text-[#8b90a0]">Searching…</p> : null}
          {!busy && !results.length ? <p className="px-3 py-2 text-[13px] text-[#8b90a0]">No leads found</p> : null}
          {results.map((r) => (
            <button
              type="button"
              key={r._id}
              onClick={() => {
                onChange(r);
                setQ("");
                setOpen(false);
              }}
              className={cn("flex w-full items-center justify-between rounded-[3px] px-3 py-2 text-left text-[13px] hover:bg-[#eef1fa]")}
            >
              <span className="truncate">{r.name}</span>
              <span className="ml-3 shrink-0 text-[#8b90a0]">{r.phone}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ───────────── generic fetch helper ───────────── */

export async function api<T = unknown>(url: string, method: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error ?? "Request failed");
  return data as T;
}
