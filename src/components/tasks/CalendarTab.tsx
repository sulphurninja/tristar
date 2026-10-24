"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { BdBadge, BdButton, BdSelect, formatBdDate } from "@/components/bd";
import { BdModal } from "@/components/bd/BdOverlays";
import { ymd } from "@/components/bd/DateInputs";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { AddVisitModal } from "@/components/visits/AddVisitModal";
import { VisitActionModal, type VisitActionMode } from "@/components/visits/VisitActionModal";
import { cn } from "@/lib/utils";
import { AddTaskModal } from "./AddTaskModal";
import { TaskActionModal, type TaskActionMode } from "./TaskActionModal";
import { leadHref, toLocalInput, typeLabel, type TaskRow, type VisitRow } from "./shared";

type View = "month" | "week" | "day";

interface CalEvent {
  id: string;
  kind: "task" | "visit";
  at: Date;
  title: string;
  color: string;
  done: boolean;
  task?: TaskRow;
  visit?: VisitRow;
}

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
const timeOf = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

function rangeFor(view: View, cursor: Date): [Date, Date] {
  if (view === "day") return [startOfDay(cursor), startOfDay(cursor)];
  if (view === "week") {
    const s = addDays(startOfDay(cursor), -cursor.getDay());
    return [s, addDays(s, 6)];
  }
  const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  const s = addDays(first, -first.getDay());
  return [s, addDays(s, 41)];
}

function taskColor(t: TaskRow) {
  if (t.status === "completed") return "#2fa66a";
  if (t.status === "cancelled") return "#9a9ca6";
  return t.scheduleAt && new Date(t.scheduleAt) < new Date() ? "#e5484d" : "#3a5dc2";
}
function visitColor(v: VisitRow) {
  if (v.status === "done") return "#2fa66a";
  if (v.status === "cancelled") return "#9a9ca6";
  if (v.status === "no_show") return "#e5484d";
  return "#7a66e0";
}

