"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Building2, Check, LogOut, Minus, Plus, Sparkles, UserRound } from "lucide-react";
import { Combobox } from "@/components/ui/combobox";
import { DateField } from "@/components/ui/date-field";
import { BrandMark } from "@/components/layout/Sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { resolveForm, type FieldMode } from "@/lib/lead-form";
import { DEFAULT_RECEPTION, RECEPTION_SECTIONS, type ReceptionConfig } from "@/lib/reception-config";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { cn } from "@/lib/utils";

/* Mobile number first: it finds returning visitors before we ask anything else. */
const STEP_ORDER = ["contact", "personal", "location", "preference", "assignment", "finalize"] as const;
const STEP_TITLE: Record<string, { title: string; sub: string }> = {
  contact: { title: "Let's start with your mobile number", sub: "We'll use it to share project details with you." },
  personal: { title: "What's your name?", sub: "So our team can greet you properly." },
  location: { title: "Where do you stay?", sub: "Helps us suggest what's convenient for you." },
  preference: { title: "What are you looking for?", sub: "Pick what fits — you can change it later with our team." },
  assignment: { title: "Who will assist the visitor?", sub: "They'll get a task the moment you check in." },
  finalize: { title: "Almost done", sub: "Just a couple of last details." },
};
const DEFAULT_CONFIGS = ["1 BHK", "2 BHK", "3 BHK", "4 BHK", "Office", "Shop"];
const DEFAULT_BUDGETS = ["Under 50 L", "50 L – 1 Cr", "1 – 2 Cr", "2 – 5 Cr", "5 Cr +"];
const DIAL = ["+91", "+971", "+1", "+44", "+65", "+61", "+974", "+966"];

interface Opt {
  _id: string;
  name: string;
  role?: string;
  status?: string;
}
interface SourceOpt {
  key: string;
  label: string;
  isActive?: boolean;
}
interface Broker {
  _id: string;
  name: string;
  firmName?: string;
}

type Form = Record<string, string>;
const EMPTY: Form = { dial: "+91", visitorCount: "1" };

