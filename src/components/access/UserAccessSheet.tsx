"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ShieldCheck } from "lucide-react";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { BdButton, BdSelect } from "@/components/bd";
import { PermissionMatrix, ScopePicker } from "@/components/access/PermissionMatrix";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { DATA_SCOPES, effectiveAccess, type DataScope, type Permission } from "@/lib/permissions";
import { initials } from "@/lib/utils";

export interface RoleInfo {
  role: Role;
  permissions: Permission[];
  scope: DataScope;
  customised: boolean;
  members: number;
}

export interface AccessUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  permissionOverrides?: { allow?: string[]; deny?: string[] };
  dataScope?: DataScope | null;
}

const scopeLabel = (s: DataScope) => DATA_SCOPES.find((d) => d.value === s)?.label ?? s;

/**
 * Super Administrator panel for one user: role, data visibility and
 * per-permission grants / revokes on top of the role template.
 */
export function UserAccessSheet({
  user,
  roles,
  meId,
  onOpenChange,
  onSaved,
}: {
  user: AccessUser | null;
  roles: RoleInfo[];
  meId?: string;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}) {
  const [role, setRole] = useState<Role>("sales_executive");
  const [perms, setPerms] = useState<Permission[]>([]);
  const [scope, setScope] = useState<DataScope | "">("");
  const [saving, setSaving] = useState(false);

  const templates = useMemo(() => Object.fromEntries(roles.map((r) => [r.role, r])), [roles]);
  const tpl = templates[role];

  useEffect(() => {
    if (!user) return;
    const r = user.role as Role;
    setRole(r);
    setScope(user.dataScope ?? "");
    const custom = Object.fromEntries(roles.map((x) => [x.role, { permissions: x.permissions, scope: x.scope }]));
    setPerms(effectiveAccess(r, user.permissionOverrides, null, custom).permissions);
  }, [user, roles]);

  /* Switching role re-bases the matrix on the new role's template. */
  const changeRole = (r: Role) => {
    setRole(r);
    setPerms(templates[r]?.permissions ?? []);
  };

  const diff = useMemo(() => {
    const base = new Set(tpl?.permissions ?? []);
    const now = new Set(perms);
    return {
      allow: perms.filter((p) => !base.has(p)),
      deny: (tpl?.permissions ?? []).filter((p) => !now.has(p)),
    };
  }, [perms, tpl]);

  const isSelf = user?._id === meId;
  const locked = user?.role === "owner";

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        permissionOverrides: diff,
        dataScope: scope || null,
      };
      if (role !== user.role) body.role = role;
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(data.error || "Couldn't update access");
      toast.success(`Access updated for ${user.name}`, { description: "Takes effect on their next action." });
      onSaved();
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  const changes = diff.allow.length + diff.deny.length;

  return (
    <Sheet open={!!user} onOpenChange={onOpenChange}>
      <SheetContent width="xl">
        <SheetHeader className="border-border">
          <div className="flex items-center gap-3 pr-8">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary-50 text-[13px] font-semibold text-primary-700 ring-1 ring-primary/15">
              {initials(user?.name)}
            </span>
            <div className="min-w-0">
              <SheetTitle className="truncate text-foreground">{user?.name}</SheetTitle>
              <SheetDescription className="truncate">{user?.email}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-6 bg-background/60">
          {locked ? (
            <div className="flex gap-3 rounded-xl border border-primary/20 bg-primary-50/60 p-4">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <p className="text-[13px] font-semibold">Super Administrator</p>
                <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                  This account always has full access to everything in the workspace. Its permissions can&apos;t be
                  restricted.
                </p>
              </div>
            </div>
          ) : (
            <>
              <section>
                <h3 className="text-[13px] font-semibold">Role</h3>
                <p className="mb-2.5 mt-0.5 text-[12.5px] text-muted-foreground">
                  The role sets their starting permissions. Fine-tune individual permissions below.
                </p>
                <BdSelect
                  clearable={false}
                  disabled={isSelf}
                  value={role}
                  onChange={(v) => changeRole(v as Role)}
                  options={roles.filter((r) => r.role !== "owner").map((r) => ({ value: r.role, label: ROLE_LABELS[r.role] }))}
                  className="max-w-xs"
                />
              </section>

              <section>
                <h3 className="text-[13px] font-semibold">Data visibility</h3>
                <p className="mb-2.5 mt-0.5 text-[12.5px] text-muted-foreground">
                  Whose leads, tasks, visits and bookings they can see in lists and reports.
                </p>
                <ScopePicker
                  value={scope}
                  onChange={setScope}
                  inheritLabel={tpl ? `Follows the role: ${scopeLabel(tpl.scope).toLowerCase()}.` : ""}
                />
              </section>

              <section>
                <div className="mb-2.5 flex items-end justify-between gap-3">
                  <div>
                    <h3 className="text-[13px] font-semibold">Permissions</h3>
                    <p className="mt-0.5 text-[12.5px] text-muted-foreground">
                      {changes === 0
                        ? `Matches the ${ROLE_LABELS[role]} role.`
                        : `${diff.allow.length} granted, ${diff.deny.length} revoked vs. the ${ROLE_LABELS[role]} role.`}
                    </p>
                  </div>
                  {changes > 0 ? (
                    <BdButton variant="ghost" className="!h-7 !text-[12px]" onClick={() => setPerms(tpl?.permissions ?? [])}>
                      Reset to role
                    </BdButton>
                  ) : null}
                </div>
                <PermissionMatrix value={perms} baseline={tpl?.permissions} onChange={setPerms} />
              </section>
            </>
          )}
        </SheetBody>

        <SheetFooter className="border-border bg-white">
          <BdButton variant="light" onClick={() => onOpenChange(false)}>
            Cancel
          </BdButton>
          {!locked ? (
            <BdButton onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save access"}
            </BdButton>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
