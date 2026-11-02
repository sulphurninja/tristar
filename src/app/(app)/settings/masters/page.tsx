"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, ChevronDown, ListPlus, Pencil, Plus, Search, Sparkles, Trash2, X } from "lucide-react";
import { BdButton, BdCard, BdField, BdInput, BdPage, BdPageHeader } from "@/components/bd";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MASTER_GROUPS, MASTER_TYPES, formatInr, masterType, type MasterType } from "@/lib/masters";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Item {
  _id: string;
  type: string;
  name: string;
  code?: string;
  color?: string;
  description?: string;
  url?: string;
  min?: number;
  max?: number;
  parentId?: string;
}
interface SourceRow {
  _id: string;
  key: string;
  label: string;
}

const SWATCHES = ["#2563eb", "#0891b2", "#059669", "#65a30d", "#d97706", "#dc2626", "#db2777", "#7c3aed", "#475569"];

async function api(url: string, init?: RequestInit) {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong");
  return data;
}

export default function MastersPage() {
  const [items, setItems] = useState<Item[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState("contact_type");
  const [navQ, setNavQ] = useState("");
  const [q, setQ] = useState("");
  const [dialog, setDialog] = useState<{ type: MasterType; item?: Item; parentId?: string } | null>(null);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const { can } = useAuth();
  const editable = can("settings.manage");

  const load = useCallback(async () => {
    try {
      const [m, s] = await Promise.all([api("/api/masters"), api("/api/sources")]);
      setItems(m.items ?? []);
      setSources(s.sources ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't load masters");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const byType = useMemo(() => {
    const m = new Map<string, Item[]>();
    for (const i of items) {
      if (i.parentId && i.type !== "lead_sub_source" && !["contact_sub_category", "property_sub_type", "unit_type"].includes(i.type)) continue;
      m.set(i.type, [...(m.get(i.type) ?? []), i]);
    }
    return m;
  }, [items]);
  const childrenOf = (parentId: string, type: string) => items.filter((i) => i.parentId === parentId && i.type === type);
  const count = (t: MasterType) => (t.type === "lead_sources" ? sources.length : t.href ? undefined : (byType.get(t.type) ?? []).filter((i) => !i.parentId).length);

  const nav = MASTER_TYPES.filter((t) => !t.childOnly && t.label.toLowerCase().includes(navQ.trim().toLowerCase()));
  const current = masterType(active)!;
  const rows = useMemo(() => {
    const list = (byType.get(active) ?? []).filter((i) => !i.parentId);
    const needle = q.trim().toLowerCase();
    return needle ? list.filter((i) => [i.name, i.code].some((v) => v?.toLowerCase().includes(needle))) : list;
  }, [byType, active, q]);

  const missingSuggestions = (current.suggestions ?? []).filter((s) => {
    const name = typeof s === "string" ? s : s.name;
    return !rows.some((r) => r.name.toLowerCase() === name.toLowerCase());
  });

  const addSuggestions = async () => {
    try {
      const r = await api("/api/masters", {
        method: "POST",
        body: JSON.stringify({ type: current.type, items: missingSuggestions.map((s) => (typeof s === "string" ? { name: s } : s)) }),
      });
      toast.success(`Added ${r.items.length} ${r.items.length === 1 ? current.singular.toLowerCase() : current.label.toLowerCase()}`);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add");
    }
  };

  const remove = async (i: Item, label: string) => {
    if (!confirm(`Delete “${i.name}”? ${label === "child" ? "" : "Anything nested under it is removed too."}`)) return;
    try {
      await api(`/api/masters/${i._id}`, { method: "DELETE" });
      toast.success("Deleted");
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete");
    }
  };

  const addChild = async (type: string, parentId: string, name: string) => {
    if (!name.trim()) return;
    try {
      await api("/api/masters", { method: "POST", body: JSON.stringify({ type, parentId, name }) });
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't add");
    }
  };

  const summary = (i: Item) => {
    const parts: string[] = [];
    if (current.fields?.includes("range")) {
      const unit = current.unit === "₹" ? formatInr : (n?: number) => (n == null ? "" : n.toLocaleString("en-IN"));
      parts.push(i.min != null && i.max != null ? `${unit(i.min)} – ${unit(i.max)}` : i.min != null ? `${unit(i.min)} +` : i.max != null ? `up to ${unit(i.max)}` : "");
    }
    return parts.filter(Boolean).join(" · ");
  };

  return (
    <BdPage>
      <BdPageHeader
        eyebrow="Settings"
        title="Masters"
        description="The pick-lists your team chooses from across leads, contacts, partners and inventory. Keep them tidy here."
      />

      <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Left: every list, grouped */}
        <BdCard bodyClassName="p-2" className="h-fit lg:sticky lg:top-4">
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={navQ} onChange={(e) => setNavQ(e.target.value)} placeholder="Find a list…" className="bd-input !pl-8" />
          </div>
          <nav className="max-h-[calc(100svh-260px)] space-y-3 overflow-y-auto pr-0.5">
            {MASTER_GROUPS.map((g) => {
              const list = nav.filter((t) => t.group === g);
              if (!list.length) return null;
              return (
                <div key={g}>
                  <p className="px-2.5 pb-1 pt-1 text-[11px] font-medium uppercase tracking-[0.07em] text-muted-foreground">{g}</p>
                  {list.map((t) => {
                    const on = t.type === active;
                    const n = count(t);
                    return (
                      <button
                        key={t.type}
                        type="button"
                        onClick={() => {
                          setActive(t.type);
                          setQ("");
                          setOpenRow(null);
                        }}
                        className={cn(
                          "flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[13px] transition-colors",
                          on ? "bg-primary-50 font-medium text-primary-700" : "text-foreground/80 hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <span className="flex-1 truncate">{t.label}</span>
                        {t.href && t.type !== "lead_sources" ? (
                          <ArrowUpRight className="size-3.5 text-muted-foreground" />
                        ) : (
                          <span className={cn("rounded-full px-1.5 text-[11px] tabular-nums", on ? "bg-white text-primary-700" : "text-muted-foreground")}>
                            {loading ? "" : n}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </BdCard>

        {/* Right: the selected list */}
        <div className="min-w-0">
          {current.type === "lead_stages" ? (
            <ElsewhereCard
              title="Lead stages"
              text="Stages belong to your sales pipelines, so each pipeline can have its own flow. Add, rename and reorder stages there."
              href="/settings/pipelines"
              cta="Open pipelines"
            />
          ) : current.type === "lead_sources" ? (
            <BdCard
              title={`Lead sources · ${sources.length}`}
              description="Add sub-sources under each source (e.g. Marketing Ads → Facebook, Google)."
              actions={
                <Link href="/settings/sources" className="bd-btn-light">
                  Manage sources <ArrowUpRight className="size-3.5" />
                </Link>
              }
              bodyClassName="p-0"
            >
              <ul className="divide-y divide-border/70">
                {sources.map((s) => (
                  <ChildRow
                    key={s._id}
                    title={s.label}
                    meta={s.key}
                    open={openRow === s._id}
                    onToggle={() => setOpenRow(openRow === s._id ? null : s._id)}
                    groups={[{ type: "lead_sub_source", label: "Sub-sources", items: childrenOf(s._id, "lead_sub_source") }]}
                    onAdd={(type, name) => addChild(type, s._id, name)}
                    onRemove={(i) => remove(i, "child")}
                    editable={editable}
                  />
                ))}
                {!sources.length && !loading ? <Empty text="No lead sources yet." /> : null}
              </ul>
            </BdCard>
          ) : (
            <BdCard
              title={
                <span>
                  {current.label} <span className="font-normal text-muted-foreground">· {rows.length}</span>
                </span>
              }
              description={current.description}
              actions={
                editable ? (
                  <>
                    {missingSuggestions.length ? (
                      <BdButton variant="light" onClick={addSuggestions}>
                        <Sparkles className="size-3.5 text-primary" /> Add {missingSuggestions.length} suggested
                      </BdButton>
                    ) : null}
                    <BdButton onClick={() => setDialog({ type: current })}>
                      <Plus className="size-4" /> Add {current.singular.toLowerCase()}
                    </BdButton>
                  </>
                ) : null
              }
              bodyClassName="p-0"
            >
              {rows.length > 8 ? (
                <div className="border-b border-border/70 p-3">
                  <div className="relative max-w-xs">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${current.label.toLowerCase()}…`} className="bd-input !pl-8" />
                  </div>
                </div>
              ) : null}
              <ul className="divide-y divide-border/70">
                {rows.map((i, idx) =>
                  current.children ? (
                    <ChildRow
                      key={i._id}
                      title={i.name}
                      color={i.color}
                      meta={summary(i) || i.code}
                      open={openRow === i._id}
                      onToggle={() => setOpenRow(openRow === i._id ? null : i._id)}
                      groups={current.children.map((c) => ({ ...c, items: childrenOf(i._id, c.type) }))}
                      onAdd={(type, name) => addChild(type, i._id, name)}
                      onRemove={(c) => remove(c, "child")}
                      onEdit={() => setDialog({ type: current, item: i })}
                      onDelete={() => remove(i, "parent")}
                      editable={editable}
                    />
                  ) : (
                    <li key={i._id} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
                      <span className="w-6 text-right text-[12px] tabular-nums text-muted-foreground">{idx + 1}</span>
                      {i.color ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: i.color }} /> : null}
                      {i.url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={i.url} alt="" className="h-9 w-14 shrink-0 rounded-md object-cover ring-1 ring-border" />
                      ) : null}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-medium">{i.name}</p>
                        {summary(i) || i.description ? (
                          <p className="truncate text-[12px] text-muted-foreground">{summary(i) || i.description}</p>
                        ) : null}
                      </div>
                      {i.code ? <span className="rounded-md bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{i.code}</span> : null}
                      {editable ? (
                        <RowActions onEdit={() => setDialog({ type: current, item: i })} onDelete={() => remove(i, "parent")} />
                      ) : null}
                    </li>
                  ),
                )}
                {!rows.length && !loading ? (
                  <Empty
                    text={q ? "Nothing matches your search." : `No ${current.label.toLowerCase()} yet.`}
                    action={
                      editable && !q ? (
                        <BdButton variant="light" onClick={() => (missingSuggestions.length ? addSuggestions() : setDialog({ type: current }))}>
                          {missingSuggestions.length ? <Sparkles className="size-3.5 text-primary" /> : <Plus className="size-4" />}
                          {missingSuggestions.length ? "Start with suggested values" : `Add ${current.singular.toLowerCase()}`}
                        </BdButton>
                      ) : null
                    }
                  />
                ) : null}
                {loading ? <li className="px-5 py-10 text-center text-[13px] text-muted-foreground">Loading…</li> : null}
              </ul>
            </BdCard>
          )}
        </div>
      </div>

      <MasterDialog state={dialog} onClose={() => setDialog(null)} onSaved={load} />
    </BdPage>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  const btn = "inline-flex size-8 items-center justify-center rounded-[8px] text-muted-foreground transition-colors";
  return (
    <div className="flex shrink-0 items-center gap-0.5 opacity-60 transition-opacity group-hover:opacity-100">
      <button type="button" title="Edit" onClick={onEdit} className={cn(btn, "hover:bg-muted hover:text-foreground")}>
        <Pencil className="size-4" />
      </button>
      <button type="button" title="Delete" onClick={onDelete} className={cn(btn, "hover:bg-destructive/10 hover:text-destructive")}>
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}

function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <li className="ts-blueprint flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl bg-white text-muted-foreground ring-1 ring-border">
        <ListPlus className="size-5" />
      </span>
      <p className="text-[13px] text-muted-foreground">{text}</p>
      {action}
    </li>
  );
}

function ElsewhereCard({ title, text, href, cta }: { title: string; text: string; href: string; cta: string }) {
  return (
    <BdCard title={title}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-lg text-[13px] text-muted-foreground">{text}</p>
        <Link href={href} className="bd-btn">
          {cta} <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </BdCard>
  );
}

/** A parent entry with expandable chip lists of its children (sub-types, unit types…). */
function ChildRow({
  title,
  meta,
  color,
  open,
  onToggle,
  groups,
  onAdd,
  onRemove,
  onEdit,
  onDelete,
  editable,
}: {
  title: string;
  meta?: string;
  color?: string;
  open: boolean;
  onToggle: () => void;
  groups: Array<{ type: string; label: string; items: Item[] }>;
  onAdd: (type: string, name: string) => void;
  onRemove: (i: Item) => void;
  onEdit?: () => void;
  onDelete?: () => void;
  editable: boolean;
}) {
  return (
    <li className="group">
      <div className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-3 text-left" aria-expanded={open}>
          <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", !open && "-rotate-90")} />
          {color ? <span className="size-2.5 shrink-0 rounded-full" style={{ background: color }} /> : null}
          <span className="min-w-0">
            <span className="block truncate text-[13.5px] font-medium">{title}</span>
            {meta ? <span className="block truncate text-[12px] text-muted-foreground">{meta}</span> : null}
          </span>
        </button>
        <div className="hidden gap-1.5 sm:flex">
          {groups.map((g) => (
            <span key={g.type} className="rounded-full bg-muted px-2 py-0.5 text-[11.5px] text-muted-foreground">
              {g.items.length} {g.label.toLowerCase()}
            </span>
          ))}
        </div>
        {editable && onEdit && onDelete ? <RowActions onEdit={onEdit} onDelete={onDelete} /> : null}
      </div>
      {open ? (
        <div className="space-y-4 border-t border-border/60 bg-muted/25 px-5 py-4 pl-12">
          {groups.map((g) => (
            <ChipList key={g.type} label={g.label} items={g.items} onAdd={(n) => onAdd(g.type, n)} onRemove={onRemove} editable={editable} />
          ))}
        </div>
      ) : null}
    </li>
  );
}

function ChipList({
  label,
  items,
  onAdd,
  onRemove,
  editable,
}: {
  label: string;
  items: Item[];
  onAdd: (name: string) => void;
  onRemove: (i: Item) => void;
  editable: boolean;
}) {
  const [v, setV] = useState("");
  const submit = () => {
    if (!v.trim()) return;
    onAdd(v.trim());
    setV("");
  };
  return (
    <div>
      <p className="mb-2 text-[12px] font-medium text-foreground/80">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {items.map((i) => (
          <span key={i._id} className="inline-flex items-center gap-1 rounded-full bg-white py-1 pl-2.5 pr-1 text-[12.5px] ring-1 ring-border">
            {i.name}
            {editable ? (
              <button type="button" aria-label={`Remove ${i.name}`} onClick={() => onRemove(i)} className="rounded-full p-0.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <X className="size-3" />
              </button>
            ) : null}
          </span>
        ))}
        {editable ? (
          <span className="inline-flex items-center rounded-full bg-white pl-2.5 ring-1 ring-dashed ring-input focus-within:ring-ring">
            <input
              value={v}
              onChange={(e) => setV(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={`Add ${label.toLowerCase().replace(/s$/, "")}…`}
              className="h-7 w-36 bg-transparent text-[12.5px] outline-none placeholder:text-muted-foreground"
            />
            <button type="button" onClick={submit} aria-label="Add" className="mr-0.5 rounded-full p-1 text-primary hover:bg-primary-50">
              <Plus className="size-3.5" />
            </button>
          </span>
        ) : null}
        {!items.length && !editable ? <span className="text-[12px] text-muted-foreground">None</span> : null}
      </div>
    </div>
  );
}

function MasterDialog({
  state,
  onClose,
  onSaved,
}: {
  state: { type: MasterType; item?: Item; parentId?: string } | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ name: "", code: "", color: "", description: "", url: "", min: "", max: "" });
  const [saving, setSaving] = useState(false);
  const t = state?.type;
  const editing = !!state?.item;

  useEffect(() => {
    if (!state) return;
    const i = state.item;
    setForm({
      name: i?.name ?? "",
      code: i?.code ?? "",
      color: i?.color ?? "",
      description: i?.description ?? "",
      url: i?.url ?? "",
      min: i?.min != null ? String(i.min) : "",
      max: i?.max != null ? String(i.max) : "",
    });
  }, [state]);

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));
  const has = (f: string) => t?.fields?.includes(f as never);

  const save = async () => {
    if (!t || !form.name.trim()) return toast.error("Give it a name.");
    if (has("range") && form.min && form.max && Number(form.min) > Number(form.max)) return toast.error("Minimum can't be more than maximum.");
    setSaving(true);
    try {
      const body: Record<string, unknown> = { name: form.name };
      if (has("code")) body.code = form.code;
      if (has("color")) body.color = form.color;
      if (has("description")) body.description = form.description;
      if (has("url")) body.url = form.url;
      if (has("range")) {
        body.min = form.min;
        body.max = form.max;
      }
      if (editing) await api(`/api/masters/${state!.item!._id}`, { method: "PATCH", body: JSON.stringify(body) });
      else await api("/api/masters", { method: "POST", body: JSON.stringify({ ...body, type: t.type, parentId: state?.parentId }) });
      toast.success(editing ? "Saved" : `${t.singular} added`);
      onSaved();
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!state} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? `Edit ${t?.singular.toLowerCase()}` : `Add ${t?.singular.toLowerCase()}`}</DialogTitle>
          <DialogDescription>{t?.description}</DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-4">
          <BdField label="Name">
            <BdInput autoFocus value={form.name} onChange={(e) => set("name")(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} placeholder={`e.g. ${typeof t?.suggestions?.[0] === "string" ? t.suggestions[0] : t?.suggestions?.[0]?.name ?? "Name"}`} />
          </BdField>
          {has("range") ? (
            <div className="grid grid-cols-2 gap-3">
              <BdField label={`From ${t?.unit ? `(${t.unit})` : ""}`} hint={t?.unit === "₹" && form.min ? formatInr(Number(form.min)) : undefined}>
                <BdInput inputMode="numeric" value={form.min} onChange={(e) => set("min")(e.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
              </BdField>
              <BdField label={`To ${t?.unit ? `(${t.unit})` : ""}`} hint={t?.unit === "₹" && form.max ? formatInr(Number(form.max)) : "Leave blank for “and above”"}>
                <BdInput inputMode="numeric" value={form.max} onChange={(e) => set("max")(e.target.value.replace(/[^\d.]/g, ""))} placeholder="No limit" />
              </BdField>
            </div>
          ) : null}
          {has("code") ? (
            <BdField label="Short code" hint="Optional — used in imports and integrations.">
              <BdInput value={form.code} onChange={(e) => set("code")(e.target.value)} placeholder="e.g. PUN-W" />
            </BdField>
          ) : null}
          {has("url") ? (
            <BdField label="Image URL">
              <BdInput value={form.url} onChange={(e) => set("url")(e.target.value)} placeholder="https://…" />
            </BdField>
          ) : null}
          {has("description") ? (
            <BdField label="Caption">
              <BdInput value={form.description} onChange={(e) => set("description")(e.target.value)} placeholder="Optional" />
            </BdField>
          ) : null}
          {has("color") ? (
            <BdField label="Colour">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => set("color")("")}
                  className={cn("flex size-7 items-center justify-center rounded-full bg-white ring-1 ring-border", !form.color && "ring-2 ring-primary ring-offset-2")}
                  title="No colour"
                >
                  <X className="size-3.5 text-muted-foreground" />
                </button>
                {SWATCHES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => set("color")(c)}
                    title={c}
                    className={cn("size-7 rounded-full transition-transform hover:scale-110", form.color === c && "ring-2 ring-primary ring-offset-2")}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </BdField>
          ) : null}
        </DialogBody>
        <DialogFooter>
          <BdButton variant="light" onClick={onClose}>
            Cancel
          </BdButton>
          <BdButton onClick={save} disabled={saving}>
            {saving ? "Saving…" : editing ? "Save" : "Add"}
          </BdButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
