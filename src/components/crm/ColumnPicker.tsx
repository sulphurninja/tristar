"use client";

import { useEffect, useRef, useState } from "react";
import { Columns3 } from "lucide-react";

export interface ColumnDef {
  key: string;
  label: string;
}

/** The "Select Columns" dropdown that sits in every Buildesk table toolbar. */
export function ColumnPicker({
  columns,
  visible,
  onChange,
}: {
  columns: ColumnDef[];
  visible: string[];
  onChange: (keys: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} className="bd-btn-light inline-flex h-[38px] items-center gap-1.5">
        <Columns3 className="size-3.5" />
        Select Columns
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 max-h-72 w-52 overflow-y-auto rounded-[3px] border border-[#dfe3ee] bg-white py-1 shadow-lg">
          {columns.map((c) => (
            <label key={c.key} className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[13px] hover:bg-[#f6f8fd]">
              <input
                type="checkbox"
                checked={visible.includes(c.key)}
                onChange={(e) =>
                  onChange(
                    e.target.checked
                      ? columns.map((x) => x.key).filter((k) => k === c.key || visible.includes(k))
                      : visible.filter((k) => k !== c.key),
                  )
                }
              />
              {c.label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
