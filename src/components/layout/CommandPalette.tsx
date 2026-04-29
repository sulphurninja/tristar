"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  LayoutDashboard,
  Users,
  Building2,
  CalendarCheck,
  PieChart,
  Handshake,
  Plus,
  KeyRound,
  Upload,
  ClipboardList,
  KanbanSquare,
  ListChecks,
} from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMMANDS = [
  {
    group: "Navigate",
    items: [
      { label: "Home", href: "/dashboard", icon: LayoutDashboard },
      { label: "Pipeline", href: "/leads/pipeline", icon: KanbanSquare },
      { label: "All Leads", href: "/leads", icon: ListChecks },
      { label: "Bulk Update", href: "/leads/bulk-update", icon: Upload },
      { label: "Site Visits", href: "/visits", icon: CalendarCheck },
      { label: "SVP Dashboard", href: "/visits/scheduled", icon: CalendarCheck },
      { label: "Projects", href: "/projects", icon: Building2 },
      { label: "Brokers", href: "/brokers", icon: Handshake },
      { label: "Reports", href: "/reports", icon: PieChart },
      { label: "Requests", href: "/requests", icon: ClipboardList },
      { label: "Pipelines & Stages", href: "/settings/pipelines", icon: KanbanSquare },
      { label: "Users", href: "/settings/users", icon: Users },
      { label: "API Keys", href: "/settings/api-keys", icon: KeyRound },
    ],
  },
  {
    group: "Quick actions",
    items: [
      { label: "Add new lead", href: "/leads?new=1", icon: Plus },
      { label: "Schedule site visit", href: "/visits?new=1", icon: CalendarCheck },
      { label: "Add project", href: "/projects?new=1", icon: Building2 },
      { label: "Add broker", href: "/brokers?new=1", icon: Handshake },
    ],
  },
];

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/30 p-4 pt-[15vh] backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
      >
        <Command label="Command palette">
          <Command.Input
            autoFocus
            placeholder="Search or jump to…"
            className="h-12 w-full border-b border-border bg-transparent px-4 text-sm outline-none placeholder:text-muted-foreground"
          />
          <Command.List className="max-h-[60vh] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No matches.
            </Command.Empty>
            {COMMANDS.map((group) => (
              <Command.Group
                key={group.group}
                heading={group.group}
                className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1"
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Command.Item
                      key={item.href + item.label}
                      value={item.label}
                      onSelect={() => {
                        router.push(item.href);
                        onOpenChange(false);
                      }}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm aria-selected:bg-accent aria-selected:text-accent-foreground"
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      {item.label}
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
