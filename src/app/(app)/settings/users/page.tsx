"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  ArrowUpRight,
  Ban,
  CheckCircle2,
  Copy,
  Download,
  MoreHorizontal,
  Palmtree,
  Pencil,
  Plus,
  RotateCcw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  Users as UsersIcon,
} from "lucide-react";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BdBadge,
  BdButton,
  BdCard,
  BdEmptyRow,
  BdField,
  BdInput,
  BdKpi,
  BdPage,
  BdPageHeader,
  BdSelect,
  BdTable,
  BdTableToolbar,
  BdTabs,
  BdTd,
  BdTh,
} from "@/components/bd";
import { DateField } from "@/components/ui/date-field";
import { UserAccessSheet, type AccessUser, type RoleInfo } from "@/components/access/UserAccessSheet";
import { DistributionPanel } from "@/components/users/DistributionPanel";
import { ROLE_LABELS, outranks, type Role } from "@/lib/roles";
import { downloadCsv } from "@/lib/csv";
import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface UserItem extends AccessUser {
  username?: string;
  phone?: string;
  title?: string;
  region?: string;
  teamId?: string | null;
  status: "active" | "invited" | "suspended" | "deleted";
  onHoliday?: boolean;
  holidayUntil?: string;
  inactiveAt?: string;
  deletedAt?: string;
  lastLoginAt?: string;
  createdAt?: string;
}
interface TeamItem {
  _id: string;
  name: string;
}

type Tab = "users" | "distribution" | "deleted";
type StatusFilter = "all" | "active" | "inactive" | "holiday";

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

const fmtDate = (d?: string, time = false) =>
  d
    ? new Date(d).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        ...(time ? { hour: "numeric", minute: "2-digit" } : {}),
      })
    : "—";

function lastSeen(d?: string) {
  if (!d) return "Never";
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "Just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const days = Math.round(h / 24);
  return days < 30 ? `${days}d ago` : fmtDate(d);
}

const isHoliday = (u: UserItem) => !!u.onHoliday && (!u.holidayUntil || new Date(u.holidayUntil) >= new Date());

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json" } });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || "Something went wrong");
  return d;
}

