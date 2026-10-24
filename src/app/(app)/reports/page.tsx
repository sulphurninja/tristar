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
} from "lucide-react";
import { BdPage } from "@/components/bd";

interface ReportItem {
  href: string;
  title: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ReportGroup {
  title: string;
  desc: string;
  items: ReportItem[];
}

const GROUPS: ReportGroup[] = [
  {
    title: "Lead analysis",
    desc: "Volume, pipeline health and inactivity.",
    items: [
      {
        href: "/reports/lead-analysis",
        title: "Lead Analysis",
        desc: "Day-wise lead, site visit, booking and unqualified counts with activity delay.",
        icon: PieChart,
      },
      {
        href: "/reports/advance-analysis",
        title: "Advance Analysis",
        desc: "Today’s KPIs, activity on-time rate and delay by agent.",
        icon: PieChart,
      },
      {
        href: "/reports/lead-volume",
        title: "Lead Volume Report",
        desc: "Leads generated, visits done and conversions over time.",
        icon: TrendingUp,
      },
      {
        href: "/reports/backlog",
        title: "Backlog Report",
        desc: "Leads pending action, broken down by user.",
        icon: ListTodo,
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
    ],
  },
  {
    title: "Team & sources",
    desc: "Who’s converting and where leads come from.",
    items: [
      {
        href: "/reports/team-performance",
        title: "Team Performance (PRF)",
        desc: "Per-user breakdown across every pipeline stage.",
        icon: Users,
      },
      {
        href: "/reports/sources",
        title: "Sources Report",
        desc: "Walk-in, telecalling, channel partner and online breakdown.",
        icon: Tags,
      },
      {
        href: "/reports/projects",
        title: "Projects Report",
        desc: "Lead distribution and stage mix per Tristar project.",
        icon: Building2,
      },
      {
        href: "/reports/channel-partner",
        title: "Channel Partner Report",
        desc: "Lead and conversion split per broker / firm.",
        icon: Handshake,
      },
      {
        href: "/reports/closing-manager",
        title: "Closing Manager Report",
        desc: "Closing manager performance — pipeline to booking.",
        icon: TrendingUp,
      },
      {
        href: "/reports/closing-manager-backlog",
        title: "Closing Manager Backlog",
        desc: "Per closing manager — what's still open.",
        icon: ListTodo,
      },
    ],
  },
  {
    title: "Visits & activity",
    desc: "Site visits, conversions and daily activity.",
    items: [
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
        href: "/reports/activity",
        title: "Activity Report",
        desc: "Total edits, comments and unique leads touched.",
        icon: Activity,
      },
      {
        href: "/reports/personalised",
        title: "Personalised Reports",
        desc: "Reports filtered to your assigned leads only.",
        icon: CalendarCheck,
      },
    ],
  },
];

function ReportCard({ r }: { r: ReportItem }) {
  const Icon = r.icon;
  return (
    <Link href={r.href} className="block">
      <div className="bd-card flex h-full items-start gap-4 rounded-[3px] p-5 transition-shadow hover:shadow-[0_2px_12px_rgba(30,50,110,0.16)]">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-[#dbe8fd] text-[#3d7be8]">
          <Icon className="size-6" />
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-medium text-[#2b2f3a]">{r.title}</h3>
          <p className="mt-1 text-[12.5px] leading-relaxed text-[#8b90a0]">{r.desc}</p>
        </div>
      </div>
    </Link>
  );
}

export default function ReportsLandingPage() {
  return (
    <BdPage className="space-y-6">
      <div>
        <h1 className="text-[20px] font-semibold text-[#2b2f3a]">Reports</h1>
        <p className="mt-0.5 text-[12.5px] text-[#8b90a0]">
          Operational reports across leads, sources, brokers, site visits and team activity - live data.
        </p>
      </div>

      {GROUPS.map((g) => (
        <section key={g.title} className="space-y-3">
          <div>
            <h2 className="text-[16px] font-medium text-[#2b2f3a]">{g.title}</h2>
            <p className="text-[12.5px] text-[#8b90a0]">{g.desc}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((r) => (
              <ReportCard key={r.title} r={r} />
            ))}
          </div>
        </section>
      ))}
    </BdPage>
  );
}
