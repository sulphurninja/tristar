"use client";

import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Chips editor: type and press Enter / comma to add, ✕ or Backspace to remove. */
export function TagInput({
  value,
  onChange,
  placeholder = "Type and press Enter",
  suggestions = [],
  className,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
  className?: string;
}) {
  const [draft, setDraft] = React.useState("");
  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .filter((x) => !value.some((v) => v.toLowerCase() === x.toLowerCase()));
    if (parts.length) onChange([...value, ...parts]);
    setDraft("");
  };
  const open = suggestions.filter((s) => !value.includes(s) && s.toLowerCase().includes(draft.toLowerCase())).slice(0, 8);

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-[8px] border border-input bg-card px-2 py-1 shadow-[var(--shadow-xs)] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/15">
        {value.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-md bg-primary-50 py-0.5 pl-2 pr-1 text-[12.5px] text-primary-700 ring-1 ring-primary/15">
            {v}
            <button type="button" aria-label={`Remove ${v}`} onClick={() => onChange(value.filter((x) => x !== v))} className="rounded p-0.5 hover:bg-primary/10">
              <X className="size-3" />
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(draft);
            } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
          }}
          onBlur={() => draft && add(draft)}
          placeholder={value.length ? "" : placeholder}
          className="h-7 min-w-[120px] flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-muted-foreground"
        />
      </div>
      {open.length ? (
        <div className="flex flex-wrap gap-1">
          {open.map((s) => (
            <button key={s} type="button" onClick={() => add(s)} className="rounded-md border border-dashed border-input px-2 py-0.5 text-[12px] text-muted-foreground hover:border-primary/40 hover:text-primary">
              + {s}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