export default function UsersPage() {
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [deleted, setDeleted] = useState<UserItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [access, setAccess] = useState<UserItem | null>(null);
  const [holiday, setHoliday] = useState<UserItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [teamFilter, setTeamFilter] = useState("");
  const [designation, setDesignation] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const { user: me, isOwner } = useAuth();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api("/api/users"),
      api("/api/users?deleted=1"),
      api("/api/teams"),
      fetch("/api/roles", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { roles: [] })),
      api("/api/masters?type=regions").catch(() => ({ items: [] })),
    ])
      .then(([u, d, t, r, m]) => {
        setUsers(u.users ?? []);
        setDeleted(d.users ?? []);
        setTeams(t.teams ?? []);
        setRoles(r.roles ?? []);
        setRegions((m.items ?? []).map((i: { name: string }) => i.name));
      })
      .catch(() => toast.error("Couldn't load users"))
      .finally(() => setLoading(false));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const teamName = useMemo(() => new Map(teams.map((t) => [t._id, t.name])), [teams]);
  const designations = useMemo(() => [...new Set(users.map((u) => u.title).filter(Boolean) as string[])].sort(), [users]);

  const counts = useMemo(
    () => ({
      total: users.length,
      active: users.filter((u) => u.status === "active" || u.status === "invited").length,
      inactive: users.filter((u) => u.status === "suspended").length,
      holiday: users.filter(isHoliday).length,
    }),
    [users],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      if (status === "active" && u.status === "suspended") return false;
      if (status === "inactive" && u.status !== "suspended") return false;
      if (status === "holiday" && !isHoliday(u)) return false;
      if (teamFilter && String(u.teamId ?? "") !== teamFilter) return false;
      if (designation && u.title !== designation) return false;
      if (roleFilter && u.role !== roleFilter) return false;
      if (!q) return true;
      return [u.name, u.email, u.username, u.phone, u.title, u.region, ROLE_LABELS[u.role as Role], teamName.get(String(u.teamId ?? ""))]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
  }, [users, search, status, teamFilter, designation, roleFilter, teamName]);

  useEffect(() => setPage(1), [search, pageSize, status, teamFilter, designation, roleFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);
  const filtersOn = !!(teamFilter || designation || roleFilter || status !== "all");

  const patch = async (u: UserItem, body: Record<string, unknown>, msg: string) => {
    try {
      await api(`/api/users/${u._id}`, { method: "PATCH", body: JSON.stringify(body) });
      toast.success(msg);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't update user");
    }
  };
  const suspend = (u: UserItem) => {
    if (!confirm(`Make ${u.name} inactive? They'll be signed out and can't log in until reactivated.`)) return;
    patch(u, { status: "suspended" }, `${u.name} is now inactive`);
  };
  const remove = async (u: UserItem) => {
    if (!confirm(`Delete ${u.name}? Their leads and history stay; you can restore them from “Deleted users”.`)) return;
    try {
      await api(`/api/users/${u._id}`, { method: "DELETE" });
      toast.success(`${u.name} deleted`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete");
    }
  };
  const copy = (text: string) => {
    navigator.clipboard?.writeText(text).then(() => toast.success(`Copied “${text}”`));
  };

  const exportCsv = () =>
    downloadCsv("users", [
      ["Name", "Username", "Email", "Phone", "Role", "Designation", "Region", "Team", "Status", "On holiday", "Last login", "Created"],
      ...filtered.map((u) => [
        u.name,
        u.username ?? "",
        u.email,
        u.phone ?? "",
        ROLE_LABELS[u.role as Role] ?? u.role,
        u.title ?? "",
        u.region ?? "",
        teamName.get(String(u.teamId ?? "")) ?? "",
        u.status,
        isHoliday(u) ? "Yes" : "No",
        u.lastLoginAt ? fmtDate(u.lastLoginAt, true) : "",
        u.createdAt ? fmtDate(u.createdAt, true) : "",
      ]),
    ]);

  return (
    <BdPage>
      <BdPageHeader
        eyebrow="Settings"
        title="Users"
        description="Everyone who uses the CRM: their login, role, team and availability."
        actions={
          tab === "users" ? (
            <>
              <BdButton variant="light" onClick={exportCsv}>
                <Download className="size-4" /> Export
              </BdButton>
              <BdButton onClick={() => setNewOpen(true)}>
                <Plus className="size-4" /> Add user
              </BdButton>
            </>
          ) : null
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <BdTabs<Tab>
          tabs={[
            { key: "users", label: "Users" },
            { key: "distribution", label: "Distribution" },
            { key: "deleted", label: `Deleted users${deleted.length ? ` · ${deleted.length}` : ""}` },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Link href="/settings/teams" className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground hover:text-primary">
          Teams <ArrowUpRight className="size-3.5" />
        </Link>
      </div>

      {tab === "users" ? (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <BdKpi label="Total users" value={counts.total} icon={UsersIcon} tone="blue" onClick={() => setStatus("all")} active={status === "all"} />
            <BdKpi label="Active" value={counts.active} icon={UserCheck} tone="green" onClick={() => setStatus("active")} active={status === "active"} />
            <BdKpi label="Inactive" value={counts.inactive} icon={UserX} tone="red" onClick={() => setStatus("inactive")} active={status === "inactive"} />
            <BdKpi label="On holiday" value={counts.holiday} icon={Palmtree} tone="cyan" onClick={() => setStatus("holiday")} active={status === "holiday"} hint="Skipped by lead distribution" />
          </div>

          <BdCard>
            <div className="mb-3.5 flex flex-wrap items-center gap-2">
              <BdSelect placeholder="All teams" value={teamFilter} onChange={setTeamFilter} options={teams.map((t) => ({ value: t._id, label: t.name }))} className="w-full sm:w-48" />
              <BdSelect placeholder="All designations" value={designation} onChange={setDesignation} options={designations.map((d) => ({ value: d, label: d }))} className="w-full sm:w-48" />
              <BdSelect placeholder="All roles" value={roleFilter} onChange={setRoleFilter} options={ROLE_OPTIONS} className="w-full sm:w-48" />
              {filtersOn ? (
                <button
                  type="button"
                  onClick={() => {
                    setTeamFilter("");
                    setDesignation("");
                    setRoleFilter("");
                    setStatus("all");
                  }}
                  className="text-[12.5px] font-medium text-primary hover:underline"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
            <BdTableToolbar
              page={page}
              totalPages={totalPages}
              onPage={setPage}
              search={search}
              onSearch={setSearch}
              pageSize={pageSize}
              onPageSize={setPageSize}
            />
            <BdTable minWidth={1120}>
              <thead>
                <tr>
                  <BdTh>User</BdTh>
                  <BdTh>Username</BdTh>
                  <BdTh>Contact</BdTh>
                  <BdTh>Role & designation</BdTh>
                  <BdTh>Team · Region</BdTh>
                  <BdTh>Last login</BdTh>
                  <BdTh>Status</BdTh>
                  <BdTh>Created</BdTh>
                  <BdTh className="text-right">
                    <span className="sr-only">Actions</span>
                  </BdTh>
                </tr>
              </thead>
              <tbody>
                {paged.length === 0 ? (
                  <BdEmptyRow colSpan={9} loading={loading} />
                ) : (
                  paged.map((u) => {
                    const canEdit = isOwner || !outranks(u.role, me?.role ?? "viewer");
                    const overrides = (u.permissionOverrides?.allow?.length ?? 0) + (u.permissionOverrides?.deny?.length ?? 0);
                    const off = u.status === "suspended";
                    return (
                      <tr key={u._id} className={cn(off && "opacity-60")}>
                        <BdTd>
                          <div className="flex items-center gap-3">
                            <span className="relative flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[11.5px] font-semibold text-primary-700 ring-1 ring-primary/10">
                              {initials(u.name)}
                              {isHoliday(u) ? (
                                <span className="absolute -bottom-0.5 -right-0.5 flex size-4 items-center justify-center rounded-full bg-white ring-1 ring-border" title="On holiday">
                                  <Palmtree className="size-2.5 text-[hsl(188_64%_32%)]" />
                                </span>
                              ) : null}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-medium">
                                {u.name}
                                {u._id === me?.id ? <span className="ml-1.5 text-[11.5px] font-normal text-muted-foreground">(you)</span> : null}
                              </p>
                            </div>
                          </div>
                        </BdTd>
                        <BdTd>
                          {u.username ? (
                            <button
                              type="button"
                              onClick={() => copy(u.username!)}
                              title="Copy username"
                              className="group inline-flex items-center gap-1.5 rounded-md px-1.5 py-0.5 font-mono text-[12.5px] text-primary-700 hover:bg-primary-50"
                            >
                              {u.username}
                              <Copy className="size-3 text-muted-foreground group-hover:text-primary" />
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </BdTd>
                        <BdTd>
                          <p className="truncate text-[12.5px]">{u.email}</p>
                          <p className="text-[12px] text-muted-foreground">{u.phone || "—"}</p>
                        </BdTd>
                        <BdTd>
                          <div className="flex items-center gap-1.5">
                            <span className={cn(u.role === "owner" && "font-medium text-primary-700")}>{ROLE_LABELS[u.role as Role] ?? u.role}</span>
                            {overrides > 0 ? (
                              <span title={`${overrides} permission override${overrides === 1 ? "" : "s"}`} className="rounded-full bg-violet-50 px-1.5 py-px text-[10.5px] font-medium text-violet-700 ring-1 ring-violet-200/70">
                                +{overrides}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-[12px] text-muted-foreground">{u.title || "—"}</p>
                        </BdTd>
                        <BdTd>
                          <p>{teamName.get(String(u.teamId ?? "")) ?? <span className="text-muted-foreground">No team</span>}</p>
                          <p className="text-[12px] text-muted-foreground">{u.region || "—"}</p>
                        </BdTd>
                        <BdTd className="text-[12.5px] text-muted-foreground" >
                          <span title={u.lastLoginAt ? fmtDate(u.lastLoginAt, true) : undefined}>{lastSeen(u.lastLoginAt)}</span>
                        </BdTd>
                        <BdTd>
                          {off ? (
                            <div>
                              <BdBadge color="hsl(var(--destructive))">
                                <span className="size-1.5 rounded-full bg-current" /> Inactive
                              </BdBadge>
                              <p className="mt-0.5 text-[11px] text-muted-foreground">since {fmtDate(u.inactiveAt)}</p>
                            </div>
                          ) : isHoliday(u) ? (
                            <div>
                              <BdBadge color="hsl(188 64% 36%)">
                                <Palmtree className="size-3" /> On holiday
                              </BdBadge>
                              {u.holidayUntil ? <p className="mt-0.5 text-[11px] text-muted-foreground">until {fmtDate(u.holidayUntil)}</p> : null}
                            </div>
                          ) : (
                            <BdBadge color={u.status === "invited" ? "hsl(var(--info))" : "hsl(var(--success))"} className="capitalize">
                              <span className="size-1.5 rounded-full bg-current" /> {u.status}
                            </BdBadge>
                          )}
                        </BdTd>
                        <BdTd className="text-[12.5px] text-muted-foreground">{fmtDate(u.createdAt)}</BdTd>
                        <BdTd className="text-right">
                          <RowMenu
                            disabled={!canEdit}
                            items={[
                              { label: "Edit details", icon: Pencil, onSelect: () => setEditing(u) },
                              isOwner ? { label: "Access & permissions", icon: ShieldCheck, onSelect: () => setAccess(u) } : null,
                              isHoliday(u)
                                ? { label: "Back from holiday", icon: Palmtree, onSelect: () => patch(u, { onHoliday: false }, `${u.name} is back`) }
                                : { label: "Mark on holiday", icon: Palmtree, onSelect: () => setHoliday(u) },
                              off
                                ? { label: "Reactivate", icon: CheckCircle2, onSelect: () => patch(u, { status: "active" }, `${u.name} reactivated`) }
                                : u._id !== me?.id
                                  ? { label: "Make inactive", icon: Ban, onSelect: () => suspend(u) }
                                  : null,
                              u._id !== me?.id ? { label: "Delete user", icon: Trash2, danger: true, onSelect: () => remove(u) } : null,
                            ]}
                          />
                        </BdTd>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </BdTable>
            <p className="pt-3 text-[12px] tabular-nums text-muted-foreground">
              {filtered.length === 0
                ? "No users match"
                : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, filtered.length)} of ${filtered.length}`}
            </p>
          </BdCard>
        </>
      ) : tab === "distribution" ? (
        <DistributionPanel users={users} />
      ) : (
        <BdCard title="Deleted users" description="Deleted people can't sign in and don't appear in pickers. Their leads and history are kept.">
          <BdTable minWidth={760}>
            <thead>
              <tr>
                <BdTh>User</BdTh>
                <BdTh>Username</BdTh>
                <BdTh>Role</BdTh>
                <BdTh>Deleted on</BdTh>
                <BdTh className="text-right">
                  <span className="sr-only">Actions</span>
                </BdTh>
              </tr>
            </thead>
            <tbody>
              {deleted.length === 0 ? (
                <BdEmptyRow colSpan={5} loading={loading} />
              ) : (
                deleted.map((u) => (
                  <tr key={u._id}>
                    <BdTd>
                      <p className="font-medium">{u.name}</p>
                      <p className="text-[12px] text-muted-foreground">{u.email}</p>
                    </BdTd>
                    <BdTd className="font-mono text-[12.5px]">{u.username ?? "—"}</BdTd>
                    <BdTd>{ROLE_LABELS[u.role as Role] ?? u.role}</BdTd>
                    <BdTd className="text-[12.5px] text-muted-foreground">{fmtDate(u.deletedAt, true)}</BdTd>
                    <BdTd className="text-right">
                      <BdButton variant="light" onClick={() => patch(u, { status: "active" }, `${u.name} restored`)}>
                        <RotateCcw className="size-3.5" /> Restore
                      </BdButton>
                    </BdTd>
                  </tr>
                ))
              )}
            </tbody>
          </BdTable>
        </BdCard>
      )}

      <UserDialog open={newOpen} user={null} teams={teams} regions={regions} myRole={me?.role ?? "viewer"} onOpenChange={setNewOpen} onSaved={load} />
      <UserDialog open={!!editing} user={editing} teams={teams} regions={regions} myRole={me?.role ?? "viewer"} onOpenChange={() => setEditing(null)} onSaved={load} />
      <HolidayDialog user={holiday} onClose={() => setHoliday(null)} onSave={(until) => holiday && patch(holiday, { onHoliday: true, holidayUntil: until || undefined }, `${holiday.name} marked on holiday`)} />
      {isOwner ? (
        <UserAccessSheet user={access} roles={roles} meId={me?.id} onOpenChange={(o) => !o && setAccess(null)} onSaved={load} />
      ) : null}
    </BdPage>
  );
}

function RowMenu({
  items,
  disabled,
}: {
  items: Array<{ label: string; icon: typeof Pencil; onSelect: () => void; danger?: boolean } | null>;
  disabled?: boolean;
}) {
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild disabled={disabled}>
        <button
          type="button"
          aria-label="User actions"
          className="inline-flex size-8 items-center justify-center rounded-[8px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-30"
        >
          <MoreHorizontal className="size-4" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={4} className="z-50 min-w-52 rounded-xl border border-border bg-white p-1.5 shadow-[var(--shadow-lg)]">
          {items.filter(Boolean).map((i) => {
            const it = i!;
            return (
              <DropdownMenu.Item
                key={it.label}
                onSelect={it.onSelect}
                className={cn(
                  "flex cursor-pointer items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13px] outline-none data-[highlighted]:bg-muted",
                  it.danger && "text-destructive data-[highlighted]:bg-destructive/10",
                )}
              >
                <it.icon className={cn("size-4", it.danger ? "" : "text-muted-foreground")} />
                {it.label}
              </DropdownMenu.Item>
            );
          })}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function HolidayDialog({ user, onClose, onSave }: { user: UserItem | null; onClose: () => void; onSave: (until: string) => void }) {
  const [until, setUntil] = useState("");
  useEffect(() => setUntil(""), [user]);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Dialog open={!!user} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark {user?.name} on holiday</DialogTitle>
          <DialogDescription>They keep their access, but lead distribution skips them while they&apos;re away.</DialogDescription>
        </DialogHeader>
        <DialogBody>
          <BdField label="Back on" hint="Leave empty if you're not sure — you can switch it off any time.">
            <DateField value={until} onChange={setUntil} min={today} clearable placeholder="Until further notice" />
          </BdField>
        </DialogBody>
        <DialogFooter>
          <BdButton variant="light" onClick={onClose}>
            Cancel
          </BdButton>
          <BdButton
            onClick={() => {
              onSave(until);
              onClose();
            }}
          >
            Mark on holiday
          </BdButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserDialog({
  open,
  user,
  teams,
  regions,
  myRole,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  user: UserItem | null;
  teams: TeamItem[];
  regions: string[];
  myRole: string;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const blank = { name: "", username: "", email: "", phone: "", title: "", region: "", role: "sales_executive", teamId: "", password: "" };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [touchedUsername, setTouchedUsername] = useState(false);
  const editing = !!user;

  useEffect(() => {
    if (!open) return;
    setTouchedUsername(!!user);
    setForm(
      user
        ? {
            name: user.name,
            username: user.username ?? "",
            email: user.email,
            phone: user.phone ?? "",
            title: user.title ?? "",
            region: user.region ?? "",
            role: user.role,
            teamId: String(user.teamId ?? ""),
            password: "",
          }
        : blank,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const set = (k: keyof typeof blank) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  /* Suggest a username from the first name until the admin types their own. */
  const onName = (v: string) =>
    setForm((f) => ({
      ...f,
      name: v,
      username: touchedUsername ? f.username : (v.trim().split(/\s+/)[0] ?? "").toLowerCase().replace(/[^a-z0-9._-]/g, ""),
    }));

  const roleOptions = ROLE_OPTIONS.filter(
    (o) => o.value === form.role || (!outranks(o.value, myRole) && (o.value !== "owner" || myRole === "owner")),
  );
  const regionOptions = [...new Set([...regions, ...(form.region ? [form.region] : [])])].map((r) => ({ value: r, label: r }));

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Name is required.");
    if (form.username && !/^[a-z0-9][a-z0-9._-]{2,29}$/.test(form.username))
      return toast.error("Username: 3–30 lowercase letters, numbers, dots, dashes or underscores.");
    if (!editing && (!form.email.trim() || form.password.length < 8)) return toast.error("Email and an 8+ character password are required.");
    if (editing && form.password && form.password.length < 8) return toast.error("Password must be 8+ characters.");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        phone: form.phone,
        title: form.title,
        region: form.region,
        teamId: form.teamId || null,
      };
      if (form.username) payload.username = form.username;
      if (!editing || form.role !== user!.role) payload.role = form.role;
      if (!editing) payload.email = form.email;
      if (form.password) payload.password = form.password;
      await api(editing ? `/api/users/${user!._id}` : "/api/users", { method: editing ? "PATCH" : "POST", body: JSON.stringify(payload) });
      toast.success(editing ? "User updated" : "User created");
      onSaved();
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save user.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit user" : "Add a user"}</DialogTitle>
          <DialogDescription>
            {editing ? "Update their details, login, role and team." : "They can sign in straight away with their email or username."}
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="max-h-[70vh] space-y-4 overflow-y-auto">
          <div className="grid gap-3 sm:grid-cols-2">
            <BdField label="Full name">
              <BdInput autoFocus value={form.name} onChange={(e) => onName(e.target.value)} placeholder="e.g. Akanksha Padole" />
            </BdField>
            <BdField label="Username" hint="Used to sign in and in lead imports.">
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] text-muted-foreground">@</span>
                <BdInput
                  value={form.username}
                  onChange={(e) => {
                    setTouchedUsername(true);
                    set("username")(e.target.value.toLowerCase().replace(/\s/g, ""));
                  }}
                  placeholder="akanksha"
                  className="!pl-7 font-mono"
                />
              </div>
            </BdField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <BdField label="Email">
              <BdInput type="email" disabled={editing} value={form.email} onChange={(e) => set("email")(e.target.value)} placeholder="name@company.com" />
            </BdField>
            <BdField label="Mobile">
              <BdInput inputMode="tel" value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="+91" />
            </BdField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <BdField label="Role" hint="Sets their default permissions.">
              <BdSelect clearable={false} value={form.role} onChange={set("role")} options={roleOptions} />
            </BdField>
            <BdField label="Designation">
              <BdInput value={form.title} onChange={(e) => set("title")(e.target.value)} placeholder="e.g. Sales, IVR Telecaller" />
            </BdField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <BdField label="Team">
              <BdSelect placeholder="No team" value={form.teamId} onChange={set("teamId")} options={teams.map((t) => ({ value: t._id, label: t.name }))} />
            </BdField>
            <BdField label="Region" hint={regions.length ? undefined : "Add regions in Settings → Masters."}>
              <BdSelect placeholder="No region" value={form.region} onChange={set("region")} options={regionOptions} />
            </BdField>
          </div>
          <BdField label={editing ? "New password" : "Password"} hint={editing ? "Leave blank to keep the current one." : undefined}>
            <BdInput type="text" value={form.password} onChange={(e) => set("password")(e.target.value)} placeholder="At least 8 characters" />
          </BdField>
        </DialogBody>
        <DialogFooter>
          <BdButton variant="light" onClick={() => onOpenChange(false)}>
            Cancel
          </BdButton>
          <BdButton onClick={submit} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save changes" : "Create user"}
          </BdButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
