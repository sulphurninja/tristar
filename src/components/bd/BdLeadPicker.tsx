"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

export interface LeadHit {
  _id: string;
  leadNumber?: string;
  contact?: { name?: string; primaryPhone?: string };
}

/** Type-ahead picker over /api/leads (the workspace has thousands of leads, so no preloaded list). */
export function BdLeadPicker({
  value,
  onChange,
  placeholder = "Search lead by name or mobile",
}: {
  value: LeadHit | null;
  onChange: (l: LeadHit | null) => void;
  placeholder?: string;
}) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<LeadHit[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || q.trim().length < 2) {
      setHits([]);
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/leads?q=${encodeURIComponent(q.trim())}&limit=8`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => setHits(d.leads ?? []))
        .catch(() => setHits([]));
    }, 250);
    return () => clearTimeout(t);
  }, [q, open]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  if (value) {
    return (
      <div className="bd-input flex items-center justify-between">
        <span className="truncate">
          {value.contact?.name ?? "Lead"}
          {value.leadNumber ? ` (${value.leadNumber})` : ""}
        </span>
        <button type="button" aria-label="Clear lead" onClick={() => onChange(null)} className="text-[#7c8296] hover:text-[#2b2f3a]">
          <X className="size-3.5" />
        </button>
      </div>
    );
  }
  return (
    <div ref={ref} className="relative">
      <input
        className="bd-input"
        value={q}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
      />
      {open && hits.length > 0 ? (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-[4px] bg-white p-1 shadow-lg ring-1 ring-slate-900/10">
          {hits.map((l) => (
            <li key={l._id}>
              <button
                type="button"
                className="flex w-full items-center justify-between rounded-[3px] px-3 py-2 text-left text-[13px] hover:bg-[#eef1fa]"
                onClick={() => {
                  onChange(l);
                  setQ("");
                  setOpen(false);
                }}
              >
                <span>{l.contact?.name}</span>
                <span className="text-[12px] text-[#8b90a0]">{l.contact?.primaryPhone ?? l.leadNumber}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
