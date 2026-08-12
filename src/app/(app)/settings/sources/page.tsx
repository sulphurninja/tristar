"use client";

import { useEffect, useMemo, useState } from "react";
import { DataTableShell, TableRoot, Th, Td } from "@/components/shared/DataTableShell";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tags } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { StatusPill } from "@/components/shared/StatusPill";

interface Src {
  _id: string;
  key: string;
  label: string;
  description?: string;
  color?: string;
  isActive: boolean;
  sortOrder?: number;
}

export default function SourcesPage() {
  const [sources, setSources] = useState<Src[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Src | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const totalPages = Math.max(1, Math.ceil(sources.length / pageSize));
  const pagedSources = useMemo(
    () => sources.slice((page - 1) * pageSize, page * pageSize),
    [sources, page, pageSize],
  );

  useEffect(() => {
    setPage(1);
  }, [pageSize]);

  const load = () => {
    setLoading(true);
    fetch("/api/sources", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setSources(d.sources ?? []))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const onDelete = async (id: string) => {
    if (!confirm("Delete this source? Existing leads keep the value but it can't be picked again.")) return;
    const res = await fetch(`/api/sources/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Source deleted");
      load();
    } else {
      toast.error("Couldn't delete source");
    }
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5 p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[20px] font-bold tracking-tight text-slate-900">
            Manage Sources
          </h1>
          <p className="mt-1 text-[12.5px] text-slate-500">
            Define the lead sources your team can pick from across the CRM.
          </p>
        </div>
        <Button onClick={() => setNewOpen(true)} className="gap-1.5">
          <Plus className="size-4" strokeWidth={2} />
          New source
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-slate-100" />
          ))}
        </div>
      ) : sources.length === 0 ? (
        <div className="rounded-xl bg-slate-50/60 px-6 py-12 text-center text-[13px] text-slate-500">
          No sources defined. Add Walk-in, Tele-calling, Channel Partner, Hoarding, etc.
        </div>
      ) : (
        <DataTableShell
          title="Sources"
          count={sources.length}
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
                <Th>Key</Th>
                <Th>Description</Th>
                <Th>Status</Th>
                <Th className="text-right">Action</Th>
              </tr>
            </thead>
            <tbody>
              {pagedSources.map((s) => (
                <tr key={s._id} className="transition-colors hover:bg-slate-50/80">
                  <Td>
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 rounded-full"
                        style={{ background: s.color ?? "#0F8F60" }}
                      />
                      <span className="font-semibold text-slate-900">{s.label}</span>
                    </div>
                  </Td>
                  <Td className="font-mono text-[11.5px] text-slate-500">{s.key}</Td>
                  <Td>{s.description ?? <span className="text-slate-400">—</span>}</Td>
                  <Td>
                    <StatusPill tone={s.isActive ? "success" : "neutral"} dot>
                      {s.isActive ? "Active" : "Inactive"}
                    </StatusPill>
                  </Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7"
                        onClick={() => setEditing(s)}
                      >
                        <Pencil className="size-3.5" strokeWidth={1.75} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => onDelete(s._id)}
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

      <SourceDialog
        open={newOpen}
        onOpenChange={setNewOpen}
        onSaved={() => {
          load();
          setNewOpen(false);
        }}
      />
      <SourceDialog
        source={editing}
        onOpenChange={() => setEditing(null)}
        onSaved={() => {
          load();
          setEditing(null);
        }}
      />
    </div>
  );
}

function SourceDialog({
  open,
  source,
  onOpenChange,
  onSaved,
}: {
  open?: boolean;
  source?: Src | null;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const editing = !!source;
  const isOpen = open ?? !!source;

  const [form, setForm] = useState({
    label: "",
    key: "",
    description: "",
    color: "#0F8F60",
    isActive: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (source) {
      setForm({
        label: source.label,
        key: source.key,
        description: source.description ?? "",
        color: source.color ?? "#0F8F60",
        isActive: source.isActive,
      });
    } else {
      setForm({ label: "", key: "", description: "", color: "#0F8F60", isActive: true });
    }
  }, [source]);

  if (!isOpen) return null;

  const submit = async () => {
    if (!form.label.trim()) {
      toast.error("Label is required.");
      return;
    }
    setSaving(true);
    try {
      const url = editing ? `/api/sources/${source!._id}` : "/api/sources";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Couldn't save source.");
        return;
      }
      toast.success(editing ? "Source updated" : "Source created");
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tags className="size-4 text-emerald-600" />
            {editing ? "Edit source" : "New source"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Label</Label>
            <Input
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
              placeholder="Walk-in"
            />
          </div>
          {editing ? (
            <div className="space-y-1.5">
              <Label>Key (read-only)</Label>
              <Input value={form.key} disabled />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Key (auto if blank)</Label>
              <Input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                placeholder="walkin"
                className="font-mono"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Walk-ins at the project sales gallery."
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Colour</Label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="h-10 w-14 cursor-pointer rounded-md border border-input"
                />
                <Input
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Active</Label>
              <div className="flex h-10 items-center gap-2">
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm({ ...form, isActive: v })}
                />
                <span className="text-[12px] text-slate-600">
                  {form.isActive ? "Visible to your team" : "Hidden"}
                </span>
              </div>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            {editing ? "Save changes" : "Create source"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
