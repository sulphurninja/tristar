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
} from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  BdPage,
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

  const all = useSection<AllLeads>("leads", s1);
  const today = useSection<TodayLeads>("today", s2);
  const act = useSection<Activity>("activity", s3);
  const n = (v?: number) => (v ?? 0).toLocaleString("en-IN");

  return (
    <BdPage>
      <BdCard
        title="All Leads"
        actions={<TeamAgentSelects value={s1} onChange={setS1} />}
        bodyClassName="p-5"
      >
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <BdKpi label="Total Leads" value={n(all?.total)} icon={Users} tone="violet" />
          <BdKpi label="Fresh Leads" value={n(all?.fresh)} icon={User} tone="blue" />
          <BdKpi label="Returning" value={n(all?.returning)} icon={RefreshCw} tone="red" />
          <BdKpi label="Untouched" value={n(all?.untouched)} icon={Pointer} tone="yellow" />
          <BdKpi label="Unassigned" value={n(all?.unassigned)} icon={UserPlus} tone="green" />
        </div>
      </BdCard>

      <BdCard
        title="Today's Leads"
        actions={<TeamAgentSelects value={s2} onChange={setS2} agentPlaceholder="Select Sales Agent." />}
      >
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-5">
          <BdKpi label="Leads" value={n(today?.leads)} icon={Users} tone="violet" />
          <BdKpi label="Fresh Leads" value={n(today?.fresh)} icon={User} tone="blue" />
          <BdKpi label="Returning" value={n(today?.returning)} icon={RefreshCw} tone="red" />
          <BdKpi label="Tasks" value={n(today?.tasks)} icon={FileText} tone="yellow" />
          <BdKpi label="Site Visits" value={n(today?.siteVisits)} icon={Home} tone="green" />
        </div>
      </BdCard>

      <BdCard title="Today's Activities Report">
        <TeamAgentSelects
          value={s3}
          onChange={setS3}
          className="mb-6"
          selectClassName="!w-[425px] max-w-full"
        />
        <div className="grid gap-x-12 gap-y-5 lg:grid-cols-3">
          <div className="space-y-5">
            <ActivityRow icon={FileText} tone="yellow" label="Tasks" value={n(act?.tasks)} />
            <ActivityRow icon={Handshake} tone="cyan" label="Meetings" value={n(act?.meetings)} />
            <ActivityRow icon={Home} tone="green" label="Site Visit Scheduled" value={n(act?.siteVisitScheduled)} />
            <ActivityRow icon={Home} tone="green" label="Site Visit Completed" value={n(act?.siteVisitCompleted)} faint />
          </div>
          <div className="space-y-5">
            <ActivityRow icon={Phone} tone="blue" label="Total Offline Calls" value={n(act?.offlineCalls)} />
            <ActivityRow icon={Users} tone="violet" label="Calls To Lead" value={n(act?.callsToLead)} />
            <ActivityRow icon={User} tone="blue" label="Calls To Contact" value={n(act?.callsToContact)} />
            <ActivityRow icon={CircleEllipsis} tone="grey" label="Calls To Channel Partner" value={n(act?.callsToChannelPartner)} />
          </div>
          <div className="space-y-5">
            <ActivityRow icon={Phone} tone="blue" label="Total IVR Calls" value={n(act?.ivrCalls)} />
            <ActivityRow icon={Users} tone="violet" label="Calls To Lead" value="0" />
            <ActivityRow icon={User} tone="blue" label="Calls To Contact" value="0" />
            <ActivityRow icon={CircleEllipsis} tone="grey" label="Calls To Channel Partner" value="0" />
          </div>
        </div>
      </BdCard>

      <TaskVisitPanel />

      <BdCard
        title="Executive Lead Analysis"
        actions={<TeamAgentSelects value={s4} onChange={setS4} />}
      >
        <ExecutiveTable scope={s4} />
      </BdCard>
    </BdPage>
  );
}

const TONE_BG: Record<string, string> = {
  yellow: "#fbefc8",
  cyan: "#d5f3f6",
  green: "#d6f5e3",
  blue: "#dbe8fd",
  violet: "#e4e0fb",
  grey: "#ececef",
};
const TONE_FG: Record<string, string> = {
  yellow: "#e9b72a",
  cyan: "#3ec1d3",
  green: "#37c47f",
  blue: "#3d7be8",
  violet: "#7a66e0",
  grey: "#9a9ca6",
};

function ActivityRow({
  icon: Icon,
  tone,
  label,
  value,
  faint,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  value: string;
  faint?: boolean;
}) {
  return (
    <div className="flex items-center gap-4">
      <span
        className="flex size-[50px] shrink-0 items-center justify-center rounded-[10px]"
        style={{ background: TONE_BG[tone], color: TONE_FG[tone], opacity: faint ? 0.7 : 1 }}
      >
        <Icon className="size-5" />
      </span>
      <span className="flex-1 text-[19px] text-[#2b2f3a]">{label}</span>
      <span className="text-[24px] text-[#2b2f3a]">{value}</span>
    </div>
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
  pending: { label: "To Do", color: "#e8602c" },
  upcoming: { label: "To Do", color: "#e8602c" },
  completed: { label: "Completed", color: "#2fa56b" },
  cancelled: { label: "Cancelled", color: "#8b90a0" },
  planned: { label: "Scheduled", color: "#e8602c" },
  confirmed: { label: "Confirmed", color: "#3a5dc2" },
  in_progress: { label: "In Progress", color: "#3a5dc2" },
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
    <div className="bd-card rounded-[3px]">
      <div className="border-b border-[#eef0f6] px-5 pt-4">
        <BdTabs
          tabs={[
            { key: "tasks", label: "Tasks" },
            { key: "visits", label: "Site Visit" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      <div className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-[16px] text-[#2b2f3a]">
            {tab === "tasks" ? "Task" : "Site Visit"} ({total})
          </h4>
          <BdSelect
            className="w-[200px]"
            value={range}
            onChange={setRange}
            clearable={false}
            placeholder="Today"
            options={RANGES}
          />
        </div>

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
                          <Link href={`/leads?open=${t.leadId._id}`} className="hover:text-[#3a5dc2] hover:underline">
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
                          <Link href={`/leads?open=${v.leadId._id}`} className="hover:text-[#3a5dc2] hover:underline">
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
    "flex cursor-pointer items-center rounded px-3 py-2 text-[13px] outline-none hover:bg-[#eef1fa]";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          aria-label="Actions"
          className="flex size-6 items-center justify-center rounded-[3px] bg-[#3a5dc2] text-white hover:bg-[#2f4ca0]"
        >
          <svg viewBox="0 0 10 6" className="size-2.5" fill="currentColor">
            <path d="M0 0h10L5 6z" />
          </svg>
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-44 rounded-md bg-white p-1 shadow-lg ring-1 ring-slate-900/10"
        >
          {leadId ? (
            <DropdownMenu.Item asChild>
              <Link href={`/leads?open=${leadId}`} className={item}>
                View Lead
              </Link>
            </DropdownMenu.Item>
          ) : null}
          {!done ? (
            <DropdownMenu.Item onSelect={onComplete} className={item}>
              Mark As Completed
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

