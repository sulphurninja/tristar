"use client";

import Link from "next/link";
import {
  Users,
  Handshake,
  Tags,
  KeyRound,
  ShieldCheck,
  KanbanSquare,
  Building2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const SECTIONS = [
  {
    href: "/settings/users",
    icon: Users,
    title: "Manage Users",
    desc: "Invite users, assign roles and manage access.",
  },
  {
    href: "/settings/pipelines",
    icon: KanbanSquare,
    title: "Pipelines & Stages",
    desc: "Create sales workflows, add custom stages and reorder columns.",
  },
  {
    href: "/projects",
    icon: Building2,
    title: "Projects",
    desc: "Inventory projects — managed from the Projects module.",
  },
  {
    href: "/settings/sources",
    icon: Tags,
    title: "Manage Sources",
    desc: "Walkin, telecalling, channel partner, hoarding…",
  },
  {
    href: "/brokers",
    icon: Handshake,
    title: "Channel Partners",
    desc: "Broker directory — managed from Channel Partners.",
  },
  {
    href: "/settings/api-keys",
    icon: KeyRound,
    title: "API Keys",
    desc: "Project-scoped keys for kiosks and lead-feed integrations.",
  },
  {
    href: "/settings/compliance",
    icon: ShieldCheck,
    title: "RERA & compliance",
    desc: "RERA, GST, PAN, registered company details.",
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your workspace, team and integrations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link key={s.title} href={s.href}>
              <Card className="h-full transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex size-10 items-center justify-center rounded-md bg-primary-50 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="text-base font-semibold">{s.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
