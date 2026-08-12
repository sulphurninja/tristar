"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Trash2,
  Copy,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
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
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";

interface ApiKeyRow {
  _id: string;
  sourceKey: string;
  sourceLabel: string;
  projectName?: string;
  userName?: string;
  userId?: { _id: string; name: string; email: string };
  projectId?: { _id: string; name: string; code: string };
  key: string;
  isActive: boolean;
  createdAt: string;
}

interface UserItem {
  _id: string;
  name: string;
  email: string;
}

interface ProjectItem {
  _id: string;
  name: string;
  code: string;
}

interface SourceItem {
  _id: string;
  key: string;
  label: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [users, setUsers] = useState<UserItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [createdSecret, setCreatedSecret] = useState<{
    key: string;
    secret: string;
    label: string;
  } | null>(null);
  const [reveal, setReveal] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const totalPages = Math.max(1, Math.ceil(keys.length / pageSize));
  const pagedKeys = useMemo(
    () => keys.slice((page - 1) * pageSize, page * pageSize),
    [keys, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const load = () => {
    setLoading(true);
    Promise.all([
      fetch("/api/api-keys", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/users", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/projects?limit=200", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/sources", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([k, u, p, s]) => {
        setKeys(k.keys ?? []);
        setUsers(u.users ?? []);
        setProjects(p.projects ?? []);
        setSources(s.sources ?? []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id: string) => {
    if (!confirm("Revoke this API key? Any integrations using it will stop working.")) return;
    const res = await fetch(`/api/api-keys/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("API key revoked");
      load();
    } else {
      toast.error("Couldn't revoke key");
    }
  };

  const toggleReveal = (id: string) => setReveal((r) => ({ ...r, [id]: !r[id] }));

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Couldn't copy");
    }
  };

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-slate-900">API Keys</h1>
          <p className="mt-1 text-[12.5px] text-slate-500">
            Project-scoped keys for kiosks, partner lead-feed integrations and webhooks.
          </p>
        </div>
        <Button onClick={() => setCreating(true)} className="gap-1.5">
          <Plus className="size-4" strokeWidth={2} />
          New API Key
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="rounded-xl bg-slate-50/60 px-6 py-12 text-center text-[13px] text-slate-500">
          No API keys yet — create one to expose lead capture to a project.
        </div>
      ) : (
        <DataTableShell
          title="API Keys"
          count={keys.length}
          page={page}
          totalPages={totalPages}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={setPageSize}
        >
          <TableRoot>
            <thead>
              <tr>
                <Th>Source</Th>
                <Th>User</Th>
                <Th>Project</Th>
                <Th>API Key</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {pagedKeys.map((k) => {
                const masked = `${k.key.slice(0, 6)}••••••••${k.key.slice(-4)}`;
                return (
                  <tr key={k._id} className="transition-colors hover:bg-slate-50/80">
                    <Td className="font-medium text-slate-900">{k.sourceLabel}</Td>
                    <Td>{k.userId?.name ?? k.userName ?? "—"}</Td>
                    <Td>{k.projectId?.name ?? k.projectName ?? "—"}</Td>
                    <Td>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-slate-100 px-2 py-1 font-mono text-[11.5px] text-slate-700">
                          {reveal[k._id] ? k.key : masked}
                        </code>
                        <button
                          onClick={() => toggleReveal(k._id)}
                          className="text-slate-500 hover:text-slate-900"
                          aria-label="Toggle visibility"
                        >
                          {reveal[k._id] ? (
                            <EyeOff className="size-3.5" />
                          ) : (
                            <Eye className="size-3.5" />
                          )}
                        </button>
                        <button
                          onClick={() => copy(k.key)}
                          className="text-slate-500 hover:text-slate-900"
                          aria-label="Copy key"
                        >
                          <Copy className="size-3.5" />
                        </button>
                      </div>
                    </Td>
                    <Td>
                      <StatusPill tone={k.isActive ? "success" : "neutral"} dot>
                        {k.isActive ? "Active" : "Revoked"}
                      </StatusPill>
                    </Td>
                    <Td className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => onDelete(k._id)}
                      >
                        <Trash2 className="size-3.5" strokeWidth={1.75} />
                      </Button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </TableRoot>
        </DataTableShell>
      )}

      <CreateApiKeyDialog
        open={creating}
        onOpenChange={setCreating}
        users={users}
        projects={projects}
        sources={sources}
        onCreated={(secret, key, label) => {
          setCreatedSecret({ key, secret, label });
          load();
          setCreating(false);
        }}
      />

      <Dialog open={!!createdSecret} onOpenChange={() => setCreatedSecret(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="size-5 text-emerald-600" /> API key created
            </DialogTitle>
            <DialogDescription>
              Copy your secret now. We hash it and never show it again.
            </DialogDescription>
          </DialogHeader>
          {createdSecret ? (
            <div className="space-y-3">
              <div className="rounded-md border border-amber-200 bg-amber-50/60 p-3 text-[12px] text-amber-800">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="size-3.5" />
                  Save this secret now — it can&apos;t be retrieved later.
                </div>
              </div>
              <Field label="Source / scope">
                <Input value={createdSecret.label} readOnly />
              </Field>
              <Field label="Public key">
                <div className="flex items-center gap-2">
                  <Input value={createdSecret.key} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => copy(createdSecret.key)}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </Field>
              <Field label="Secret">
                <div className="flex items-center gap-2">
                  <Input value={createdSecret.secret} readOnly className="font-mono" />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9"
                    onClick={() => copy(createdSecret.secret)}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </Field>
            </div>
          ) : null}
          <DialogFooter>
            <Button onClick={() => setCreatedSecret(null)}>I&apos;ve copied it</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}

function CreateApiKeyDialog({
  open,
  onOpenChange,
  users,
  projects,
  sources,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  users: UserItem[];
  projects: ProjectItem[];
  sources: SourceItem[];
  onCreated: (secret: string, key: string, label: string) => void;
}) {
  const [sourceKey, setSourceKey] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  const sourceLabel = useMemo(
    () => sources.find((s) => s.key === sourceKey)?.label ?? "",
    [sources, sourceKey],
  );

  useEffect(() => {
    if (!open) {
      setSourceKey("");
      setUserId("");
      setProjectId("");
    }
  }, [open]);

  const submit = async () => {
    if (!sourceKey || !userId || !projectId) {
      toast.error("Pick a source, user and project.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/api-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceKey, sourceLabel, userId, projectId }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't create key.");
        return;
      }
      toast.success("API key created");
      onCreated(
        data.apiKey.secret,
        data.apiKey.key,
        `${sourceLabel} · ${data.apiKey.userName} · ${data.apiKey.projectName}`,
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New API Key</DialogTitle>
          <DialogDescription>
            Bind a key to a source, user and project. Leads created with this key inherit
            those defaults automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Field label="Source" required>
            <Select value={sourceKey} onValueChange={setSourceKey}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a source" />
              </SelectTrigger>
              <SelectContent>
                {sources.length === 0 ? (
                  <div className="px-2 py-3 text-[12px] text-slate-400">
                    No sources defined. Add one in Settings → Manage Sources.
                  </div>
                ) : (
                  sources.map((s) => (
                    <SelectItem key={s._id} value={s.key}>
                      {s.label}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
          <Field label="User" required hint="Leads received via this key are owned by this user.">
            <Select value={userId} onValueChange={setUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u._id} value={u._id}>
                    {u.name} <span className="text-slate-400">· {u.email}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Project" required>
            <Select value={projectId} onValueChange={setProjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Pick a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.length === 0 ? (
                  <div className="px-2 py-3 text-[12px] text-slate-400">
                    No projects yet — add one in Projects.
                  </div>
                ) : (
                  projects.map((p) => (
                    <SelectItem key={p._id} value={p._id}>
                      {p.name} <span className="text-slate-400">· {p.code}</span>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Create key
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