export default function ReceptionKiosk() {
  const { workspace } = useAuth();
  const [config, setConfig] = useState<ReceptionConfig>(DEFAULT_RECEPTION);
  const [projects, setProjects] = useState<Opt[]>([]);
  const [users, setUsers] = useState<Opt[]>([]);
  const [sources, setSources] = useState<SourceOpt[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [ready, setReady] = useState(false);

  const [stage, setStage] = useState<"welcome" | "form" | "done">("welcome");
  const [stepIdx, setStepIdx] = useState(0);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [returning, setReturning] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ name: string; assigned: Array<{ role: string; name?: string }>; returning: boolean } | null>(null);
  const [countdown, setCountdown] = useState(0);
  const lookedUp = useRef("");

  useEffect(() => {
    document.body.classList.add("bd-app");
    return () => document.body.classList.remove("bd-app");
  }, []);

  useEffect(() => {
    Promise.all([
      fetch("/api/reception/config", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/projects?limit=200", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/users", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/sources", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/brokers?limit=500&status=all", { cache: "no-store" }).then((r) => (r.ok ? r.json() : { brokers: [] })),
    ])
      .then(([c, p, u, s, b]) => {
        setConfig(c.config ?? DEFAULT_RECEPTION);
        setProjects(p.projects ?? []);
        setUsers((u.users ?? []).filter((x: Opt) => x.status !== "suspended"));
        setSources((s.sources ?? []).filter((x: SourceOpt) => x.isActive !== false));
        setBrokers(b.brokers ?? []);
      })
      .catch(() => toast.error("Couldn't load the reception setup. Check your connection."))
      .finally(() => setReady(true));
  }, []);

  const resolved = useMemo(() => resolveForm(RECEPTION_SECTIONS, config.form), [config.form]);
  const mode = (k: string): FieldMode => resolved.fields[k] ?? "hidden";
  const steps = useMemo(
    () =>
      STEP_ORDER.filter((k) => {
        const sec = RECEPTION_SECTIONS.find((s) => s.key === k)!;
        return resolved.sections[k] && sec.fields.some((f) => resolved.fields[f.key] !== "hidden");
      }),
    [resolved],
  );
  const step = steps[stepIdx];
  const desk = config.projects.find((d) => d.projectId === form.projectId);
  const set = (k: string) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: "" }));
  };

  const reset = useCallback(() => {
    setForm(EMPTY);
    setErrors({});
    setReturning(null);
    setResult(null);
    setStepIdx(0);
    lookedUp.current = "";
    setStage("welcome");
  }, []);

  /* Thank-you screen counts down to the next visitor. */
  useEffect(() => {
    if (stage !== "done") return;
    setCountdown(config.options.resetSeconds);
    const t = setInterval(() => setCountdown((c) => (c <= 1 ? 0 : c - 1)), 1000);
    return () => clearInterval(t);
  }, [stage, config.options.resetSeconds]);
  useEffect(() => {
    if (stage === "done" && countdown === 0 && result) reset();
  }, [countdown, stage, result, reset]);

  const lookup = async (digits: string) => {
    if (!config.options.welcomeBack || digits.length < 10 || lookedUp.current === digits) return;
    lookedUp.current = digits;
    try {
      const r = await fetch(`/api/reception/lookup?phone=${encodeURIComponent(digits)}`, { cache: "no-store" });
      const d = await r.json();
      const l = d.lead as
        | { contact?: { name?: string; firstName?: string; lastName?: string; email?: string }; assignedTo?: { _id: string; name?: string } }
        | null;
      if (!l) return setReturning(null);
      const first = l.contact?.firstName || l.contact?.name?.split(" ")[0] || "";
      setReturning(first || l.contact?.name || "there");
      setForm((f) => ({
        ...f,
        firstName: f.firstName || first,
        lastName: f.lastName || l.contact?.lastName || l.contact?.name?.split(" ").slice(1).join(" ") || "",
        email: f.email || l.contact?.email || "",
        closingManagerId: f.closingManagerId || l.assignedTo?._id || "",
      }));
    } catch {
      /* lookup is a convenience only */
    }
  };

  const validate = () => {
    const sec = RECEPTION_SECTIONS.find((s) => s.key === step);
    if (!sec) return true;
    const e: Record<string, string> = {};
    const keyFor: Record<string, string> = {
      primaryPhone: "phone",
      project: "projectId",
      preSalesAgent: "preSalesAgentId",
      closingManager: "closingManagerId",
      sourcingManager: "sourcingManagerId",
      channelPartner: "brokerId",
    };
    for (const f of sec.fields) {
      if (mode(f.key) !== "required") continue;
      const k = keyFor[f.key] ?? f.key;
      if (!(form[k] ?? "").trim()) e[k] = `Please add ${f.label.toLowerCase().replace(/ \(.*\)$/, "")}`;
    }
    if (step === "contact" && (form.phone ?? "").replace(/\D/g, "").length < 7) e.phone = "Enter a valid mobile number";
    if (step === "personal" && form.email && !/^\S+@\S+\.\S+$/.test(form.email)) e.email = "That email doesn't look right";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = async () => {
    if (!validate()) return;
    if (step === "contact") await lookup((form.phone ?? "").replace(/\D/g, ""));
    if (stepIdx < steps.length - 1) {
      setStepIdx((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else submit();
  };

  const submit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/reception/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, phone: `${form.dial}${(form.phone ?? "").replace(/\D/g, "")}`, visitorCount: Number(form.visitorCount) || 1 }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setResult({ name: form.firstName, assigned: d.assigned ?? [], returning: d.returning });
      setStage("done");
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : "Couldn't check in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const agentOpts = users.map((u) => ({ value: u._id, label: u.name, hint: ROLE_LABELS[u.role as Role] }));
  const progress = steps.length ? ((stepIdx + 1) / steps.length) * 100 : 0;

  return (
    <div className="flex min-h-svh flex-col bg-gradient-to-b from-[hsl(214_100%_97%)] via-white to-white">
      {/* Top bar */}
      <header className="sticky top-0 z-20 border-b border-border/70 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4 sm:px-6">
          <BrandMark className="size-9" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[15px] font-semibold tracking-[-0.01em]">{workspace?.name ?? "Tristar Realtors"}</p>
            <p className="text-[12px] text-muted-foreground">Reception</p>
          </div>
          {stage === "form" ? (
            <span className="text-[12.5px] tabular-nums text-muted-foreground">
              Step {stepIdx + 1} of {steps.length}
            </span>
          ) : (
            <Link href="/dashboard" className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12.5px] text-muted-foreground hover:bg-muted hover:text-foreground">
              <LogOut className="size-3.5" /> Exit to CRM
            </Link>
          )}
        </div>
        {stage === "form" ? (
          <div className="h-1 bg-muted">
            <div className="h-full bg-primary transition-[width] duration-300" style={{ width: `${progress}%` }} />
          </div>
        ) : null}
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col px-4 py-6 sm:px-6 sm:py-10">
        {!ready ? (
          <div className="m-auto flex items-center gap-2 text-[14px] text-muted-foreground">
            <span className="size-4 animate-spin rounded-full border-2 border-primary/25 border-t-primary" /> Getting things ready…
          </div>
        ) : stage === "welcome" ? (
          <div className="ts-rise m-auto w-full max-w-xl text-center">
            <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-primary-50 text-primary ring-1 ring-primary/15">
              <Sparkles className="size-7" />
            </span>
            <h1 className="mt-6 text-[28px] font-semibold leading-tight tracking-[-0.02em] sm:text-[34px]">{config.options.welcomeTitle}</h1>
            <p className="mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground sm:text-[16px]">{config.options.welcomeMessage}</p>
            <button
              type="button"
              onClick={() => setStage("form")}
              className="bd-btn mt-8 !h-14 w-full max-w-sm !rounded-2xl !text-[16px] sm:w-auto sm:!px-10"
            >
              Start check-in <ArrowRight className="size-5" />
            </button>
            <p className="mt-4 text-[12.5px] text-muted-foreground">Takes less than a minute</p>
          </div>
        ) : stage === "done" && result ? (
          <div className="ts-rise m-auto w-full max-w-lg text-center">
            <span className="mx-auto flex size-20 items-center justify-center rounded-full bg-[hsl(156_45%_94%)] text-[hsl(156_58%_30%)] ring-8 ring-[hsl(156_45%_97%)]">
              <Check className="size-10" strokeWidth={2.5} />
            </span>
            <h1 className="mt-6 text-[28px] font-semibold tracking-[-0.02em] sm:text-[32px]">
              Thank you{result.name ? `, ${result.name}` : ""}!
            </h1>
            <p className="mt-2 text-[15.5px] text-muted-foreground">
              {result.assigned.length
                ? `${result.assigned.map((a) => a.name).filter(Boolean).join(" and ")} will be with you shortly.`
                : "Our team will be with you shortly. Please have a seat."}
            </p>
            {result.assigned.length ? (
              <div className="mx-auto mt-6 max-w-sm space-y-2 text-left">
                {result.assigned.map((a) => (
                  <div key={`${a.role}-${a.name}`} className="flex items-center gap-3 rounded-2xl border border-border bg-white p-3.5 shadow-[var(--shadow-xs)]">
                    <span className="flex size-10 items-center justify-center rounded-full bg-primary-50 text-primary">
                      <UserRound className="size-5" />
                    </span>
                    <span>
                      <span className="block text-[14px] font-medium">{a.name}</span>
                      <span className="block text-[12px] text-muted-foreground">{a.role} · task assigned</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <button type="button" onClick={reset} className="bd-btn mt-8 !h-12 !rounded-xl !px-8 !text-[15px]">
              Next visitor
            </button>
            <p className="mt-3 text-[12.5px] tabular-nums text-muted-foreground">Resetting in {countdown}s</p>
          </div>
        ) : step ? (
          <div key={step} className="ts-rise flex flex-1 flex-col">
            {returning && step !== "contact" ? (
              <div className="mb-5 flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary-50/70 px-4 py-3">
                <Sparkles className="size-5 shrink-0 text-primary" />
                <p className="text-[14px]">
                  <span className="font-semibold">Welcome back, {returning}!</span>{" "}
                  <span className="text-foreground/75">We&apos;ve filled in what we already know.</span>
                </p>
              </div>
            ) : null}
            <h1 className="text-[24px] font-semibold leading-tight tracking-[-0.02em] sm:text-[28px]">{STEP_TITLE[step].title}</h1>
            <p className="mt-1.5 text-[14.5px] text-muted-foreground">{STEP_TITLE[step].sub}</p>

            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              {step === "contact" ? (
                <>
                  <Field label="Mobile number" required error={errors.phone} wide>
                    <div className="flex gap-2">
                      <Combobox value={form.dial} onChange={set("dial")} options={DIAL.map((d) => ({ value: d, label: d }))} size="lg" className="w-[104px] shrink-0" />
                      <BigInput
                        autoFocus
                        inputMode="tel"
                        value={form.phone ?? ""}
                        onChange={(v) => set("phone")(v.replace(/[^\d]/g, "").slice(0, 12))}
                        onBlur={() => lookup((form.phone ?? "").replace(/\D/g, ""))}
                        placeholder="98765 43210"
                        className="tracking-wide"
                      />
                    </div>
                  </Field>
                  {mode("secondaryPhone") !== "hidden" ? (
                    <Field label="Alternate number" required={mode("secondaryPhone") === "required"} error={errors.secondaryPhone}>
                      <BigInput inputMode="tel" value={form.secondaryPhone ?? ""} onChange={(v) => set("secondaryPhone")(v.replace(/[^\d+]/g, ""))} />
                    </Field>
                  ) : null}
                  {mode("occupation") !== "hidden" ? (
                    <Field label="Occupation" required={mode("occupation") === "required"} error={errors.occupation}>
                      <BigInput value={form.occupation ?? ""} onChange={set("occupation")} placeholder="e.g. Business, IT, Doctor" />
                    </Field>
                  ) : null}
                  {mode("address") !== "hidden" ? (
                    <Field label="Address" required={mode("address") === "required"} error={errors.address} wide>
                      <BigInput value={form.address ?? ""} onChange={set("address")} />
                    </Field>
                  ) : null}
                </>
              ) : null}

              {step === "personal" ? (
                <>
                  <Field label="First name" required error={errors.firstName}>
                    <BigInput autoFocus value={form.firstName ?? ""} onChange={set("firstName")} autoComplete="given-name" />
                  </Field>
                  {mode("lastName") !== "hidden" ? (
                    <Field label="Last name" required={mode("lastName") === "required"} error={errors.lastName}>
                      <BigInput value={form.lastName ?? ""} onChange={set("lastName")} autoComplete="family-name" />
                    </Field>
                  ) : null}
                  {mode("email") !== "hidden" ? (
                    <Field label="Email" required={mode("email") === "required"} error={errors.email}>
                      <BigInput inputMode="email" value={form.email ?? ""} onChange={set("email")} placeholder="name@email.com" autoComplete="email" />
                    </Field>
                  ) : null}
                  {mode("dob") !== "hidden" ? (
                    <Field label="Date of birth" required={mode("dob") === "required"} error={errors.dob}>
                      <DateField value={form.dob ?? ""} onChange={set("dob")} className="[&_button]:!h-12 [&_button]:!text-[15px]" />
                    </Field>
                  ) : null}
                </>
              ) : null}

              {step === "location" ? (
                <>
                  {mode("city") !== "hidden" ? (
                    <Field label="City" required={mode("city") === "required"} error={errors.city}>
                      <BigInput autoFocus value={form.city ?? ""} onChange={set("city")} placeholder="e.g. Pune" />
                    </Field>
                  ) : null}
                  {mode("locality") !== "hidden" ? (
                    <Field label="Locality" required={mode("locality") === "required"} error={errors.locality}>
                      <BigInput value={form.locality ?? ""} onChange={set("locality")} placeholder="e.g. Baner" />
                    </Field>
                  ) : null}
                  {mode("pincode") !== "hidden" ? (
                    <Field label="Pincode" required={mode("pincode") === "required"} error={errors.pincode}>
                      <BigInput inputMode="numeric" value={form.pincode ?? ""} onChange={(v) => set("pincode")(v.replace(/\D/g, "").slice(0, 6))} />
                    </Field>
                  ) : null}
                </>
              ) : null}

              {step === "preference" ? (
                <>
                  {mode("project") !== "hidden" ? (
                    <Field label="Which project are you here for?" required={mode("project") === "required"} error={errors.projectId} wide>
                      <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                        {projects.map((p) => {
                          const on = form.projectId === p._id;
                          return (
                            <button
                              key={p._id}
                              type="button"
                              onClick={() => {
                                set("projectId")(on ? "" : p._id);
                                const d = config.projects.find((x) => x.projectId === p._id);
                                if (!on && d?.agentId && !form.closingManagerId) setForm((f) => ({ ...f, projectId: p._id, closingManagerId: d.agentId! }));
                              }}
                              aria-pressed={on}
                              className={cn(
                                "flex items-center gap-3 rounded-2xl border bg-white p-3.5 text-left transition-[border-color,box-shadow,background-color]",
                                on ? "border-primary bg-primary-50/60 ring-[3px] ring-primary/15" : "border-border hover:border-primary/40",
                              )}
                            >
                              <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", on ? "bg-primary text-white" : "bg-muted text-muted-foreground")}>
                                <Building2 className="size-5" />
                              </span>
                              <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{p.name}</span>
                              {on ? <Check className="size-5 shrink-0 text-primary" /> : null}
                            </button>
                          );
                        })}
                      </div>
                    </Field>
                  ) : null}
                  {mode("configuration") !== "hidden" ? (
                    <Field label="Configuration" required={mode("configuration") === "required"} error={errors.configuration} wide>
                      <Chips options={desk?.configurations.length ? desk.configurations : DEFAULT_CONFIGS} value={form.configuration ?? ""} onChange={set("configuration")} />
                    </Field>
                  ) : null}
                  {mode("budget") !== "hidden" ? (
                    <Field label="Budget" required={mode("budget") === "required"} error={errors.budget} wide>
                      <Chips options={desk?.budgets.length ? desk.budgets : DEFAULT_BUDGETS} value={form.budget ?? ""} onChange={set("budget")} />
                    </Field>
                  ) : null}
                  {mode("purpose") !== "hidden" ? (
                    <Field label="Purpose" required={mode("purpose") === "required"} error={errors.purpose} wide>
                      <Chips options={config.purposes} value={form.purpose ?? ""} onChange={set("purpose")} />
                    </Field>
                  ) : null}
                  {mode("timeline") !== "hidden" ? (
                    <Field label="When are you planning to buy?" required={mode("timeline") === "required"} error={errors.timeline} wide>
                      <Chips options={config.timelines} value={form.timeline ?? ""} onChange={set("timeline")} />
                    </Field>
                  ) : null}
                </>
              ) : null}

              {step === "assignment" ? (
                <>
                  {mode("closingManager") !== "hidden" ? (
                    <Field label="Closing manager" required={mode("closingManager") === "required"} error={errors.closingManagerId} hint={desk?.agentId && form.closingManagerId === desk.agentId ? "Default for this project" : undefined}>
                      <Combobox value={form.closingManagerId ?? ""} onChange={set("closingManagerId")} options={agentOpts} placeholder="Select person" size="lg" clearable searchable />
                    </Field>
                  ) : null}
                  {mode("preSalesAgent") !== "hidden" ? (
                    <Field label="Pre-sales agent" required={mode("preSalesAgent") === "required"} error={errors.preSalesAgentId}>
                      <Combobox value={form.preSalesAgentId ?? ""} onChange={set("preSalesAgentId")} options={agentOpts} placeholder="Select person" size="lg" clearable searchable />
                    </Field>
                  ) : null}
                  {mode("sourcingManager") !== "hidden" ? (
                    <Field label="Sourcing manager" required={mode("sourcingManager") === "required"} error={errors.sourcingManagerId}>
                      <Combobox value={form.sourcingManagerId ?? ""} onChange={set("sourcingManagerId")} options={agentOpts} placeholder="Select person" size="lg" clearable searchable />
                    </Field>
                  ) : null}
                  <p className="text-[12.5px] text-muted-foreground sm:col-span-2">
                    Each person you choose gets a “Meet at reception” task with the visitor&apos;s details right away.
                  </p>
                </>
              ) : null}

              {step === "finalize" ? (
                <>
                  {mode("source") !== "hidden" ? (
                    <Field label="How did you hear about us?" required={mode("source") === "required"} error={errors.source} wide>
                      <Chips options={sources.map((s) => s.label)} value={sources.find((s) => s.key === form.source)?.label ?? ""} onChange={(label) => set("source")(sources.find((s) => s.label === label)?.key ?? "")} />
                    </Field>
                  ) : null}
                  {mode("channelPartner") !== "hidden" ? (
                    <Field label="Came with a channel partner?" required={mode("channelPartner") === "required"} error={errors.brokerId}>
                      <Combobox
                        value={form.brokerId ?? ""}
                        onChange={set("brokerId")}
                        options={brokers.map((b) => ({ value: b._id, label: b.name, hint: b.firmName }))}
                        placeholder="No channel partner"
                        size="lg"
                        clearable
                        searchable
                      />
                    </Field>
                  ) : null}
                  {mode("visitorCount") !== "hidden" ? (
                    <Field label="Number of visitors" required={mode("visitorCount") === "required"}>
                      <Stepper value={Number(form.visitorCount) || 1} onChange={(n) => set("visitorCount")(String(n))} />
                    </Field>
                  ) : null}
                  {mode("remark") !== "hidden" ? (
                    <Field label="Anything our team should know?" required={mode("remark") === "required"} error={errors.remark} wide>
                      <textarea
                        rows={3}
                        value={form.remark ?? ""}
                        onChange={(e) => set("remark")(e.target.value)}
                        className="bd-input !min-h-24 resize-none !rounded-xl !px-4 !py-3 !text-[16px]"
                        placeholder="Optional"
                      />
                    </Field>
                  ) : null}
                </>
              ) : null}
            </div>

            {/* Footer actions */}
            <div className="sticky bottom-0 -mx-4 mt-auto flex items-center gap-3 border-t border-border/70 bg-white/90 px-4 py-4 backdrop-blur-md sm:-mx-6 sm:px-6">
              <button
                type="button"
                onClick={() => (stepIdx === 0 ? reset() : setStepIdx((i) => i - 1))}
                className="bd-btn-light !h-12 !rounded-xl !px-5 !text-[15px]"
              >
                <ArrowLeft className="size-4" /> {stepIdx === 0 ? "Cancel" : "Back"}
              </button>
              <button type="button" onClick={next} disabled={submitting} className="bd-btn !h-12 flex-1 !rounded-xl !text-[15px] sm:flex-none sm:!px-10 sm:ml-auto">
                {submitting ? "Checking in…" : stepIdx === steps.length - 1 ? "Check in" : "Continue"}
                {!submitting ? <ArrowRight className="size-4" /> : null}
              </button>
            </div>
          </div>
        ) : null}
      </main>
    </div>
  );
}

function Field({
  label,
  required,
  error,
  hint,
  wide,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-2")}>
      <label className="mb-2 block text-[14px] font-medium text-foreground/85">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : <span className="ml-1.5 text-[12px] font-normal text-muted-foreground">optional</span>}
      </label>
      <div className="[&_button[role=combobox]]:!rounded-xl">{children}</div>
      {error ? <p className="mt-1.5 text-[13px] text-destructive">{error}</p> : hint ? <p className="mt-1.5 text-[12.5px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function BigInput({
  value,
  onChange,
  className,
  ...rest
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> & { value: string; onChange: (v: string) => void }) {
  return (
    <input
      {...rest}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={cn("bd-input !h-12 !rounded-xl !px-4 !text-[16px]", className)}
    />
  );
}

function Chips({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const on = value === o;
        return (
          <button
            key={o}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(on ? "" : o)}
            className={cn(
              "inline-flex h-11 items-center gap-1.5 rounded-xl border px-4 text-[14.5px] transition-colors",
              on ? "border-primary bg-primary text-white" : "border-border bg-white text-foreground hover:border-primary/40 hover:bg-primary-50/50",
            )}
          >
            {on ? <Check className="size-4" /> : null}
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Stepper({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  const btn = "flex size-12 items-center justify-center rounded-xl border border-border bg-white text-foreground transition-colors hover:bg-muted disabled:opacity-40";
  return (
    <div className="flex items-center gap-3">
      <button type="button" aria-label="Fewer" disabled={value <= 1} onClick={() => onChange(Math.max(1, value - 1))} className={btn}>
        <Minus className="size-5" />
      </button>
      <span className="w-10 text-center text-[22px] font-semibold tabular-nums">{value}</span>
      <button type="button" aria-label="More" disabled={value >= 20} onClick={() => onChange(Math.min(20, value + 1))} className={btn}>
        <Plus className="size-5" />
      </button>
    </div>
  );
}
