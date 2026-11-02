"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import { BdButton, BdPage, BdPageHeader } from "@/components/bd";
import { FormLayoutEditor } from "@/components/settings/FormLayoutEditor";
import { LEAD_FORM_SECTIONS, type FormConfig } from "@/lib/lead-form";

export default function LeadFormSettingsPage() {
  const [config, setConfig] = useState<FormConfig>({});
  const [saved, setSaved] = useState<FormConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/lead-form", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setConfig(d.config ?? {});
        setSaved(d.config ?? {});
      })
      .catch(() => toast.error("Couldn't load the form layout"))
      .finally(() => setLoading(false));
  }, []);

  const dirty = useMemo(() => JSON.stringify(config) !== JSON.stringify(saved), [config, saved]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/lead-form", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setConfig(d.config);
      setSaved(d.config);
      toast.success("Lead form updated", { description: "Your team sees the new layout next time they add a lead." });
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't save");
    } finally {
      setSaving(false);
    }
  };

  return (
    <BdPage>
      <BdPageHeader
        eyebrow="Settings"
        title="Lead form fields"
        description="Choose what your team fills in when they add a lead. Hide what you don't use, and make the important fields mandatory."
        actions={
          <>
            <Link href="/leads/new" target="_blank" className="bd-btn-light">
              Preview form <ArrowUpRight className="size-3.5" />
            </Link>
            <BdButton variant="ghost" disabled={!dirty || saving} onClick={() => setConfig(saved)}>
              <RotateCcw className="size-3.5" /> Discard
            </BdButton>
            <BdButton disabled={!dirty || saving} onClick={save}>
              {saving ? "Saving…" : "Save layout"}
            </BdButton>
          </>
        }
      />
      {loading ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-64 animate-pulse rounded-xl bg-muted/70" />
          ))}
        </div>
      ) : (
        <FormLayoutEditor sections={LEAD_FORM_SECTIONS} value={config} onChange={setConfig} />
      )}
    </BdPage>
  );
}
