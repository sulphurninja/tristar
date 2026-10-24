"use client";

import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RowMenuItem {
  label: string;
  onClick: () => void;
  danger?: boolean;
  hidden?: boolean;
}

/** ⋮ actions menu — fixed-positioned so it is never clipped by a scrolling table. */
export function RowMenu({ items }: { items: RowMenuItem[] }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const down = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", down);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      document.removeEventListener("mousedown", down);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [pos]);
  const visible = items.filter((i) => !i.hidden);
  return (
    <div ref={ref} className="inline-block">
      <button
        type="button"
        aria-label="Actions"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect();
          setPos(pos ? null : { x: Math.max(8, Math.min(r.right - 190, window.innerWidth - 198)), y: r.bottom + 2 });
        }}
        className="rounded p-1 text-[#5a6072] hover:bg-[#e9edf8]"
      >
        <MoreVertical className="size-4" />
      </button>
      {pos ? (
        <div
          style={{ left: pos.x, top: Math.min(pos.y, window.innerHeight - visible.length * 34 - 16) }}
          className="fixed z-50 w-[190px] rounded-[3px] border border-[#dfe3ee] bg-white py-1 shadow-lg"
        >
          {visible.map((i) => (
            <button
              key={i.label}
              type="button"
              onClick={() => {
                setPos(null);
                i.onClick();
              }}
              className={cn(
                "block w-full px-3 py-1.5 text-left text-[13px] hover:bg-[#f6f8fd]",
                i.danger ? "text-[#e5484d]" : "text-[#2b2f3a]",
              )}
            >
              {i.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
