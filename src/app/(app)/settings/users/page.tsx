"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  Shield,
  Mail,
  Phone,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { StatusPill } from "@/components/shared/StatusPill";
import { ROLE_LABELS } from "@/lib/roles";
import { initials } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface UserItem {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  title?: string;
  role: string;
  status: "active" | "invited" | "suspended";
  lastLoginAt?: string;
  createdAt?: string;
}

const ROLES = Object.keys(ROLE_LABELS);

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newOpen, setNewOpen] = useState(false);
  const [editing, setEditing] = useState<UserItem | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { user: me } = useAuth();

  const totalPages = Math.max(1, Math.ceil(users.length / pageSize));
  const pagedUsers = useMemo(
    () => users.slice((page - 1) * pageSize, page * pageSize),
    [users, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const load = () => {
    setLoading(true);
    fetch("/api/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id: string) => {
    if (id === me?.id) {
      toast.error("You can't suspend your own account.");
      return;
    }
    if (!confirm("Suspend this user? They'll lose access immediately.")) return;
    const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("User suspended");
      load();
    } else {
      toast.error("Couldn't suspend user");
    }
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-slate-900">Manage Users</h1>
          <p className="mt-1 text-[12.5px] text-slate-500">
            Invite team members, set roles and suspend access.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-1.5">
          <Plus className="size-4" strokeWidth={2} />
          New user
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-xl bg-slate-50/60 px-6 py-12 text-center text-[13px] text-slate-500">
          No users yet — let&apos;s invite your first one.
        </div>
      ) : (
        <DataTableShell
          title="Users"
          count={users.length}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        >
          <TableRoot>
            <thead>
              <tr>
                <Th>User</Th>
                <Th>Email</Th>
                <Th>Phone</Th>
                <Th>Role</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {pagedUsers.map((u) => (
                <tr key={u._id} className="transition-colors hover:bg-slate-50/80">
                  <Td>
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 text-[11px] font-bold text-white">
                        {initials(u.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{u.name}</p>
                        {u.title ? (
                          <p className="text-[11px] text-slate-500">{u.title}</p>
                        ) : null}
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="size-3.5 text-slate-400" /> {u.email}
                    </span>
                  </Td>
                  <Td>
                    {u.phone ? (
                      <span className="inline-flex items-center gap-1">
                        <Phone className="size-3.5 text-slate-400" /> {u.phone}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5">
                      <Shield className="size-3.5 text-emerald-600" />
                      {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] ?? u.role}
                    </span>
                  </Td>
                  <Td>
                    <StatusPill
                      tone={
                        u.status === "active"
                          ? "success"
                          : u.status === "invited"
                            ? "info"
                            : "danger"
                      }
                      dot
                    >
                      {u.status}
                    </StatusPill>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 gap-1"
                        onClick={() => setEditing(u)}
                      >
                        <Pencil className="size-3.5" strokeWidth={1.75} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => onDelete(u._id)}
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.75} />
                      </Button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableRoot>
        </DataTableShell>
      )}

      <NewUserDialog open={newOpen} onOpenChange={setNewOpen} onCreated={load} />
      <EditUserDialog user={editing} onOpenChange={() => setEditing(null)} onSaved={load} />
    </div>
  );
}

function NewUserDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    title: "",
    role: "sales_executive",
    password: "",
  });
  const [saving, setSaving] = useState(false);

  const reset = () =>
    setForm({
      name: "",
      email: "",
      phone: "",
      title: "",
      role: "sales_executive",
      password: "",
    });

  const submit = async () => {
    if (!form.name || !form.email || form.password.length < 8) {
      toast.error("Name, email and an 8+ character password are required.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't create user.");
        return;
      }
      toast.success("User created");
      reset();
      onCreated();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add user</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Full name" required>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Priya Sharma"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Email" required>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="priya@tristarrealtors.in"
              />
            </Field>
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+91 98765 43210"
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Sr. Sales Executive"
              />
            </Field>
            <Field label="Role">
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r as keyof typeof ROLE_LABELS]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Temporary password" required hint="At least 8 characters.">
            <Input
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Create user
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  onOpenChange,
  onSaved,
}: {
  user: UserItem | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<{
    name: string;
    phone: string;
    title: string;
    role: string;
    status: "active" | "invited" | "suspended";
    password: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        phone: user.phone ?? "",
        title: user.title ?? "",
        role: user.role,
        status: user.status,
        password: "",
      });
    } else {
      setForm(null);
    }
  }, [user]);

  if (!user || !form) return null;

  const submit = async () => {
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        phone: form.phone,
        title: form.title,
        role: form.role,
        status: form.status,
      };
      if (form.password.length >= 8) payload.password = form.password;

      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't save user.");
        return;
      }
      toast.success("User updated");
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit user</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Full name">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Phone">
              <Input
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </Field>
            <Field label="Title">
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r as keyof typeof ROLE_LABELS]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Status">
              <Select
                value={form.status}
                onValueChange={(v) =>
                  setForm({ ...form, status: v as "active" | "invited" | "suspended" })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field label="Reset password" hint="Leave blank to keep the current one.">
            <Input
              type="text"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="At least 8 characters"
            />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1 text-[12px] font-medium text-slate-700">
        {label}
        {required ? <span className="text-red-500">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-slate-400">{hint}</p> : null}
    </div>
  );
}
