"use client";

import { useCallback, useEffect, useState } from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { ChevronDown, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/components/leads/ui/primitives";
import type { Filters } from "./FilterPanel";

export interface SavedFilter {
  _id: string;
  name: string;
  params: Filters;
}

/** "Select Advance Filter" - per-user saved filter presets. */
export function SavedFilterPicker({
  activeId,
  onPick,
  reloadKey,
}: {
  activeId: string;
  onPick: (f: SavedFilter | null) => void;
  reloadKey: number;
}) {
  const [items, setItems] = useState<SavedFilter[]>([]);
  const [open, setOpen] = useState(false);
  const load = useCallback(() => {
    api<{ filters: SavedFilter[] }>("/api/leads/saved-filters")
      .then((d) => setItems(d.filters))
      .catch(() => undefined);
  }, []);
  useEffect(load, [load, reloadKey]);
  const active = items.find((i) => i._id === activeId);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className="bd-input relative flex !w-[200px] items-center pr-12 text-left"
          aria-label="Select Advance Filter"
        >
          <span className={`truncate ${active ? "text-[#2b2f3a]" : "text-[#9aa1b5]"}`}>{active?.name ?? "Select Advance Filter"}</span>
          {active ? (
            <span
              role="button"
              aria-label="Clear saved filter"
              onClick={(e) => {
                e.stopPropagation();
                onPick(null);
              }}
              className="absolute right-7 top-1/2 -translate-y-1/2 text-[#7c8296] hover:text-black"
            >
              <X className="size-3.5" />
            </span>
          ) : null}
          <ChevronDown className="absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-[#7c8296]" />
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={3}
          className="z-[96] max-h-[300px] w-[260px] overflow-y-auto rounded-[4px] border border-[#e3e6ef] bg-white py-1 text-[13.5px] shadow-[0_8px_28px_rgba(30,50,110,0.2)] outline-none"
        >
          {items.length === 0 ? (
            <p className="px-3 py-3 text-[#8b90a0]">No saved filters yet. Use the orange filter button, set filters and choose Save Filter.</p>
          ) : null}
          {items.map((f) => (
            <div key={f._id} className="group flex items-center hover:bg-[#eef1fa]">
              <button
                type="button"
                className="min-w-0 flex-1 truncate px-3 py-2 text-left"
                onClick={() => {
                  onPick(f);
                  setOpen(false);
                }}
              >
                {f.name}
              </button>
              <button
                type="button"
                aria-label={`Delete ${f.name}`}
                className="mr-2 hidden rounded p-1 text-[#c93c41] hover:bg-white group-hover:block"
                onClick={async () => {
                  try {
                    await api(`/api/leads/saved-filters/${f._id}`, { method: "DELETE" });
                    if (f._id === activeId) onPick(null);
                    load();
                    toast.success("Filter deleted");
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Could not delete");
                  }
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