export function CalendarTab() {
  const { users, teams } = useDirectory();
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState(() => startOfDay(new Date()));
  const [team, setTeam] = useState("");
  const [agent, setAgent] = useState("");
  const [showTasks, setShowTasks] = useState(true);
  const [showVisits, setShowVisits] = useState(true);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [visits, setVisits] = useState<VisitRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [detail, setDetail] = useState<CalEvent | null>(null);
  const [pickDay, setPickDay] = useState<Date | null>(null);
  const [addTask, setAddTask] = useState<Date | null>(null);
  const [addVisit, setAddVisit] = useState<Date | null>(null);
  const [taskAction, setTaskAction] = useState<{ mode: TaskActionMode; tasks: TaskRow[] } | null>(null);
  const [visitAction, setVisitAction] = useState<{ mode: VisitActionMode; visits: VisitRow[] } | null>(null);

  const [from, to] = useMemo(() => rangeFor(view, cursor), [view, cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ range: "custom", from: ymd(from), to: ymd(to), limit: "2000", sort: "schedule", dir: "asc" });
    if (team) p.set("team", team);
    if (agent) p.set("agent", agent);
    try {
      const [t, v] = await Promise.all([
        fetch(`/api/tasks?${p}`, { cache: "no-store" }).then((r) => r.json()),
        fetch(`/api/visits?${p}`, { cache: "no-store" }).then((r) => r.json()),
      ]);
      setTasks(t.tasks ?? []);
      setVisits(v.visits ?? []);
    } catch {
      toast.error("Could not load the calendar.");
    } finally {
      setLoading(false);
    }
  }, [from, to, team, agent]);

  useEffect(() => {
    load();
  }, [load]);

  const events = useMemo<CalEvent[]>(() => {
    const list: CalEvent[] = [];
    if (showTasks) {
      for (const t of tasks) {
        if (!t.scheduleAt) continue;
        list.push({
          id: `t${t._id}`,
          kind: "task",
          at: new Date(t.scheduleAt),
          title: t.title,
          color: taskColor(t),
          done: t.status === "completed",
          task: t,
        });
      }
    }
    if (showVisits) {
      for (const v of visits) {
        list.push({
          id: `v${v._id}`,
          kind: "visit",
          at: new Date(v.scheduledAt),
          title: `Site Visit - ${v.leadId?.contact?.name ?? "Lead"}`,
          color: visitColor(v),
          done: v.status === "done",
          visit: v,
        });
      }
    }
    return list.sort((a, b) => a.at.getTime() - b.at.getTime());
  }, [tasks, visits, showTasks, showVisits]);

  const forDay = (d: Date) => events.filter((e) => sameDay(e.at, d));

  const step = (dir: -1 | 1) =>
    setCursor((c) =>
      view === "month"
        ? new Date(c.getFullYear(), c.getMonth() + dir, 1)
        : addDays(c, dir * (view === "week" ? 7 : 1)),
    );

  const title =
    view === "month"
      ? cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : view === "week"
        ? `${from.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${to.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
        : cursor.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const days = useMemo(() => {
    const n = view === "month" ? 42 : view === "week" ? 7 : 1;
    return Array.from({ length: n }, (_, i) => addDays(from, i));
  }, [from, view]);

  const dayAt = (d: Date) => {
    const x = new Date(d);
    const now = new Date();
    x.setHours(sameDay(d, now) ? now.getHours() + 1 : 10, 0, 0, 0);
    return toLocalInput(x);
  };

  const chip = (e: CalEvent) => (
    <button
      key={e.id}
      type="button"
      onClick={(ev) => {
        ev.stopPropagation();
        setDetail(e);
      }}
      title={`${timeOf(e.at)} ${e.title}`}
      className={cn("flex w-full items-center gap-1 truncate rounded-[3px] px-1.5 py-[2px] text-left text-[11.5px] text-white", e.done && "opacity-70 line-through")}
      style={{ background: e.color }}
    >
      <span className="shrink-0 font-medium">{timeOf(e.at)}</span>
      <span className="truncate">{e.title}</span>
    </button>
  );

  return (
    <div className="space-y-4">
      <section className="bd-card flex flex-wrap items-center justify-between gap-3 rounded-[3px] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <BdButton variant="light" onClick={() => step(-1)} aria-label="Previous">
            <ChevronLeft className="size-4" />
          </BdButton>
          <BdButton variant="light" onClick={() => setCursor(startOfDay(new Date()))}>
            Today
          </BdButton>
          <BdButton variant="light" onClick={() => step(1)} aria-label="Next">
            <ChevronRight className="size-4" />
          </BdButton>
          <h3 className="ml-2 text-[17px] font-medium text-[#2b2f3a]">{title}</h3>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <BdSelect className="w-[180px]" placeholder="Select Team" value={team} onChange={(v) => { setTeam(v); setAgent(""); }} options={teams.map((t) => ({ value: t._id, label: t.name }))} />
          <BdSelect
            className="w-[200px]"
            placeholder="Select Sales Agent"
            value={agent}
            onChange={setAgent}
            options={users
              .filter((u) => u.status !== "suspended" && (!team || String(u.teamId ?? "") === team))
              .map((u) => ({ value: u._id, label: u.name }))}
          />
          <div className="inline-flex">
            {(["month", "week", "day"] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "border border-[#3a5dc2] px-3 py-[7px] text-[13px] capitalize first:rounded-l-[3px] last:rounded-r-[3px] -ml-px first:ml-0",
                  view === v ? "bg-[#3a5dc2] text-white" : "bg-white text-[#3a5dc2] hover:bg-[#eef1fa]",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center gap-4 text-[12.5px] text-[#5a6072]">
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={showTasks} onChange={(e) => setShowTasks(e.target.checked)} className="accent-[#3a5dc2]" />
            Tasks
          </label>
          <label className="flex items-center gap-1.5">
            <input type="checkbox" checked={showVisits} onChange={(e) => setShowVisits(e.target.checked)} className="accent-[#7a66e0]" />
            Site Visits
          </label>
          {[
            ["#3a5dc2", "Pending task"],
            ["#e5484d", "Overdue / No show"],
            ["#7a66e0", "Site visit"],
            ["#2fa66a", "Completed"],
            ["#9a9ca6", "Cancelled"],
          ].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: c }} />
              {l}
            </span>
          ))}
          {loading ? <span className="text-[#8b90a0]">Loading…</span> : null}
        </div>
      </section>

      <section className="bd-card overflow-hidden rounded-[3px]">
        {view === "month" ? (
          <div>
            <div className="grid grid-cols-7 border-b border-[#eef0f6] bg-[#f7f8fc]">
              {DOW.map((d) => (
                <div key={d} className="px-2 py-2 text-center text-[12px] font-bold uppercase text-[#2b2f3a]">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {days.map((d) => {
                const evs = forDay(d);
                const inMonth = d.getMonth() === cursor.getMonth();
                return (
                  <div
                    key={d.toISOString()}
                    role="button"
                    tabIndex={0}
                    onClick={() => setPickDay(d)}
                    onKeyDown={(e) => e.key === "Enter" && setPickDay(d)}
                    className={cn("min-h-[112px] cursor-pointer space-y-1 border-b border-r border-[#eef0f6] p-1.5 hover:bg-[#f6f8fd]", !inMonth && "bg-[#fafbfd]")}
                  >
                    <div className="flex justify-end">
                      <span
                        className={cn(
                          "flex size-6 items-center justify-center rounded-full text-[12px]",
                          sameDay(d, new Date()) ? "bg-[#3a5dc2] font-medium text-white" : inMonth ? "text-[#2b2f3a]" : "text-[#b0b5c5]",
                        )}
                      >
                        {d.getDate()}
                      </span>
                    </div>
                    {evs.slice(0, 3).map(chip)}
                    {evs.length > 3 ? (
                      <button
                        type="button"
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setCursor(d);
                          setView("day");
                        }}
                        className="px-1 text-[11.5px] text-[#3a5dc2] hover:underline"
                      >
                        +{evs.length - 3} more
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className={cn("grid", view === "week" ? "md:grid-cols-7" : "grid-cols-1")}>
            {days.map((d) => {
              const evs = forDay(d);
              return (
                <div key={d.toISOString()} className="min-h-[300px] border-b border-r border-[#eef0f6]">
                  <button
                    type="button"
                    onClick={() => setPickDay(d)}
                    className={cn(
                      "flex w-full items-center justify-between border-b border-[#eef0f6] bg-[#f7f8fc] px-3 py-2 text-left text-[13px] font-medium hover:bg-[#eef1fa]",
                      sameDay(d, new Date()) && "bg-[#e9edf8] text-[#3a5dc2]",
                    )}
                  >
                    <span>{d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}</span>
                    <span className="text-[11px] font-normal text-[#8b90a0]">+ Add</span>
                  </button>
                  <div className="space-y-1.5 p-2">
                    {evs.length === 0 ? <p className="py-6 text-center text-[12px] text-[#b0b5c5]">No events</p> : null}
                    {evs.map((e) => (
                      <div key={e.id}>{chip(e)}</div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* day click: choose what to add */}
      <BdModal open={!!pickDay} onClose={() => setPickDay(null)} title={pickDay ? pickDay.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" }) : ""} width={420}>
        {pickDay ? (
          <div className="space-y-3">
            <p className="text-[13px] text-[#5a6072]">{forDay(pickDay).length} event(s) on this day. Add something new?</p>
            <div className="flex gap-3">
              <BdButton onClick={() => { setAddTask(pickDay); setPickDay(null); }}>Add Task</BdButton>
              <BdButton onClick={() => { setAddVisit(pickDay); setPickDay(null); }}>Add Site Visit</BdButton>
              <BdButton variant="light" onClick={() => { setCursor(pickDay); setView("day"); setPickDay(null); }}>
                Open Day
              </BdButton>
            </div>
          </div>
        ) : null}
      </BdModal>

      {/* event detail */}
      <BdModal
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail?.kind === "task" ? "Task Details" : "Site Visit Details"}
        width={500}
        footer={
          detail ? (
            <>
              {!detail.done ? (
                <BdButton
                  onClick={() => {
                    if (detail.task) setTaskAction({ mode: "complete", tasks: [detail.task] });
                    if (detail.visit) setVisitAction({ mode: "complete", visits: [detail.visit] });
                    setDetail(null);
                  }}
                >
                  Mark {detail.kind === "task" ? "As " : ""}Completed
                </BdButton>
              ) : null}
              {(detail.task?.leadId ?? detail.visit?.leadId) ? (
                <Link href={leadHref((detail.task?.leadId ?? detail.visit?.leadId)?._id)} className="bd-btn-light inline-flex items-center">
                  View Lead
                </Link>
              ) : null}
              <BdButton variant="light" onClick={() => setDetail(null)}>
                Close
              </BdButton>
            </>
          ) : null
        }
      >
        {detail ? (
          <dl className="grid grid-cols-[120px_1fr] gap-y-2.5 text-[13px]">
            <dt className="font-bold">Title</dt>
            <dd>{detail.task?.title ?? `SITE VISIT with ${(detail.visit?.leadId?.contact?.name ?? "").toUpperCase()}`}</dd>
            <dt className="font-bold">Lead</dt>
            <dd>{(detail.task?.leadId ?? detail.visit?.leadId)?.contact?.name ?? "-"}</dd>
            <dt className="font-bold">When</dt>
            <dd>{formatBdDate(detail.at)}</dd>
            {detail.task ? (
              <>
                <dt className="font-bold">Activity</dt>
                <dd>{typeLabel(detail.task.type)}</dd>
              </>
            ) : (
              <>
                <dt className="font-bold">Project</dt>
                <dd>{detail.visit?.projectId?.name ?? "-"}</dd>
              </>
            )}
            <dt className="font-bold">Assigned To</dt>
            <dd>{(detail.task?.assignedTo ?? detail.visit?.assignedTo)?.name ?? "-"}</dd>
            <dt className="font-bold">Status</dt>
            <dd>
              <BdBadge color={detail.color}>{(detail.task?.status ?? detail.visit?.status ?? "").replace("_", " ")}</BdBadge>
            </dd>
            <dt className="font-bold">Remark</dt>
            <dd>{(detail.task?.remark ?? detail.visit?.remark) || "-"}</dd>
          </dl>
        ) : null}
      </BdModal>

      <AddTaskModal open={!!addTask} onClose={() => setAddTask(null)} onCreated={load} initial={{ scheduleAt: addTask ? dayAt(addTask) : undefined }} />
      <AddVisitModal open={!!addVisit} onClose={() => setAddVisit(null)} onCreated={load} initial={{ scheduledAt: addVisit ? dayAt(addVisit) : undefined }} />
      <TaskActionModal mode={taskAction?.mode ?? null} tasks={taskAction?.tasks ?? []} onClose={() => setTaskAction(null)} onDone={load} />
      <VisitActionModal mode={visitAction?.mode ?? null} visits={visitAction?.visits ?? []} onClose={() => setVisitAction(null)} onDone={load} />
    </div>
  );
}
