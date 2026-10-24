"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, Pencil, Plus, Ban, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  BdBadge,
  BdButton,
  BdCard,
  BdEmptyRow,
  BdField,
  BdInput,
  BdPage,
  BdSelect,
  BdTable,
  BdTableToolbar,
  BdTd,
  BdTh,
} from "@/components/bd";
import { ROLE_LABELS } from "@/lib/roles";
import { downloadCsv } from "@/lib/csv";
import { useAuth } from "@/contexts/AuthContext";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  role: string;
  teamId?: string | null;
  status: "active" | "invited" | "suspended";
  lastLoginAt?: string;
}
interface TeamItem {
  _id: string;
  name: string;
}

const ROLE_OPTIONS = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));
const STATUS_COLOR = { active: "#37b24d", invited: "#3d7be8", suspended: "#e5484d" } as const;

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [teams, setTeams] = useState<TeamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const { user: me } = useAuth();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/users", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/teams", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([u, t]) => {
        setUsers(u.users ?? []);
        setTeams(t.teams ?? []);
      })
      .catch(() => toast.error("Couldn't load users"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const teamName = useMemo(() => new Map(teams.map((t) => [t._id, t.name])), [teams]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      [u.name, u.email, u.phone, u.title, ROLE_LABELS[u.role as keyof typeof ROLE_LABELS], teamName.get(String(u.teamId ?? ""))]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q)),
    );
  }, [users, search, teamName]);

  useEffect(() => setPage(1), [search, pageSize]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const setStatus = async (u: UserItem, status: "active" | "suspended") => {
    if (u._id === me?.id) return toast.error("You can't suspend your own account.");
    if (status === "suspended" && !confirm(`Suspend ${u.name}? They'll lose access immediately.`)) return;
    const res = await fetch(`/api/users/${u._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      toast.success(status === "active" ? "User activated" : "User suspended");
      load();
    } else toast.error(d.error || "Couldn't update user");
  };

  return (
    <BdPage>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[20px] font-semibold text-[#2b2f3a]">Users</h1>
        <div className="flex gap-2">
          <BdButton
            variant="light"
            onClick={() =>
              downloadCsv("users", [
                ["Name", "Email", "Phone", "Title", "Role", "Team", "Status"],
                ...filtered.map((u) => [
                  u.name,
                  u.email,
                  u.phone ?? "",
                  u.title ?? "",
                  ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role,
                  teamName.get(String(u.teamId ?? "")) ?? "",
                  u.status,
                ]),
              ])
            }
          >
            <Download className="size-3.5" /> Export CSV
          </BdButton>
          <BdButton onClick={() => setNewOpen(true)}>
            <Plus className="size-3.5" /> Add User
          </BdButton>
        </div>
      </div>

      <BdCard>
        <BdTableToolbar
          page={page}
          totalPages={totalPages}
          onPage={setPage}
          search={search}
          onSearch={setSearch}
          pageSize={pageSize}
          onPageSize={setPageSize}
        />
        <BdTable minWidth={960}>
          <thead>
            <tr>
              <BdTh>#</BdTh>
              <BdTh>Name</BdTh>
              <BdTh>Email</BdTh>
              <BdTh>Phone</BdTh>
              <BdTh>Role</BdTh>
              <BdTh>Team</BdTh>
              <BdTh>Status</BdTh>
              <BdTh className="text-right">Action</BdTh>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <BdEmptyRow colSpan={8} loading={loading} />
            ) : (
              paged.map((u, i) => (
                <tr key={u._id}>
                  <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>
                  <BdTd>
                    <p className="font-medium">{u.name}</p>
                    {u.title ? <p className="text-[11.5px] text-[#8b90a0]">{u.title}</p> : null}
                  </BdTd>
                  <BdTd>{u.email}</BdTd>
                  <BdTd>{u.phone || "-"}</BdTd>
                  <BdTd>{ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}</BdTd>
                  <BdTd>{teamName.get(String(u.teamId ?? "")) ?? "-"}</BdTd>
                  <BdTd>
                    <BdBadge color={STATUS_COLOR[u.status]} className="capitalize">
                      {u.status}
                    </BdBadge>
                  </BdTd>
                  <BdTd className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title="Edit"
                        onClick={() => setEditing(u)}
                        className="rounded p-1.5 text-[#3a5dc2] hover:bg-[#eef1fa]"
                      >
                        <Pencil className="size-4" />
                      </button>
                      {u.status === "suspended" ? (
                        <button
                          type="button"
                          title="Activate"
                          onClick={() => setStatus(u, "active")}
                          className="rounded p-1.5 text-[#37b24d] hover:bg-[#eaf8ee]"
                        >
                          <CheckCircle2 className="size-4" />
                        </button>
                      ) : (
                        <button
                          type="button"
                          title="Suspend"
                          onClick={() => setStatus(u, "suspended")}
                          disabled={u._id === me?.id}
                          className="rounded p-1.5 text-[#e5484d] hover:bg-[#fdecec] disabled:opacity-30"
                        >
                          <Ban className="size-4" />
                        </button>
                      )}
                    </div>
                  </BdTd>
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
        <p className="pt-3 text-[12.5px] text-[#8b90a0]">
          Showing {filtered.length === 0 ? 0 : (page - 1) * pageSize + 1} to{" "}
          {Math.min(page * pageSize, filtered.length)} of {filtered.length} entries
        </p>
      </BdCard>

      <UserDialog
        open={newOpen}
        user={null}
        teams={teams}
        isOwner={me?.role === "owner"}
        onOpenChange={setNewOpen}
        onSaved={load}
      />
      <UserDialog
        open={!!editing}
        user={editing}
        teams={teams}
        isOwner={me?.role === "owner"}
        onOpenChange={() => setEditing(null)}
        onSaved={load}
      />
    </BdPage>
  );
}

function UserDialog({
  open,
  user,
  teams,
  isOwner,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  user: UserItem | null;
  teams: TeamItem[];
  isOwner: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const blank = { name: "", email: "", phone: "", title: "", role: "sales_executive", teamId: "", status: "active", password: "" };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const editing = !!user;

  useEffect(() => {
    if (!open) return;
    setForm(
      user
        ? {
            name: user.name,
            email: user.email,
            phone: user.phone ?? "",
            title: user.title ?? "",
            role: user.role,
            teamId: String(user.teamId ?? ""),
            status: user.status,
            password: "",
          }
        : blank,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const set = (k: keyof typeof blank) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Name is required.");
    if (!editing && (!form.email.trim() || form.password.length < 8)) {
      return toast.error("Email and an 8+ character password are required.");
    }
    if (editing && form.password && form.password.length < 8) return toast.error("Password must be 8+ characters.");
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        phone: form.phone,
        title: form.title,
        role: form.role,
        teamId: form.teamId || null,
      };
      if (editing) payload.status = form.status;
      if (!editing) payload.email = form.email;
      if (form.password) payload.password = form.password;
      const res = await fetch(editing ? `/api/users/${user!._id}` : "/api/users", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || "Couldn't save user.");
      toast.success(editing ? "User updated" : "User created");
      // POST ignores a null teamId; set via PATCH is not needed because null === none.
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit User" : "Add User"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <BdField label="Name">
            <BdInput value={form.name} onChange={(e) => set("name")(e.target.value)} placeholder="Full name" />
          </BdField>
          <div className="grid grid-cols-2 gap-3">
            <BdField label="Email">
              <BdInput
                type="email"
                disabled={editing}
                value={form.email}
                onChange={(e) => set("email")(e.target.value)}
                placeholder="name@company.com"
              />
            </BdField>
            <BdField label="Phone">
              <BdInput value={form.phone} onChange={(e) => set("phone")(e.target.value)} placeholder="Phone" />
            </BdField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <BdField label="Role">
              <BdSelect
                clearable={false}
                value={form.role}
                onChange={set("role")}
                options={ROLE_OPTIONS.filter((o) => isOwner || o.value !== "owner" || form.role === "owner")}
              />
            </BdField>
            <BdField label="Team">
              <BdSelect
                placeholder="Select Team"
                value={form.teamId}
                onChange={set("teamId")}
                options={teams.map((t) => ({ value: t._id, label: t.name }))}
              />
            </BdField>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <BdField label="Title">
              <BdInput value={form.title} onChange={(e) => set("title")(e.target.value)} placeholder="Designation" />
            </BdField>
            {editing ? (
              <BdField label="Status">
                <BdSelect
                  clearable={false}
                  value={form.status}
                  onChange={set("status")}
                  options={[
                    { value: "active", label: "Active" },
                    { value: "invited", label: "Invited" },
                    { value: "suspended", label: "Suspended" },
                  ]}
                />
              </BdField>
            ) : null}
          </div>
          <BdField label={editing ? "Reset Password (leave blank to keep)" : "Password"}>
            <BdInput
              type="text"
              value={form.password}
              onChange={(e) => set("password")(e.target.value)}
              placeholder="At least 8 characters"
            />
          </BdField>
        </div>
        <DialogFooter>
          <BdButton variant="light" onClick={() => onOpenChange(false)}>
            Cancel
          </BdButton>
          <BdButton onClick={submit} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save Changes" : "Create User"}
          </BdButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
