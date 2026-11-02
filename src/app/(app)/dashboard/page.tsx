"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  User,
  RefreshCw,
  Pointer,
  UserPlus,
  Home,
  FileText,
  Phone,
  Handshake,
  CircleEllipsis,
  ChevronRight,
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPage } from "@/lib/permissions";
import {
  BdPage,
  BdPageHeader,
  BdCard,
  BdKpi,
  BdTabs,
  BdTable,
  BdTh,
  BdTd,
  BdEmptyRow,
  BdBadge,
  BdSelect,
  formatBdDate,
} from "@/components/bd";
import {
  TeamAgentSelects,
  scopeQuery,
  type TeamAgentValue,
} from "@/components/bd/TeamAgentSelects";

const NONE: TeamAgentValue = { team: "", agent: "" };

/** Local calendar date as YYYY-MM-DD (what the list filters expect). */
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const RANGES = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "tomorrow", label: "Tomorrow" },
  { value: "last7", label: "Last 7 Days" },
  { value: "next7", label: "Next 7 Days" },
  { value: "thismonth", label: "This Month" },
];

function useSection<T>(section: string, scope: TeamAgentValue) {
  const [data, setData] = useState<T | null>(null);
  useEffect(() => {
    const u = scopeQuery(scope);
    u.set("section", section);
    let live = true;
    fetch(`/api/dashboard/summary?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => live && setData(d))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [section, scope]);
  return data;
}

interface AllLeads {
  total: number;
  fresh: number;
  returning: number;
  untouched: number;
  unassigned: number;
}
interface TodayLeads {
  leads: number;
  fresh: number;
  returning: number;
  tasks: number;
  siteVisits: number;
}
interface Activity {
  tasks: number;
  meetings: number;
  offlineCalls: number;
  ivrCalls: number;
  callsToLead: number;
  callsToContact: number;
  callsToChannelPartner: number;
  siteVisitScheduled: number;
  siteVisitCompleted: number;
}

export default function DashboardPage() {
  const [s1, setS1] = useState<TeamAgentValue>(NONE);
  const [s2, setS2] = useState<TeamAgentValue>(NONE);
  const [s3, setS3] = useState<TeamAgentValue>(NONE);
  const [s4, setS4] = useState<TeamAgentValue>(NONE);
  const { user, can } = useAuth();

  const all = useSection<AllLeads>("leads", s1);
  const today = useSection<TodayLeads>("today", s2);
  const act = useSection<Activity>("activity", s3);
  const n = (v?: number) => (v ?? 0).toLocaleString("en-IN");

  /* Team / agent pickers only make sense for people who can see beyond their own records. */
  const wide = user?.role === "owner" || user?.dataScope !== "own";
  const filter = (v: TeamAgentValue, set: (v: TeamAgentValue) => void) =>
    wide ? <TeamAgentSelects value={v} onChange={set} /> : null;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });

  /*
   * Every number drills into the list it counts, carrying that card's Team / Sales
   * Agent selection. Returns undefined (plain, non-clickable card) when the user
   * can't open the destination.
   */
  const today0 = ymd(new Date());
  const to = (path: string, scope: TeamAgentValue, params: Record<string, string> = {}) => {
    if (!canAccessPage(path, user?.role, user?.permissions)) return undefined;
    const u = new URLSearchParams(params);
    if (scope.team) u.set("team", scope.team);
    if (scope.agent) u.set("agent", scope.agent);
    const qs = u.toString();
    return qs ? `${path}?${qs}` : path;
  };
  const leads = (scope: TeamAgentValue, p: Record<string, string> = {}) => to("/leads", scope, { view: "all", ...p });
  const createdToday = { createdFrom: today0, createdTo: today0 };
  const tasks = (scope: TeamAgentValue, p: Record<string, string> = {}) => to("/tasks", scope, { range: "today", ...p });
  const visits = (scope: TeamAgentValue, p: Record<string, string> = {}) =>
    to("/tasks", scope, { tab: "site-visit", range: "today", ...p });
  const calls = to("/crm/logs", s3, { range: "today" });
  const ivr = to("/communication-analysis", s3);

  return (
    <BdPage>
      <BdPageHeader
        eyebrow={dateLabel}
        title={`${greeting}, ${user?.name?.split(" ")[0] ?? "there"}`}
        description={
          wide ? "Here’s how your pipeline is moving today." : "Here’s how your leads, tasks and visits are moving today."
        }
        actions={
          can("leads.create") ? (
            <Link href="/leads?new=1" className="bd-btn">
              <UserPlus className="size-4" /> New lead
            </Link>
          ) : null
        }
      />

      <BdCard title="Pipeline overview" description="All leads in your view" actions={filter(s1, setS1)}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <BdKpi label="Total leads" value={n(all?.total)} icon={Users} tone="blue" href={leads(s1)} />
          <BdKpi label="Fresh" value={n(all?.fresh)} icon={User} tone="cyan" href={leads(s1, { returning: "0" })} />
          <BdKpi
            label="Returning"
            value={n(all?.returning)}
            icon={RefreshCw}
            tone="violet"
            href={leads(s1, { returning: "1" })}
          />
          <BdKpi
            label="Untouched"
            value={n(all?.untouched)}
            icon={Pointer}
            tone="yellow"
            hint="Never contacted"
            href={leads(s1, { card: "untouched" })}
          />
          <BdKpi
            label="Unassigned"
            value={n(all?.unassigned)}
            icon={UserPlus}
            tone="red"
            hint="Need an owner"
            href={wide ? leads(NONE, { unassigned: "1" }) : undefined}
          />
        </div>
      </BdCard>

      <BdCard title="Today" description="New enquiries and scheduled work" actions={filter(s2, setS2)}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
          <BdKpi label="New leads" value={n(today?.leads)} icon={Users} tone="blue" href={leads(s2, createdToday)} />
          <BdKpi
            label="Fresh"
            value={n(today?.fresh)}
            icon={User}
            tone="cyan"
            href={leads(s2, { ...createdToday, returning: "0" })}
          />
          <BdKpi
            label="Returning"
            value={n(today?.returning)}
            icon={RefreshCw}
            tone="violet"
            href={leads(s2, { ...createdToday, returning: "1" })}
          />
          <BdKpi label="Tasks due" value={n(today?.tasks)} icon={FileText} tone="yellow" href={tasks(s2)} />
          <BdKpi label="Site visits" value={n(today?.siteVisits)} icon={Home} tone="green" href={visits(s2)} />
        </div>
      </BdCard>

      <BdCard title="Today’s activity" description="Calls, meetings and visits logged today" actions={filter(s3, setS3)}>
        <div className="grid gap-4 lg:grid-cols-3">
          <ActivityGroup title="Work">
            <ActivityRow icon={FileText} tone="yellow" label="Tasks" value={n(act?.tasks)} href={tasks(s3)} />
            <ActivityRow
              icon={Handshake}
              tone="cyan"
              label="Meetings"
              value={n(act?.meetings)}
              href={tasks(s3, { activityType: "meeting" })}
            />
            <ActivityRow
              icon={Home}
              tone="green"
              label="Site visits scheduled"
              value={n(act?.siteVisitScheduled)}
              href={visits(s3, { status: "pending" })}
            />
            <ActivityRow
              icon={Home}
              tone="green"
              label="Site visits completed"
              value={n(act?.siteVisitCompleted)}
              href={visits(s3, { status: "completed" })}
            />
          </ActivityGroup>
          <ActivityGroup title="Offline calls" total={n(act?.offlineCalls)} href={calls}>
            <ActivityRow icon={Users} tone="violet" label="To leads" value={n(act?.callsToLead)} href={calls} />
            <ActivityRow icon={User} tone="blue" label="To contacts" value={n(act?.callsToContact)} href={calls} />
            <ActivityRow
              icon={CircleEllipsis}
              tone="grey"
              label="To channel partners"
              value={n(act?.callsToChannelPartner)}
              href={calls}
            />
          </ActivityGroup>
          <ActivityGroup title="IVR calls" total={n(act?.ivrCalls)} href={ivr}>
            <ActivityRow icon={Users} tone="violet" label="To leads" value="0" href={ivr} />
            <ActivityRow icon={User} tone="blue" label="To contacts" value="0" href={ivr} />
            <ActivityRow icon={CircleEllipsis} tone="grey" label="To channel partners" value="0" href={ivr} />
          </ActivityGroup>
        </div>
      </BdCard>

      {can("tasks.view") ? <TaskVisitPanel /> : null}

      {can("reports.team") ? (
        <BdCard title="Team performance" description="Lead load and follow-through by sales agent" actions={filter(s4, setS4)}>
          <ExecutiveTable scope={s4} />
        </BdCard>
      ) : null}
    </BdPage>
  );
}

const TONE: Record<string, { bg: string; fg: string }> = {
  yellow: { bg: "hsl(38 90% 95%)", fg: "hsl(32 85% 38%)" },
  cyan: { bg: "hsl(188 50% 95%)", fg: "hsl(188 64% 32%)" },
  green: { bg: "hsl(156 45% 95%)", fg: "hsl(156 58% 30%)" },
  blue: { bg: "hsl(var(--primary-50))", fg: "hsl(var(--primary))" },
  violet: { bg: "hsl(258 40% 96%)", fg: "hsl(258 38% 50%)" },
  grey: { bg: "hsl(var(--muted))", fg: "hsl(var(--muted-foreground))" },
};

function ActivityGroup({
  title,
  total,
  href,
  children,
}: {
  title: string;
  total?: string;
  href?: string;
  children: React.ReactNode;
}) {
  const head = (
    <>
      <p className="text-[12px] font-medium uppercase tracking-[0.06em] text-muted-foreground group-hover:text-foreground">
        {title}
      </p>
      {total !== undefined ? <p className="text-[18px] font-semibold tabular-nums tracking-[-0.02em]">{total}</p> : null}
    </>
  );
  return (
    <div className="rounded-xl border border-border/80 bg-muted/30 p-1.5">
      {href ? (
        <Link
          href={href}
          className="group flex items-baseline justify-between rounded-[8px] px-2.5 pb-1.5 pt-1 transition-colors hover:bg-white/70"
        >
          {head}
        </Link>
      ) : (
        <div className="flex items-baseline justify-between px-2.5 pb-1.5 pt-1">{head}</div>
      )}
      <div className="divide-y divide-border/70 overflow-hidden rounded-[9px] bg-white ring-1 ring-border/70">
        {children}
      </div>
    </div>
  );
}

function ActivityRow({
  icon: Icon,
  tone,
  label,
  value,
  href,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  value: string;
  href?: string;
}) {
  const t = TONE[tone] ?? TONE.grey;
  const body = (
    <>
      <span className="flex size-7 shrink-0 items-center justify-center rounded-[7px]" style={{ background: t.bg, color: t.fg }}>
        <Icon className="size-3.5" />
      </span>
      <span className="flex-1 text-[13px] text-foreground/85 group-hover:text-foreground">{label}</span>
      <span className="text-[15px] font-semibold tabular-nums">{value}</span>
      {href ? (
        <ChevronRight className="-mr-1 size-3.5 text-muted-foreground/40 transition-colors group-hover:text-primary" />
      ) : null}
    </>
  );
  return href ? (
    <Link href={href} className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-primary-50/60">
      {body}
    </Link>
  ) : (
    <div className="flex items-center gap-3 px-3 py-2.5">{body}</div>
  );
}

/* ───────── Tasks / Site Visit tabs ───────── */

interface TaskRow {
  _id: string;
  title: string;
  type: string;
  status: string;
  scheduleAt?: string;
  remark?: string;
  leadId?: { _id: string; contact?: { name?: string } } | null;
  assignedTo?: { name?: string } | null;
}
interface VisitRow {
  _id: string;
  scheduledAt: string;
  status: string;
  mode?: string;
  leadId?: { _id: string; contact?: { name?: string } } | null;
  projectId?: { name?: string } | null;
  assignedTo?: { name?: string } | null;
}

const ACTIVITY_LABEL: Record<string, string> = {
  call: "Call",
  meeting: "Meeting",
  site_visit: "Site Visit",
  follow_up: "Follow Up",
  whatsapp: "WhatsApp",
  email: "E-Mail",
  other: "Other",
};

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  pending: { label: "To do", color: "#d97706" },
  upcoming: { label: "To do", color: "#d97706" },
  completed: { label: "Completed", color: "#2fa56b" },
  cancelled: { label: "Cancelled", color: "#8b90a0" },
  planned: { label: "Scheduled", color: "#d97706" },
  confirmed: { label: "Confirmed", color: "#2563eb" },
  in_progress: { label: "In Progress", color: "#2563eb" },
  done: { label: "Completed", color: "#2fa56b" },
  no_show: { label: "No Show", color: "#8b90a0" },
  rescheduled: { label: "Rescheduled", color: "#e9b72a" },
};

function TaskVisitPanel() {
  const [tab, setTab] = useState<"tasks" | "visits">("tasks");
  const [range, setRange] = useState("today");
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const url =
      tab === "tasks"
        ? `/api/tasks?range=${range || "today"}&limit=100`
        : `/api/visits?range=${["today"].includes(range) || !range ? "today" : "all"}&limit=100`;
    fetch(url, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (tab === "tasks") {
          setTasks(d.tasks ?? []);
          setTotal(d.total ?? 0);
        } else {
          setVisits(d.visits ?? []);
          setTotal(d.total ?? 0);
        }
      })
      .finally(() => setLoading(false));
  }, [tab, range]);

  useEffect(load, [load]);

  async function patch(url: string, body: Record<string, unknown>) {
    await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    load();
  }

  return (
    <div className="bd-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 px-5 py-3">
        <BdTabs
          tabs={[
            { key: "tasks", label: "Tasks" },
            { key: "visits", label: "Site visits" },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="flex items-center gap-3">
          <span className="text-[12.5px] tabular-nums text-muted-foreground">
            {total} {tab === "tasks" ? "tasks" : "visits"}
          </span>
          <BdSelect
            className="w-[200px]"
            value={range}
            onChange={setRange}
            clearable={false}
            placeholder="Today"
            options={RANGES}
          />
        </div>
      </div>
      <div className="p-5">
        <div className="max-h-[420px] overflow-y-auto">
          {tab === "tasks" ? (
            <BdTable>
              <thead className="sticky top-0 z-[1]">
                <tr>
                  <BdTh>#</BdTh>
                  <BdTh>Details</BdTh>
                  <BdTh>Type</BdTh>
                  <BdTh>Schedule Date</BdTh>
                  <BdTh>Agenda</BdTh>
                  <BdTh>Activity Type</BdTh>
                  <BdTh>Sales Agent</BdTh>
                  <BdTh>Status</BdTh>
                  <BdTh>Action</BdTh>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? <BdEmptyRow colSpan={9} loading={loading} /> : null}
                {tasks.map((t, i) => {
                  const st = STATUS_STYLE[t.status] ?? STATUS_STYLE.pending;
                  return (
                    <tr key={t._id}>
                      <BdTd>{i + 1}</BdTd>
                      <BdTd>
                        {t.leadId?._id ? (
                          <Link href={`/leads?open=${t.leadId._id}`} className="hover:text-primary hover:underline">
                            {t.leadId.contact?.name ?? t.title}
                          </Link>
                        ) : (
                          t.title
                        )}
                      </BdTd>
                      <BdTd>
                        <BdBadge>{t.leadId ? "Lead" : t.title ? "Other" : "Other"}</BdBadge>
                      </BdTd>
                      <BdTd className="max-w-[160px]">{formatBdDate(t.scheduleAt)}</BdTd>
                      <BdTd>{t.remark || t.title}</BdTd>
                      <BdTd>{ACTIVITY_LABEL[t.type] ?? t.type}</BdTd>
                      <BdTd>{t.assignedTo?.name ?? "-"}</BdTd>
                      <BdTd>
                        <BdBadge color={st.color}>{st.label}</BdBadge>
                      </BdTd>
                      <BdTd>
                        <RowActions
                          leadId={t.leadId?._id}
                          done={t.status === "completed"}
                          onComplete={() => patch(`/api/tasks/${t._id}`, { status: "completed" })}
                          onCancel={() => patch(`/api/tasks/${t._id}`, { status: "cancelled" })}
                        />
                      </BdTd>
                    </tr>
                  );
                })}
              </tbody>
            </BdTable>
          ) : (
            <BdTable>
              <thead className="sticky top-0 z-[1]">
                <tr>
                  <BdTh>#</BdTh>
                  <BdTh>Lead</BdTh>
                  <BdTh>Project</BdTh>
                  <BdTh>Schedule Date</BdTh>
                  <BdTh>Mode</BdTh>
                  <BdTh>Sales Agent</BdTh>
                  <BdTh>Status</BdTh>
                  <BdTh>Action</BdTh>
                </tr>
              </thead>
              <tbody>
                {visits.length === 0 ? <BdEmptyRow colSpan={8} loading={loading} /> : null}
                {visits.map((v, i) => {
                  const st = STATUS_STYLE[v.status] ?? STATUS_STYLE.planned;
                  return (
                    <tr key={v._id}>
                      <BdTd>{i + 1}</BdTd>
                      <BdTd>
                        {v.leadId?._id ? (
                          <Link href={`/leads?open=${v.leadId._id}`} className="hover:text-primary hover:underline">
                            {v.leadId.contact?.name ?? "-"}
                          </Link>
                        ) : (
                          "-"
                        )}
                      </BdTd>
                      <BdTd>{v.projectId?.name ?? "-"}</BdTd>
                      <BdTd>{formatBdDate(v.scheduledAt)}</BdTd>
                      <BdTd className="capitalize">{(v.mode ?? "in_person").replace("_", " ")}</BdTd>
                      <BdTd>{v.assignedTo?.name ?? "-"}</BdTd>
                      <BdTd>
                        <BdBadge color={st.color}>{st.label}</BdBadge>
                      </BdTd>
                      <BdTd>
                        <RowActions
                          leadId={v.leadId?._id}
                          done={v.status === "done"}
                          onComplete={() => patch(`/api/visits/${v._id}`, { status: "done" })}
                          onCancel={() => patch(`/api/visits/${v._id}`, { status: "cancelled" })}
                        />
                      </BdTd>
                    </tr>
                  );
                })}
              </tbody>
            </BdTable>
          )}
        </div>
      </div>
    </div>
  );
}

function RowActions({
  leadId,
  done,
  onComplete,
  onCancel,
}: {
  leadId?: string;
  done: boolean;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const item =
    "flex cursor-pointer items-center rounded-[8px] px-2.5 py-2 text-[13px] outline-none data-[highlighted]:bg-muted";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Actions"
          className="flex size-7 items-center justify-center rounded-[7px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <CircleEllipsis className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-44 rounded-xl border border-border bg-white p-1.5 shadow-[var(--shadow-lg)]"
        >
          {leadId ? (
            <DropdownMenu.Item asChild>
              <Link href={`/leads?open=${leadId}`} className={item}>
                View lead
              </Link>
            </DropdownMenu.Item>
          ) : null}
          {!done ? (
            <DropdownMenu.Item onSelect={onComplete} className={item}>
              Mark as completed
            </DropdownMenu.Item>
          ) : null}
          {!done ? (
            <DropdownMenu.Item onSelect={onCancel} className={`${item} text-red-600`}>
              Cancel
            </DropdownMenu.Item>
          ) : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

/* ───────── Executive Lead Analysis ───────── */

interface ExecRow {
  _id: string;
  name: string;
  totalLeads: number;
  todayLeads: number;
  untouched: number;
  hot: number;
  tasksToday: number;
  overdueTasks: number;
  siteVisitsToday: number;
  siteVisitsDone: number;
  booked: number;
}

function ExecutiveTable({ scope }: { scope: TeamAgentValue }) {
  const [rows, setRows] = useState<ExecRow[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    setLoading(true);
    fetch(`/api/dashboard/executive?${scopeQuery(scope)}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setRows(d.rows ?? []))
      .finally(() => setLoading(false));
  }, [scope]);

  return (
    <BdTable minWidth={980}>
      <thead>
        <tr>
          <BdTh>#</BdTh>
          <BdTh>Sales Agent</BdTh>
          <BdTh>Total Leads</BdTh>
          <BdTh>Today's Leads</BdTh>
          <BdTh>Untouched</BdTh>
          <BdTh>Hot</BdTh>
          <BdTh>Today's Tasks</BdTh>
          <BdTh>Overdue Tasks</BdTh>
          <BdTh>Site Visits Today</BdTh>
          <BdTh>Site Visits Done</BdTh>
          <BdTh>Booked</BdTh>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? <BdEmptyRow colSpan={11} loading={loading} /> : null}
        {rows.map((r, i) => (
          <tr key={r._id}>
            <BdTd>{i + 1}</BdTd>
            <BdTd className="font-medium">{r.name}</BdTd>
            <BdTd>{r.totalLeads}</BdTd>
            <BdTd>{r.todayLeads}</BdTd>
            <BdTd>{r.untouched}</BdTd>
            <BdTd>{r.hot}</BdTd>
            <BdTd>{r.tasksToday}</BdTd>
            <BdTd>{r.overdueTasks}</BdTd>
            <BdTd>{r.siteVisitsToday}</BdTd>
            <BdTd>{r.siteVisitsDone}</BdTd>
            <BdTd>{r.booked}</BdTd>
          </tr>
        ))}
      </tbody>
    </BdTable>
  );
}

