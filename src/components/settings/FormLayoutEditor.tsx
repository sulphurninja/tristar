"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { resolveForm, type FieldMode, type FormConfig, type FormSectionDef } from "@/lib/lead-form";

const MODES: Array<{ value: FieldMode; label: string }> = [
  { value: "hidden", label: "Hidden" },
  { value: "optional", label: "Optional" },
  { value: "required", label: "Required" },
];

/**
 * Section-by-section field layout: switch a whole section on/off, and set each
 * field to Hidden / Optional / Required. Locked fields are always required.
 */
export function FormLayoutEditor({
  sections,
  value,
  onChange,
  disabled,
}: {
  sections: FormSectionDef[];
  value: FormConfig;
  onChange: (next: FormConfig) => void;
  disabled?: boolean;
}) {
  const resolved = resolveForm(sections, value);

  const setSection = (key: string, on: boolean) =>
    onChange({ ...value, sections: { ...(value.sections ?? {}), [key]: on } });
  const setField = (key: string, mode: FieldMode) =>
    onChange({ ...value, fields: { ...(value.fields ?? {}), [key]: mode } });

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      {sections.map((sec) => {
        const on = resolved.sections[sec.key];
        const lockedOnly = sec.fields.every((f) => f.locked);
        const hasLocked = sec.fields.some((f) => f.locked);
        const shown = sec.fields.filter((f) => resolved.fields[f.key] !== "hidden").length;
        return (
          <section key={sec.key} className={cn("overflow-hidden rounded-xl border bg-white transition-colors", on ? "border-border" : "border-dashed border-input bg-muted/30")}>
            <header className="flex items-start gap-3 px-4 py-3.5">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-[13.5px] font-semibold">
                  {sec.label}
                  <span className="rounded-full bg-muted px-1.5 py-px text-[11px] font-normal tabular-nums text-muted-foreground">
                    {shown}/{sec.fields.length} shown
                  </span>
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">{sec.description}</p>
              </div>
              {!hasLocked && !lockedOnly ? (
                <Switch
                  checked={on}
                  disabled={disabled}
                  onCheckedChange={(v) => setSection(sec.key, v)}
                  aria-label={`Show ${sec.label} section`}
                />
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700">
                  <Lock className="size-3" /> Always on
                </span>
              )}
            </header>
            <ul className={cn("divide-y divide-border/70 border-t border-border/70", !on && "pointer-events-none opacity-50")}>
              {sec.fields.map((f) => {
                const mode = resolved.fields[f.key];
                return (
                  <li key={f.key} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-muted-foreground">
                      {f.locked ? <Lock className="size-3.5" /> : mode === "hidden" ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5 text-primary" />}
                    </span>
                    <span className={cn("min-w-0 flex-1 truncate text-[13px]", mode === "hidden" && "text-muted-foreground")}>{f.label}</span>
                    {f.locked ? (
                      <span className="text-[12px] text-muted-foreground">Always required</span>
                    ) : (
                      <div role="radiogroup" aria-label={`${f.label} visibility`} className="inline-flex shrink-0 rounded-[8px] bg-muted p-0.5">
                        {MODES.map((m) => {
                          const active = mode === m.value;
                          return (
                            <button
                              key={m.value}
                              type="button"
                              role="radio"
                              aria-checked={active}
                              disabled={disabled}
                              onClick={() => setField(f.key, m.value)}
                              className={cn(
                                "rounded-[6px] px-2 py-1 text-[11.5px] font-medium transition-colors",
                                active
                                  ? m.value === "required"
                                    ? "bg-primary text-white shadow-[var(--shadow-sm)]"
                                    : "bg-white text-foreground shadow-[var(--shadow-sm)]"
                                  : "text-muted-foreground hover:text-foreground",
                              )}
                            >
                              {m.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
