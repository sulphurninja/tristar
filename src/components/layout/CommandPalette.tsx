"use client";

import { useEffect, useState } from "react";
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
  ListTodo,
  Contact,
  Activity,
  Home,
  CreditCard,
  Megaphone,
  BookOpen,
  FileText,
  Settings,
  Tags,
  Search,
  ArrowRight,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COMMANDS = [
  {
    group: "Quick actions",
    items: [
      {
        label: "Add new lead",
        hint: "Create enquiry",
        href: "/leads?new=1",
        icon: Plus,
        tone: "emerald",
      },
      {
        label: "New task",
        hint: "Follow-up or call",
        href: "/tasks?new=1",
        icon: ListTodo,
        tone: "violet",
      },
      {
        label: "Schedule site visit",
        hint: "SVP booking",
        href: "/visits?new=1",
        icon: CalendarCheck,
        tone: "sky",
      },
      {
        label: "Add project",
        hint: "Inventory",
        href: "/projects?new=1",
        icon: Building2,
        tone: "amber",
      },
      {
        label: "Add channel partner",
        hint: "Broker / CP",
        href: "/brokers?new=1",
        icon: Handshake,
        tone: "rose",
      },
    ],
  },
  {
    group: "CRM",
    items: [
      { label: "Home", hint: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Tasks", hint: "Today & overdue", href: "/tasks", icon: ListTodo },
      { label: "All leads", hint: "Lead list", href: "/leads", icon: ListChecks },
      { label: "Pipeline", hint: "Kanban board", href: "/leads/pipeline", icon: KanbanSquare },
      { label: "Contacts", hint: "People directory", href: "/crm/contacts", icon: Contact },
      { label: "Activities", hint: "Lead activity log", href: "/crm/activities", icon: Activity },
      { label: "Bulk update", hint: "Mass edit leads", href: "/leads/bulk-update", icon: Upload },
      { label: "Channel partners", hint: "Brokers", href: "/brokers", icon: Handshake },
    ],
  },
  {
    group: "Inventory & sales",
    items: [
      { label: "Projects", hint: "Inventory", href: "/projects", icon: Building2 },
      { label: "Property", hint: "Listings", href: "/crm/property", icon: Home },
      { label: "Site visits", hint: "Scheduled visits", href: "/visits", icon: CalendarCheck },
      { label: "SVP dashboard", hint: "Visit planner", href: "/visits/scheduled", icon: CalendarCheck },
      { label: "Bookings", hint: "Deals", href: "/bookings", icon: ClipboardList },
      { label: "Payments", hint: "Collections", href: "/bookings/payments", icon: CreditCard },
      { label: "Campaigns", hint: "Marketing", href: "/campaigns", icon: Megaphone },
    ],
  },
  {
    group: "Accounts & insights",
    items: [
      { label: "Ledger", hint: "Parties", href: "/accounts/ledger", icon: BookOpen },
      { label: "Vouchers", hint: "Entries", href: "/accounts/vouchers", icon: FileText },
      { label: "Reports hub", hint: "All reports", href: "/reports", icon: PieChart },
      {
        label: "Advance analysis",
        hint: "KPIs & delay",
        href: "/reports/advance-analysis",
        icon: Activity,
      },
      {
        label: "Team performance",
        hint: "PRF report",
        href: "/reports/team-performance",
        icon: Users,
      },
    ],
  },
  {
    group: "Manage",
    items: [
      { label: "Settings", hint: "Workspace", href: "/settings", icon: Settings },
      { label: "Users", hint: "Team access", href: "/settings/users", icon: Users },
      { label: "Pipelines & stages", hint: "Workflow", href: "/settings/pipelines", icon: KanbanSquare },
      { label: "Sources", hint: "Lead origin", href: "/settings/sources", icon: Tags },
      { label: "API keys", hint: "Integrations", href: "/settings/api-keys", icon: KeyRound },
      { label: "Requests", hint: "Approvals", href: "/requests", icon: ClipboardList },
    ],
  },
];

const TONE: Record<string, string> = {
  emerald: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  violet: "bg-violet-50 text-violet-700 ring-violet-100",
  sky: "bg-sky-50 text-sky-700 ring-sky-100",
  amber: "bg-amber-50 text-amber-700 ring-amber-100",
  rose: "bg-rose-50 text-rose-700 ring-rose-100",
};

export function CommandPalette({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) onOpenChange(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  if (!open) return null;

  const go = (href: string) => {
    router.push(href);
    onOpenChange(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh] backdrop-blur-[3px] animate-in fade-in-0"
      onClick={() => onOpenChange(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_24px_80px_-20px_rgba(15,23,42,0.45)] ring-1 ring-slate-900/5 animate-in fade-in-0 zoom-in-95"
      >
        <Command label="Command palette" shouldFilter loop>
          <div className="border-b border-slate-100 px-3 py-3">
            <div className="flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 focus-within:border-emerald-300 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/15">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
                <Search className="size-3.5" strokeWidth={2} />
              </div>
              <Command.Input
                autoFocus
                value={query}
                onValueChange={setQuery}
                placeholder="Search pages, leads actions, settings…"
                className="h-8 w-full bg-transparent text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
              />
              <kbd className="hidden shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-[10px] font-semibold text-slate-500 sm:inline">
                ESC
              </kbd>
            </div>
          </div>

          <Command.List className="max-h-[min(58vh,480px)] overflow-y-auto overscroll-contain px-2 py-2">
            <Command.Empty className="flex flex-col items-center gap-2 px-4 py-12 text-center">
              <div className="flex size-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                <Search className="size-5" />
              </div>
              <p className="text-[14px] font-medium text-slate-800">No matches</p>
              <p className="max-w-xs text-[12.5px] text-slate-500">
                Try “leads”, “pipeline”, “booking”, or a quick action like “add lead”.
              </p>
            </Command.Empty>

            {COMMANDS.map((group) => (
              <Command.Group
                key={group.group}
                heading={group.group}
                className="mb-1 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pb-1.5 [&_[cmdk-group-heading]]:pt-2.5 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-[0.12em] [&_[cmdk-group-heading]]:text-slate-400"
              >
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const tone = "tone" in item ? (item.tone as string | undefined) : undefined;
                  return (
                    <Command.Item
                      key={item.href + item.label}
                      value={`${item.label} ${item.hint ?? ""} ${group.group}`}
                      onSelect={() => go(item.href)}
                      className={cn(
                        "group mx-1 flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-slate-700 outline-none",
                        "data-[selected=true]:bg-emerald-50 data-[selected=true]:text-emerald-950",
                        "aria-selected:bg-emerald-50 aria-selected:text-emerald-950",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset",
                          tone
                            ? TONE[tone]
                            : "bg-slate-50 text-slate-600 ring-slate-100 group-data-[selected=true]:bg-white group-data-[selected=true]:text-emerald-700 group-aria-selected:bg-white group-aria-selected:text-emerald-700",
                        )}
                      >
                        <Icon className="size-4" strokeWidth={1.75} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium">{item.label}</span>
                        {item.hint ? (
                          <span className="block truncate text-[11.5px] text-slate-500 group-data-[selected=true]:text-emerald-800/70 group-aria-selected:text-emerald-800/70">
                            {item.hint}
                          </span>
                        ) : null}
                      </span>
                      <ArrowRight className="size-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-data-[selected=true]:opacity-100 group-aria-selected:opacity-100 group-data-[selected=true]:text-emerald-600 group-aria-selected:text-emerald-600" />
                    </Command.Item>
                  );
                })}
              </Command.Group>
            ))}
          </Command.List>

          <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/80 px-4 py-2.5">
            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500">
              <Hint keys={[ArrowUp, ArrowDown]} label="navigate" />
              <Hint keys={[CornerDownLeft]} label="open" />
              <Hint keys={["esc"]} label="close" />
            </div>
            <p className="hidden text-[11px] font-medium text-slate-400 sm:block">Tristar CRM</p>
          </div>
        </Command>
      </div>
    </div>
  );
}

function Hint({
  keys,
  label,
}: {
  keys: Array<string | React.ComponentType<{ className?: string }>>;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="inline-flex items-center gap-0.5">
        {keys.map((K, i) =>
          typeof K === "string" ? (
            <kbd
              key={i}
              className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-slate-600"
            >
              {K}
            </kbd>
          ) : (
            <kbd
              key={i}
              className="inline-flex size-5 items-center justify-center rounded border border-slate-200 bg-white text-slate-600"
            >
              <K className="size-3" />
            </kbd>
          ),
        )}
      </span>
      <span>{label}</span>
    </span>
  );
}
