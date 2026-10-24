"use client";

import Link from "next/link";
import {
  Users,
  UsersRound,
  Handshake,
  Tags,
  KeyRound,
  ShieldCheck,
  KanbanSquare,
  Building2,
  Inbox,
} from "lucide-react";
import { BdPage } from "@/components/bd";

const SECTIONS = [
  { href: "/settings/users", icon: Users, title: "Users", desc: "Add users, assign roles and teams, suspend access." },
  { href: "/settings/teams", icon: UsersRound, title: "Teams", desc: "Group sales agents into teams with a team leader." },
  { href: "/settings/pipelines", icon: KanbanSquare, title: "Pipelines", desc: "Create sales workflows, add custom stages and reorder them." },
  { href: "/settings/sources", icon: Tags, title: "Sources", desc: "Walkin, telecalling, channel partner, hoarding..." },
  { href: "/settings/projects", icon: Building2, title: "Projects", desc: "Projects and inventory used across leads and bookings." },
  { href: "/brokers", icon: Handshake, title: "Channel Partners", desc: "Broker directory - managed from Channel Partners." },
  { href: "/settings/api-keys", icon: KeyRound, title: "API Keys", desc: "Project-scoped keys for kiosks and lead-feed integrations." },
  { href: "/settings/compliance", icon: ShieldCheck, title: "Compliance", desc: "RERA, GST and registered company details." },
  { href: "/requests", icon: Inbox, title: "Requests", desc: "Approve or reject pending requests from your team." },
];

export default function SettingsPage() {
  return (
    <BdPage>
      <div>
        <h1 className="text-[20px] font-semibold text-[#2b2f3a]">Settings</h1>
        <p className="mt-0.5 text-[12.5px] text-[#8b90a0]">Configure your workspace, team and integrations.</p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.title} href={s.href} className="block">
              <div className="bd-card flex h-full items-start gap-4 rounded-[3px] p-5 transition-shadow hover:shadow-[0_2px_12px_rgba(30,50,110,0.16)]">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-[#dbe8fd] text-[#3d7be8]">
                  <Icon className="size-6" />
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-[#2b2f3a]">{s.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-[#8b90a0]">{s.desc}</p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </BdPage>
  );
}
