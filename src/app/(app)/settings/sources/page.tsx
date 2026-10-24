"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BdBadge,
  BdButton,
  BdCard,
  BdEmptyRow,
  BdPage,
  BdTable,
  BdTableToolbar,
  BdTd,
  BdTh,
} from "@/components/bd";
import { downloadCsv } from "@/lib/csv";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Tags, Download } from "lucide-react";
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
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q
      ? sources.filter((s) => [s.label, s.key, s.description].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
      : sources;
  }, [sources, search]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  useEffect(() => setPage(1), [pageSize, search]);

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
      const d = await res.json().catch(() => ({}));
      toast.error(d.error || "Couldn't delete source");
    }
  };

  return (
    <BdPage>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[20px] font-semibold text-[#2b2f3a]">Sources</h1>
        <div className="flex gap-2">
          <BdButton
            variant="light"
            onClick={() =>
              downloadCsv("sources", [
                ["Source", "Key", "Description", "Status"],
                ...filtered.map((s) => [s.label, s.key, s.description ?? "", s.isActive ? "Active" : "Inactive"]),
              ])
            }
          >
            <Download className="size-3.5" /> Export CSV
          </BdButton>
          <BdButton onClick={() => setNewOpen(true)}>
            <Plus className="size-3.5" /> Add Source
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
        <BdTable minWidth={720}>
          <thead>
            <tr>
              <BdTh>#</BdTh>
              <BdTh>Source</BdTh>
              <BdTh>Key</BdTh>
              <BdTh>Description</BdTh>
              <BdTh>Status</BdTh>
              <BdTh className="text-right">Action</BdTh>
            </tr>
          </thead>
          <tbody>
            {paged.length === 0 ? (
              <BdEmptyRow colSpan={6} loading={loading} />
            ) : (
              paged.map((s, i) => (
                <tr key={s._id}>
                  <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>
                  <BdTd>
                    <span className="inline-flex items-center gap-2 font-medium">
                      <span className="size-2.5 rounded-full" style={{ background: s.color ?? "#3a5dc2" }} />
                      {s.label}
                    </span>
                  </BdTd>
                  <BdTd className="font-mono text-[12px] text-[#5a6072]">{s.key}</BdTd>
                  <BdTd>{s.description || "-"}</BdTd>
                  <BdTd>
                    <BdBadge color={s.isActive ? "#37b24d" : "#9a9ca6"}>{s.isActive ? "Active" : "Inactive"}</BdBadge>
                  </BdTd>
                  <BdTd className="text-right">
                    <div className="flex justify-end gap-1">
                      <button type="button" title="Edit" onClick={() => setEditing(s)} className="rounded p-1.5 text-[#3a5dc2] hover:bg-[#eef1fa]">
                        <Pencil className="size-4" />
                      </button>
                      <button type="button" title="Delete" onClick={() => onDelete(s._id)} className="rounded p-1.5 text-[#e5484d] hover:bg-[#fdecec]">
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </BdTd>
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
      </BdCard>

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
    </BdPage>
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
