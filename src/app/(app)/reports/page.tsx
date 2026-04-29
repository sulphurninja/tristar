"use client";

import Link from "next/link";
import {
  TrendingUp,
  Users,
  Building2,
  Tags,
  Handshake,
  ListTodo,
  UserCheck,
  Activity,
  ArchiveX,
  PieChart,
  CalendarCheck,
  Megaphone,
  Lock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportItem {
  href: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  disabled?: boolean;
}

const REPORTS: ReportItem[] = [
  {
    href: "/reports/lead-volume",
    title: "Lead Volume Report",
    desc: "Leads generated, visits done and conversions over time.",
    icon: TrendingUp,
  },
  {
    href: "/reports/team-performance",
    title: "Team Performance (PRF)",
    desc: "Per-user breakdown across every pipeline stage.",
    icon: Users,
  },
  {
    href: "/reports/projects",
    title: "Projects Report",
    desc: "Lead distribution and stage mix per Tristar project.",
    icon: Building2,
  },
  {
    href: "/reports/sources",
    title: "Sources Report",
    desc: "Walk-in, telecalling, channel partner and online breakdown.",
    icon: Tags,
  },
  {
    href: "#",
    title: "Marketing ROI Report",
    desc: "Campaign and ad-channel performance.",
    icon: Megaphone,
    disabled: true,
  },
  {
    href: "/reports/channel-partner",
    title: "Channel Partner Report",
    desc: "Lead and conversion split per broker / firm.",
    icon: Handshake,
  },
  {
    href: "/reports/backlog",
    title: "Backlog Report",
    desc: "Leads pending action, broken down by user.",
    icon: ListTodo,
  },
  {
    href: "/reports/closing-manager-backlog",
    title: "Closing Manager Backlog",
    desc: "Per closing manager — what's still open.",
    icon: ListTodo,
  },
  {
    href: "/reports/activity",
    title: "Activity Report",
    desc: "Total edits, comments and unique leads touched.",
    icon: Activity,
  },
  {
    href: "/reports/inactive-leads",
    title: "Inactive Lead Report",
    desc: "Leads with no contact for 30+ days.",
    icon: ArchiveX,
  },
  {
    href: "/reports/inactive-lead-source",
    title: "Inactive Lead Source",
    desc: "Inactive lead split by lead source.",
    icon: Tags,
  },
  {
    href: "/reports/svc-user",
    title: "SVC User Report",
    desc: "Site Visit Conversion per user.",
    icon: UserCheck,
  },
  {
    href: "/reports/svc-source",
    title: "SVC Source Report",
    desc: "Site Visit Conversion per lead source.",
    icon: PieChart,
  },
  {
    href: "/reports/closing-manager",
    title: "Closing Manager Report",
    desc: "Closing manager performance — pipeline to booking.",
    icon: TrendingUp,
  },
  {
    href: "/reports/personalised",
    title: "Personalised Reports",
    desc: "Reports filtered to your assigned leads only.",
    icon: CalendarCheck,
  },
];

export default function ReportsLandingPage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-6 lg:p-10">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reports</h1>
        <p className="mt-1 text-[13px] text-slate-600">
          Operational reports across leads, sources, brokers, sites visits and team activity —
          live data, always.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const inner = (
            <div
              className={cn(
                "rounded-xl border border-slate-200/70 bg-white p-5 transition-all",
                r.disabled
                  ? "cursor-not-allowed opacity-60"
                  : "hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                  <Icon className="size-5" />
                </div>
                {r.disabled ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                    <Lock className="size-2.5" /> Tristar+
                  </span>
                ) : null}
              </div>
              <h3 className="mt-3 text-[14px] font-semibold text-slate-900">{r.title}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-slate-600">{r.desc}</p>
            </div>
          );

          if (r.disabled) {
            return (
              <div
                key={r.title}
                title="Available in the Tristar+ edition"
                className="block"
              >
                {inner}
              </div>
            );
          }
          return (
            <Link key={r.title} href={r.href} className="block">
              {inner}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
