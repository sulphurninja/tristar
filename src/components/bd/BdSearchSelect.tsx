"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BdOption } from "@/components/bd";

/**
 * "Search & Select …" combobox. Either pass static `options` (filtered locally)
 * or `onSearch` for server-side lookups that resolve to options.
 */
export function BdSearchSelect({
  value,
  selectedLabel,
  onChange,
  options,
  onSearch,
  placeholder = "Search & Select",
  className,
}: {
  value: string;
  /** Label to show for `value` when it is not in `options` (server-side search). */
  selectedLabel?: string;
  onChange: (value: string, option?: BdOption) => void;
  options?: BdOption[];
  onSearch?: (q: string) => Promise<BdOption[]>;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState<BdOption[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (!open || !onSearch) return;
    let live = true;
    const t = setTimeout(() => {
      onSearch(q)
        .then((r) => live && setRemote(r))
        .catch(() => undefined);
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q, open, onSearch]);

  const list = useMemo(() => {
    if (onSearch) return remote;
    const needle = q.trim().toLowerCase();
    return (options ?? []).filter((o) => !needle || o.label.toLowerCase().includes(needle)).slice(0, 100);
  }, [onSearch, remote, options, q]);

  const label = value ? (options?.find((o) => o.value === value)?.label ?? selectedLabel ?? value) : "";

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn("bd-input flex items-center pr-12 text-left", !label && "text-[#9aa1b5]")}
      >
        <span className="truncate">{label || placeholder}</span>
      </button>
      {value ? (
        <button
          type="button"
          aria-label="Clear"
          onClick={() => onChange("")}
          className="absolute right-7 top-1/2 -translate-y-1/2 text-[#7c8296] hover:text-[#2b2f3a]"
        >
          <X className="size-3.5" />
        </button>
      ) : null}
      <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#7c8296]" />
      {open ? (
        <div className="absolute left-0 right-0 top-full z-40 mt-1 rounded-[3px] border border-[#dfe3ee] bg-white shadow-lg">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="w-full border-b border-[#eef0f6] px-3 py-2 text-[13px] outline-none"
          />
          <ul className="max-h-56 overflow-y-auto py-1">
            {list.length === 0 ? (
              <li className="px-3 py-2 text-[13px] text-[#8b90a0]">No results found</li>
            ) : (
              list.map((o) => (
                <li key={o.value}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(o.value, o);
                      setOpen(false);
                      setQ("");
                    }}
                    className={cn(
                      "block w-full px-3 py-2 text-left text-[13px] hover:bg-[#3a5dc2] hover:text-white",
                      o.value === value && "bg-[#eef1fa]",
                    )}
                  >
                    {o.label}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
