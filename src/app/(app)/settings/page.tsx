"use client";

import Link from "next/link";
import {
  Building2,
  Users,
  Handshake,
  Tags,
  KeyRound,
  ShieldCheck,
  Phone,
  Megaphone,
  KanbanSquare,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const SECTIONS: Array<{
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  disabled?: boolean;
}> = [
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
    href: "/settings/projects",
    icon: Building2,
    title: "Manage Projects",
    desc: "Add, edit and archive your Tristar projects.",
  },
  {
    href: "/settings/sources",
    icon: Tags,
    title: "Manage Sources",
    desc: "Walkin, telecalling, channel partner, hoarding…",
  },
  {
    href: "/settings/brokers",
    icon: Handshake,
    title: "Manage Brokers",
    desc: "Channel partner directory, RERA, RM mapping.",
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
  {
    href: "#",
    icon: Phone,
    title: "Cloud Telephony",
    desc: "Outgoing calls and call recording.",
    disabled: true,
  },
  {
    href: "#",
    icon: Megaphone,
    title: "Marketing channels",
    desc: "WhatsApp, SMS, email broadcasts.",
    disabled: true,
  },
];

export default function SettingsPage() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 lg:p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure your workspace, projects, team and integrations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.title}
              href={s.disabled ? "#" : s.href}
              onClick={(e) => {
                if (s.disabled) e.preventDefault();
              }}
              className={cn(s.disabled && "cursor-not-allowed")}
            >
              <Card
                className={cn(
                  "h-full transition-all",
                  s.disabled
                    ? "opacity-60"
                    : "hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md",
                )}
              >
                <CardContent className="flex flex-col gap-3 p-5">
                  <div className="flex size-10 items-center justify-center rounded-md bg-primary-50 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold">{s.title}</p>
                      {s.disabled ? (
                        <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700">
                          Tristar+
                        </span>
                      ) : null}
                    </div>
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
