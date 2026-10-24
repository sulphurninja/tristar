"use client";

import Link from "next/link";
import { useState } from "react";
import { Bell, X } from "lucide-react";

/** The orange tab pinned to the right edge — quick create shortcuts. */
export function QuickActivityTab() {
  const [open, setOpen] = useState(false);
  const items = [
    { label: "Add Lead", href: "/leads?new=1" },
    { label: "Add Task", href: "/tasks?new=1" },
    { label: "Add Site Visit", href: "/tasks?tab=site-visit&new=1" },
    { label: "Add Booking", href: "/bookings?new=1" },
  ];
  return (
    <>
      <button
        type="button"
        aria-label="Quick actions"
        onClick={() => setOpen((v) => !v)}
        className="fixed right-0 top-[52px] z-30 flex h-[46px] w-11 items-center justify-center rounded-bl-md bg-[#e8602c] text-white shadow-md hover:bg-[#d4541f]"
      >
        {open ? <X className="size-5" /> : <Bell className="size-5 fill-current" />}
      </button>
      {open ? (
        <div className="fixed right-0 top-[98px] z-30 w-52 rounded-bl-md bg-white py-1 shadow-xl ring-1 ring-slate-900/5">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              onClick={() => setOpen(false)}
              className="block px-4 py-2.5 text-[13px] text-[#2b2f3a] hover:bg-[#eef1fa]"
            >
              {i.label}
            </Link>
          ))}
        </div>
      ) : null}
    </>
  );
}
