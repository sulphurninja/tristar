"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowRight, Lock, RotateCcw, ShieldCheck, Users } from "lucide-react";
import { BdButton, BdCard, BdPage, BdPageHeader } from "@/components/bd";
import { PermissionMatrix, ScopePicker } from "@/components/access/PermissionMatrix";
import type { RoleInfo } from "@/components/access/UserAccessSheet";
import { ROLE_LABELS } from "@/lib/roles";
import { ALL_PERMISSIONS, DATA_SCOPES, ROLE_DEFAULTS, type DataScope, type Permission } from "@/lib/permissions";
import { cn } from "@/lib/utils";

const ROLE_BLURB: Record<string, string> = {
  owner: "Full, unrestricted control of the workspace.",
  admin: "Runs the workspace: users, configuration and all data.",
  manager: "Oversees sales across every team.",
  supervisor: "Leads a team and sees their team's pipeline.",
  sales_executive: "Works their own leads, visits and bookings.",
  telecaller: "Calls and qualifies their assigned leads.",
  field_executive: "Runs site visits for assigned leads.",
  channel_partner: "External partner submitting and tracking leads.",
  viewer: "Read-only access for audits and leadership.",
};

export default function RolesPage() {
  const [roles, setRoles] = useState<RoleInfo[]>([]);
  const [selected, setSelected] = useState<string>("manager");
  const [perms, setPerms] = useState<Permission[]>([]);
  const [scope, setScope] = useState<DataScope>("all");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/roles", { cache: "no-store" }).then((res) => res.json());
      setRoles(r.roles ?? []);
    } catch {
      toast.error("Couldn't load roles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = roles.find((r) => r.role === selected);

  useEffect(() => {
    if (!current) return;
    setPerms(current.permissions);
    setScope(current.scope);
  }, [current]);

  const factory = ROLE_DEFAULTS[selected as keyof typeof ROLE_DEFAULTS];
  const dirty = useMemo(() => {
    if (!current) return false;
    const a = new Set(current.permissions);
    return scope !== current.scope || perms.length !== a.size || perms.some((p) => !a.has(p));
  }, [current, perms, scope]);

  const save = async (reset = false) => {
    if (!current) return;
    if (reset && !confirm(`Restore the ${ROLE_LABELS[current.role]} role to Tristar's defaults?`)) return;
    setSaving(true);
    try {
      const res = await fetch("/api/roles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reset ? { role: current.role, reset: true } : { role: current.role, permissions: perms, scope }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(d.error || "Couldn't save role");
      toast.success(reset ? "Role restored to defaults" : `${ROLE_LABELS[current.role]} role updated`, {
        description: `Applies to ${current.members} member${current.members === 1 ? "" : "s"} right away.`,
      });
      await load();
    } finally {
      setSaving(false);
    }
  };

  const isOwnerRole = selected === "owner";

  return (
    <BdPage>
      <BdPageHeader
        eyebrow="Access control"
        title="Roles & permissions"
        description="Each role is a template. Changes here apply to everyone with that role; fine-tune individuals from Users."
        actions={
          <Link href="/settings/users" className="bd-btn-light">
            <Users className="size-4" /> Manage users
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <BdCard bodyClassName="p-2" className="h-fit lg:sticky lg:top-4">
          <ul className="space-y-0.5">
            {(loading ? [] : roles).map((r) => {
              const on = r.role === selected;
              return (
                <li key={r.role}>
                  <button
                    type="button"
                    onClick={() => setSelected(r.role)}
                    className={cn(
                      "group flex w-full items-start gap-3 rounded-[10px] px-3 py-2.5 text-left transition-colors",
                      on ? "bg-primary-50 ring-1 ring-primary/15" : "hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                        on ? "bg-primary text-white" : "bg-muted text-muted-foreground group-hover:bg-white",
                      )}
                    >
                      {r.role === "owner" ? <Lock className="size-3.5" /> : <ShieldCheck className="size-3.5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("truncate text-[13px] font-medium", on && "text-primary-700")}>
                          {ROLE_LABELS[r.role]}
                        </span>
                        {r.customised ? (
                          <span className="rounded-full bg-violet-50 px-1.5 py-px text-[10px] font-medium text-violet-700 ring-1 ring-violet-200/70">
                            Custom
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-0.5 block text-[11.5px] tabular-nums text-muted-foreground">
                        {r.role === "owner" ? "All" : r.permissions.length}/{ALL_PERMISSIONS.length} permissions ·{" "}
                        {r.members} member{r.members === 1 ? "" : "s"}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
            {loading
              ? Array.from({ length: 6 }).map((_, i) => <li key={i} className="m-1 h-12 animate-pulse rounded-lg bg-muted" />)
              : null}
          </ul>
        </BdCard>

        <div className="min-w-0 space-y-5">
          {current ? (
            <>
              <BdCard
                title={
                  <span className="flex items-center gap-2">
                    {ROLE_LABELS[current.role]}
                    {current.customised ? (
                      <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-700 ring-1 ring-violet-200/70">
                        Customised
                      </span>
                    ) : null}
                  </span>
                }
                description={ROLE_BLURB[current.role]}
                actions={
                  !isOwnerRole ? (
                    <>
                      {current.customised ? (
                        <BdButton variant="ghost" onClick={() => save(true)} disabled={saving}>
                          <RotateCcw className="size-3.5" /> Restore defaults
                        </BdButton>
                      ) : null}
                      <BdButton variant="light" disabled={!dirty || saving} onClick={() => { setPerms(current.permissions); setScope(current.scope); }}>
                        Discard
                      </BdButton>
                      <BdButton disabled={!dirty || saving} onClick={() => save()}>
                        {saving ? "Saving…" : "Save role"}
                      </BdButton>
                    </>
                  ) : null
                }
              >
                {isOwnerRole ? (
                  <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary-50/60 p-4">
                    <Lock className="mt-0.5 size-4 shrink-0 text-primary" />
                    <p className="text-[13px] text-foreground/80">
                      The Super Administrator always holds every permission and sees all data. This role can&apos;t be
                      restricted, so there&apos;s always someone who can fix access.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <h4 className="text-[13px] font-semibold">Data visibility</h4>
                    <p className="text-[12.5px] text-muted-foreground">
                      Whose leads, tasks, visits and bookings people in this role can see.
                    </p>
                    <div className="pt-1.5">
                      <ScopePicker value={scope} onChange={(v) => v && setScope(v)} />
                    </div>
                    {factory && scope !== factory.scope ? (
                      <p className="pt-1 text-[11.5px] text-muted-foreground">
                        Tristar default: {DATA_SCOPES.find((d) => d.value === factory.scope)?.label}
                      </p>
                    ) : null}
                  </div>
                )}
              </BdCard>

              {!isOwnerRole ? (
                <BdCard
                  title="Permissions"
                  description="Rows marked Granted or Revoked differ from Tristar's default for this role."
                >
                  <PermissionMatrix
                    value={perms}
                    baseline={factory?.permissions}
                    baselineLabel="Tristar default"
                    onChange={setPerms}
                  />
                </BdCard>
              ) : null}

              <Link
                href="/settings/users"
                className="flex items-center justify-between rounded-xl border border-dashed border-border bg-white/60 px-4 py-3 text-[13px] text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
              >
                Need an exception for one person? Override permissions per user from the Users page.
                <ArrowRight className="size-4" />
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </BdPage>
  );
}
