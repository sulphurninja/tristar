"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Minus, RotateCcw } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { DATA_SCOPES, PERMISSION_GROUPS, type DataScope, type Permission } from "@/lib/permissions";

export type PermState = "default" | "granted" | "revoked";

/**
 * Grouped permission toggles.
 * - `value`   : the effective permission set being edited
 * - `baseline`: what the role grants by default; rows that differ are flagged
 *               as Granted / Revoked with a one-click reset.
 */
export function PermissionMatrix({
  value,
  baseline,
  onChange,
  disabled,
  baselineLabel = "role default",
}: {
  value: Permission[];
  baseline?: Permission[];
  onChange: (next: Permission[]) => void;
  disabled?: boolean;
  baselineLabel?: string;
}) {
  const on = useMemo(() => new Set(value), [value]);
  const base = useMemo(() => (baseline ? new Set(baseline) : null), [baseline]);
  const [closed, setClosed] = useState<Record<string, boolean>>({});

  const set = (keys: Permission[], enabled: boolean) => {
    const next = new Set(on);
    for (const k of keys) {
      if (enabled) next.add(k);
      else next.delete(k);
    }
    onChange([...next] as Permission[]);
  };

  return (
    <div className="space-y-2.5">
      {PERMISSION_GROUPS.map((g) => {
        const keys = g.perms.map((p) => p.key) as Permission[];
        const count = keys.filter((k) => on.has(k)).length;
        const all = count === keys.length;
        const none = count === 0;
        const changed = base ? keys.some((k) => on.has(k) !== base.has(k)) : false;
        const isClosed = closed[g.key];
        return (
          <section key={g.key} className="overflow-hidden rounded-xl border border-border bg-white">
            <header className="flex items-center gap-3 bg-muted/40 px-3.5 py-2.5">
              <button
                type="button"
                onClick={() => setClosed((c) => ({ ...c, [g.key]: !isClosed }))}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
                aria-expanded={!isClosed}
              >
                <ChevronDown
                  className={cn("size-4 shrink-0 text-muted-foreground transition-transform", isClosed && "-rotate-90")}
                />
                <span className="truncate text-[13px] font-semibold">{g.label}</span>
                <span className="text-[12px] tabular-nums text-muted-foreground">
                  {count}/{keys.length}
                </span>
                {changed ? <span className="size-1.5 rounded-full bg-primary" title="Differs from role default" /> : null}
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => set(keys, !all)}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded-md px-2 text-[11.5px] font-medium transition-colors disabled:opacity-50",
                  all ? "bg-primary text-white hover:bg-primary-700" : "bg-white text-foreground/80 ring-1 ring-border hover:bg-muted",
                )}
                title={all ? "Turn all off" : "Turn all on"}
              >
                {all ? <Check className="size-3" /> : none ? null : <Minus className="size-3" />}
                {all ? "All" : none ? "None" : "Some"}
              </button>
            </header>
            {!isClosed ? (
              <ul className="divide-y divide-border/70">
                {g.perms.map((p) => {
                  const k = p.key as Permission;
                  const enabled = on.has(k);
                  const state: PermState = !base || enabled === base.has(k) ? "default" : enabled ? "granted" : "revoked";
                  return (
                    <li key={k} className="flex items-center gap-3 px-3.5 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-[13px]", state === "revoked" && "text-muted-foreground line-through decoration-destructive/40")}>
                          {p.label}
                        </p>
                        <p className="font-mono text-[10.5px] text-muted-foreground/70">{k}</p>
                      </div>
                      {state !== "default" ? (
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                            state === "granted"
                              ? "bg-primary-50 text-primary-700 ring-1 ring-primary/15"
                              : "bg-destructive/10 text-destructive ring-1 ring-destructive/15",
                          )}
                        >
                          {state === "granted" ? "Granted" : "Revoked"}
                          <button
                            type="button"
                            disabled={disabled}
                            onClick={() => set([k], base!.has(k))}
                            title={`Reset to ${baselineLabel}`}
                            className="-mr-0.5 rounded-full p-0.5 hover:bg-black/5"
                          >
                            <RotateCcw className="size-2.5" />
                          </button>
                        </span>
                      ) : null}
                      <Switch checked={enabled} disabled={disabled} onCheckedChange={(v) => set([k], v)} aria-label={p.label} />
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}

/** Segmented "who's records can they see" control. `allowInherit` adds a "Role default" option. */
export function ScopePicker({
  value,
  onChange,
  inheritLabel,
  disabled,
}: {
  value: DataScope | "";
  onChange: (v: DataScope | "") => void;
  inheritLabel?: string;
  disabled?: boolean;
}) {
  const opts: Array<{ value: DataScope | ""; label: string; hint: string }> = [
    ...(inheritLabel !== undefined ? [{ value: "" as const, label: "Role default", hint: inheritLabel }] : []),
    ...DATA_SCOPES,
  ];
  return (
    <div className={cn("grid gap-2", opts.length === 4 ? "sm:grid-cols-4" : "sm:grid-cols-3")}>
      {opts.map((o) => {
        const active = value === o.value;
        return (
          <button
            key={o.value || "inherit"}
            type="button"
            disabled={disabled}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-[10px] border px-3 py-2.5 text-left transition-[border-color,box-shadow,background-color] disabled:opacity-50",
              active
                ? "border-primary bg-primary-50/70 ring-[3px] ring-primary/10"
                : "border-border bg-white hover:border-input hover:bg-muted/40",
            )}
          >
            <span className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-3.5 items-center justify-center rounded-full border",
                  active ? "border-primary bg-primary" : "border-input bg-white",
                )}
              >
                {active ? <span className="size-1.5 rounded-full bg-white" /> : null}
              </span>
              <span className="text-[12.5px] font-medium">{o.label}</span>
            </span>
            <span className="mt-1 block text-[11.5px] leading-snug text-muted-foreground">{o.hint}</span>
          </button>
        );
      })}
    </div>
  );
}
