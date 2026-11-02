"use client";

import Link from "next/link";
import {
  ArrowUpRight,
  Building2,
  Handshake,
  Inbox,
  KanbanSquare,
  KeyRound,
  ShieldCheck,
  Tags,
  Users,
  UsersRound,
  FileBadge,
  ListTree,
  FormInput,
  MonitorSmartphone,
} from "lucide-react";
import { BdPage, BdPageHeader } from "@/components/bd";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPage } from "@/lib/permissions";

const GROUPS = [
  {
    label: "People & access",
    items: [
      { href: "/settings/users", icon: Users, title: "Users", desc: "Invite people, assign roles and teams, suspend access." },
      { href: "/settings/teams", icon: UsersRound, title: "Teams", desc: "Group agents under a team leader for team-level visibility." },
      { href: "/settings/roles", icon: ShieldCheck, title: "Roles & permissions", desc: "Decide what each role can see and do across the workspace." },
      { href: "/requests", icon: Inbox, title: "Requests", desc: "Approve or reject pending requests from your team." },
    ],
  },
  {
    label: "Sales setup",
    items: [
      { href: "/settings/masters", icon: ListTree, title: "Masters", desc: "Pick-lists: contact types, budgets, amenities, property types and more." },
      { href: "/settings/lead-form", icon: FormInput, title: "Lead form fields", desc: "Choose which fields show on the New lead form and which are mandatory." },
      { href: "/settings/reception", icon: MonitorSmartphone, title: "Reception app", desc: "Set up the front-desk check-in screen and who gets each walk-in." },
      { href: "/settings/pipelines", icon: KanbanSquare, title: "Pipelines", desc: "Sales workflows, custom stages and their order." },
      { href: "/settings/sources", icon: Tags, title: "Lead sources", desc: "Walk-in, telecalling, channel partner, hoardings and more." },
      { href: "/settings/projects", icon: Building2, title: "Projects", desc: "Projects and inventory used across leads and bookings." },
      { href: "/brokers", icon: Handshake, title: "Channel partners", desc: "Broker directory and partner companies." },
    ],
  },
  {
    label: "Workspace",
    items: [
      { href: "/settings/api-keys", icon: KeyRound, title: "API keys", desc: "Project-scoped keys for kiosks and lead-feed integrations." },
      { href: "/settings/compliance", icon: FileBadge, title: "Compliance", desc: "RERA, GST and registered company details." },
    ],
  },
];

export default function SettingsPage() {
  const { user } = useAuth();
  const groups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => canAccessPage(i.href, user?.role, user?.permissions)),
  })).filter((g) => g.items.length);

  return (
    <BdPage>
      <BdPageHeader title="Settings" description="Configure your workspace, your people and how they work." />
      {groups.map((g) => (
        <section key={g.label} className="space-y-3">
          <h2 className="text-[12px] font-medium uppercase tracking-[0.07em] text-muted-foreground">{g.label}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {g.items.map((s) => {
              const Icon = s.icon;
              return (
                <Link
                  key={s.href}
                  href={s.href}
                  className="group bd-card relative flex h-full flex-col p-4 transition-[box-shadow,border-color] hover:border-primary/30 hover:shadow-[var(--shadow-md)]"
                >
                  <span className="flex size-9 items-center justify-center rounded-[9px] bg-primary-50 text-primary ring-1 ring-primary/10">
                    <Icon className="size-[18px]" />
                  </span>
                  <p className="mt-3 text-[14px] font-semibold tracking-[-0.01em]">{s.title}</p>
                  <p className="mt-1 text-[12.5px] leading-relaxed text-muted-foreground">{s.desc}</p>
                  <ArrowUpRight className="absolute right-4 top-4 size-4 text-muted-foreground/50 transition-colors group-hover:text-primary" />
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </BdPage>
  );
}
