"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { BdPage, BdPageHeader, BdCard, BdInput, BdSelect, BdButton } from "@/components/bd";
import { BdSearchSelect } from "@/components/bd/BdSearchSelect";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { CATEGORY_OPTIONS, useLeadOptions } from "@/components/leads/types";
import { Combobox, MultiCombobox } from "@/components/ui/combobox";
import { LEAD_FORM_SECTIONS, resolveForm, type FormConfig } from "@/lib/lead-form";
import { DateField as UiDateField } from "@/components/ui/date-field";

const COUNTRY_CODES = [
  { code: "91", label: "91 (IN)" },
  { code: "971", label: "971 (AE)" },
  { code: "1", label: "1 (US)" },
  { code: "44", label: "44 (GB)" },
  { code: "65", label: "65 (SG)" },
  { code: "61", label: "61 (AU)" },
  { code: "966", label: "966 (SA)" },
  { code: "974", label: "974 (QA)" },
  { code: "968", label: "968 (OM)" },
  { code: "965", label: "965 (KW)" },
  { code: "973", label: "973 (BH)" },
  { code: "64", label: "64 (NZ)" },
  { code: "49", label: "49 (DE)" },
];

const COUNTRIES = ["India", "United Arab Emirates", "United States", "United Kingdom", "Singapore", "Australia", "Saudi Arabia", "Qatar", "Oman", "Kuwait", "Bahrain", "Canada", "Germany", "New Zealand", "Other"];

const VISITOR_TYPES = ["Walk-in", "Telephonic", "Online Enquiry", "Site Visit", "Channel Partner", "Referral", "Existing Customer"];

const today = () => {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function DateField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <UiDateField value={value} onChange={onChange} placeholder={placeholder ?? "Select Date"} clearable />;
}

function PhoneField({
  cc,
  onCc,
  value,
  onChange,
  placeholder,
}: {
  cc: string;
  onCc: (v: string) => void;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <div className="flex gap-3">
      <Combobox
        value={cc}
        onChange={(v) => onCc(v || cc)}
        options={COUNTRY_CODES.map((c) => ({ value: c.code, label: c.label }))}
        className="w-[150px] shrink-0"
      />
      <BdInput
        inputMode="tel"
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/[^\d]/g, ""))}
        placeholder={placeholder}
      />
    </div>
  );
}

export default function NewLeadPage() {
  const router = useRouter();
  const { user } = useAuth();
  const opts = useLeadOptions();
  const { users } = useDirectory();

  const [date, setDate] = useState(today());
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [cc1, setCc1] = useState("91");
  const [phone, setPhone] = useState("");
  const [cc2, setCc2] = useState("91");
  const [phone2, setPhone2] = useState("");
  const [alternates, setAlternates] = useState("");
  const [visitorType, setVisitorType] = useState("");
  const [stage, setStage] = useState("");
  const [category, setCategory] = useState("");
  const [brokerId, setBrokerId] = useState("");
  const [sourcingManagerId, setSourcingManagerId] = useState("");
  const [source, setSource] = useState("");
  const [preSalesAgentId, setPreSalesAgentId] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [coOwners, setCoOwners] = useState<string[]>([]);
  const [address, setAddress] = useState("");
  const [country, setCountry] = useState("");
  const [dob, setDob] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [isRelated, setIsRelated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [contactLabel, setContactLabel] = useState("");
  const [contactId, setContactId] = useState("");
  const [layout, setLayout] = useState(() => resolveForm(LEAD_FORM_SECTIONS, null).fields);
  const [categories, setCategories] = useState<string[]>([]);
  const [masterTags, setMasterTags] = useState<string[]>([]);

  /* Workspace form layout (Settings → Lead form fields) and Masters pick-lists. */
  useEffect(() => {
    fetch("/api/lead-form", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setLayout(resolveForm(LEAD_FORM_SECTIONS, d.config as FormConfig).fields))
      .catch(() => undefined);
    fetch("/api/masters?type=lead_category,lead_tags", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const items = (d.items ?? []) as Array<{ type: string; name: string }>;
        setCategories(items.filter((i) => i.type === "lead_category").map((i) => i.name));
        setMasterTags(items.filter((i) => i.type === "lead_tags").map((i) => i.name));
      })
      .catch(() => undefined);
  }, []);
  const show = (k: string) => layout[k] !== "hidden";
  const req = (k: string) => layout[k] === "required";

  useEffect(() => {
    if (user && !assignedTo) setAssignedTo(user.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const agents = useMemo(
    () =>
      users
        .filter((u) => u.status !== "suspended")
        .map((u) => ({
          value: u._id,
          label: `${u.name} ( ${ROLE_LABELS[(u.role ?? "viewer") as Role] ?? u.role} )`,
        })),
    [users],
  );

  const searchContacts = useCallback(async (q: string) => {
    const r = await fetch(`/api/contacts?q=${encodeURIComponent(q)}&limit=20`, { cache: "no-store" });
    const d = await r.json();
    return ((d.contacts ?? []) as Array<{ _id: string; contact?: { name?: string; primaryPhone?: string } }>).map((c) => ({
      value: c._id,
      label: `${c.contact?.name ?? "Contact"} - ${c.contact?.primaryPhone ?? ""}`,
    }));
  }, []);

  /** Picking an existing contact prefills the form from it. */
  async function pickContact(id: string, label?: string) {
    setContactId(id);
    setContactLabel(label ?? "");
    if (!id) return;
    const r = await fetch(`/api/leads/${id}`, { cache: "no-store" });
    const d = await r.json();
    const l = d.lead;
    if (!l) return;
    setFirstName(l.contact?.firstName ?? l.contact?.name?.split(" ")[0] ?? "");
    setLastName(l.contact?.lastName ?? l.contact?.name?.split(" ").slice(1).join(" ") ?? "");
    setEmail(l.contact?.email ?? "");
    const num = String(l.contact?.primaryPhone ?? "").replace(/\D/g, "");
    setPhone(num.length > 10 ? num.slice(-10) : num);
    if (l.country) setCountry(l.country);
  }

  function addTag(raw: string) {
    const t = raw.trim();
    if (t && !tags.includes(t)) setTags((x) => [...x, t]);
    setTagInput("");
  }

  async function save() {
    if (!firstName.trim()) return toast.error("First name is required.");
    if (phone.length < 6) return toast.error("Primary phone is required.");
    const filled: Record<string, boolean> = {
      date: !!date,
      lastName: !!lastName.trim(),
      email: !!email.trim(),
      secondaryPhone: !!phone2,
      alternateNumbers: !!alternates.trim(),
      source: !!source,
      stage: !!stage,
      category: !!category,
      visitorType: !!visitorType,
      channelPartner: !!brokerId,
      tags: tags.length > 0,
      salesAgent: !!assignedTo,
      preSalesAgent: !!preSalesAgentId,
      sourcingManager: !!sourcingManagerId,
      coOwner: coOwners.length > 0,
      address: !!address.trim(),
      country: !!country,
      dob: !!dob,
      anniversary: !!anniversary,
    };
    const missing = LEAD_FORM_SECTIONS.flatMap((sec) => sec.fields).find((f) => req(f.key) && f.key in filled && !filled[f.key]);
    if (missing) return toast.error(`${missing.label} is required.`);
    setSaving(true);
    try {
      const alt = alternates
        .split(/[,\s]+/)
        .map((s) => s.replace(/[^\d+]/g, ""))
        .filter(Boolean);
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          contact: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            primaryPhone: `+${cc1}${phone}`,
            altPhone: phone2 ? `+${cc2}${phone2}` : undefined,
            email: email.trim() || undefined,
          },
          alternateNumbers: alt,
          visitorType: visitorType || undefined,
          stage: stage || undefined,
          category: category || undefined,
          brokerId: brokerId || undefined,
          sourcingManagerId: sourcingManagerId || undefined,
          source: source || undefined,
          preSalesAgentId: preSalesAgentId || undefined,
          assignedTo: assignedTo || undefined,
          coOwners,
          address: address.trim() || undefined,
          country: country || undefined,
          dateOfBirth: dob || undefined,
          dateOfAnniversary: anniversary || undefined,
          tags,
          isRelatedSource: isRelated,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Could not create lead");
      toast.success("Lead created");
      router.push(`/leads?open=${d.lead._id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create lead");
    } finally {
      setSaving(false);
    }
  }

  const stageOptions = opts.stages.map((s) => ({ value: s.key, label: s.label }));
  const categoryOptions = (categories.length ? categories : CATEGORY_OPTIONS).map((c) => ({ value: c, label: c }));
  const tagPool = [...new Set([...masterTags, ...opts.tags])];
  const suggestedTags = tagPool.filter((t) => !tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase())).slice(0, 8);

  /** A configured field: hidden fields render nothing; required ones get an asterisk. */
  const F = (key: string, label: string, node: React.ReactNode, className?: string) =>
    show(key) ? (
      <div className={className}>
        <label className="bd-label">
          {label}
          {req(key) ? <span className="ml-0.5 text-destructive">*</span> : null}
        </label>
        {node}
      </div>
    ) : null;
  const sectionOn = (key: string) => LEAD_FORM_SECTIONS.find((s) => s.key === key)!.fields.some((f) => show(f.key));

  return (
    <BdPage className="max-w-[1200px]">
      <BdPageHeader
        eyebrow="Leads"
        title="New lead"
        description="Fields marked * are required. Start typing a contact's name to fill in their details."
        actions={
          <BdSearchSelect
            className="w-[300px] sm:w-[380px]"
            placeholder="Search existing contacts…"
            value={contactId}
            selectedLabel={contactLabel}
            onSearch={searchContacts}
            onChange={(v, o) => void pickContact(v, o?.label)}
          />
        }
      />

      {sectionOn("contact") ? (
        <BdCard title="Contact details" description="Who the enquiry is from.">
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
            {F("firstName", "First name", <BdInput autoFocus value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First name" />)}
            {F("lastName", "Last name", <BdInput value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last name" />)}
            {F("date", "Enquiry date", <DateField value={date} onChange={setDate} />)}
            {F("primaryPhone", "Primary phone", <PhoneField cc={cc1} onCc={setCc1} value={phone} onChange={setPhone} placeholder="98765 43210" />)}
            {F("secondaryPhone", "Secondary phone", <PhoneField cc={cc2} onCc={setCc2} value={phone2} onChange={setPhone2} placeholder="Optional" />)}
            {F("email", "Email", <BdInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@email.com" />)}
            {F(
              "alternateNumbers",
              "Alternate numbers",
              <BdInput value={alternates} onChange={(e) => setAlternates(e.target.value)} placeholder="Comma separated, e.g. 9767654343, 9876543210" />,
              "md:col-span-2",
            )}
          </div>
        </BdCard>
      ) : null}

      {sectionOn("lead") ? (
        <BdCard title="Lead details" description="How the lead is classified and where it came from.">
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
            {F("source", "Source", <BdSelect value={source} onChange={setSource} placeholder="Select source" options={opts.sources} />)}
            {F("stage", "Lead stage", <BdSelect value={stage} onChange={setStage} placeholder="Select stage" options={stageOptions} />)}
            {F("category", "Lead category", <BdSelect value={category} onChange={setCategory} placeholder="Select category" options={categoryOptions} />)}
            {F(
              "visitorType",
              "Type of visitor",
              <BdSelect value={visitorType} onChange={setVisitorType} placeholder="Select type" options={VISITOR_TYPES.map((v) => ({ value: v, label: v }))} />,
            )}
            {F(
              "channelPartner",
              "Channel partner",
              <>
                <BdSearchSelect
                  value={brokerId}
                  onChange={setBrokerId}
                  placeholder="Search channel partners…"
                  options={opts.brokers.map((b) => ({
                    value: b._id,
                    label: `${b.name}${b.firmName ? ` - ${b.firmName}` : ""}${b.phone ? ` (${b.phone})` : ""}`,
                  }))}
                />
                <Link href="/brokers?new=1" target="_blank" className="mt-1 inline-block text-[12px] font-medium text-primary hover:underline">
                  + Add a new channel partner
                </Link>
              </>,
            )}
            {F(
              "relatedSource",
              "Is related source?",
              <div role="radiogroup" aria-label="Is related source" className="inline-flex rounded-[9px] bg-muted p-1">
                {[
                  { v: true, label: "Yes" },
                  { v: false, label: "No" },
                ].map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    role="radio"
                    aria-checked={isRelated === o.v}
                    onClick={() => setIsRelated(o.v)}
                    className={`rounded-[7px] px-3.5 py-1 text-[13px] font-medium transition-colors ${
                      isRelated === o.v ? "bg-card text-foreground shadow-[var(--shadow-sm)]" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>,
            )}
            {F(
              "tags",
              "Tags",
              <>
                <div className="flex min-h-9 flex-wrap items-center gap-1.5 rounded-[8px] border border-input bg-card px-2 py-1 shadow-[var(--shadow-xs)] focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/15">
                  {tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 rounded-md bg-primary-50 py-0.5 pl-2 pr-1 text-[12.5px] text-primary-700 ring-1 ring-primary/15">
                      {t}
                      <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags((x) => x.filter((y) => y !== t))} className="rounded p-0.5 hover:bg-primary/10">
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag(tagInput);
                      } else if (e.key === "Backspace" && !tagInput && tags.length) {
                        setTags((x) => x.slice(0, -1));
                      }
                    }}
                    placeholder={tags.length ? "" : "Type a tag and press Enter"}
                    className="h-7 min-w-[140px] flex-1 bg-transparent px-1 text-[13px] outline-none placeholder:text-muted-foreground"
                  />
                </div>
                {suggestedTags.length ? (
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {suggestedTags.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => addTag(t)}
                        className="rounded-md border border-dashed border-input px-2 py-0.5 text-[12px] text-muted-foreground hover:border-primary/40 hover:text-primary"
                      >
                        + {t}
                      </button>
                    ))}
                  </div>
                ) : null}
              </>,
              "md:col-span-2 xl:col-span-3",
            )}
          </div>
        </BdCard>
      ) : null}

      {sectionOn("assignment") ? (
        <BdCard title="Assignment" description="Who works this lead.">
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
            {F("salesAgent", "Sales agent", <BdSelect value={assignedTo} onChange={setAssignedTo} placeholder="Select sales agent" options={agents} />)}
            {F("preSalesAgent", "Pre-sales agent", <BdSelect value={preSalesAgentId} onChange={setPreSalesAgentId} placeholder="Select pre-sales agent" options={agents} />)}
            {F("sourcingManager", "Sourcing manager", <BdSelect value={sourcingManagerId} onChange={setSourcingManagerId} placeholder="Select sourcing manager" options={agents} />)}
            {F(
              "coOwner",
              "Co-owners",
              <MultiCombobox
                value={coOwners}
                onChange={setCoOwners}
                options={agents.filter((a) => a.value !== assignedTo)}
                placeholder="Add co-owners"
              />,
            )}
          </div>
        </BdCard>
      ) : null}

      {sectionOn("personal") ? (
        <BdCard title="Personal" description="Extra details for relationship building.">
          <div className="grid gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
            {F("address", "Address", <BdInput value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" />)}
            {F("country", "Country", <BdSelect value={country} onChange={setCountry} placeholder="Select country" options={COUNTRIES.map((c) => ({ value: c, label: c }))} />)}
            {F("dob", "Date of birth", <DateField value={dob} onChange={setDob} />)}
            {F("anniversary", "Date of anniversary", <DateField value={anniversary} onChange={setAnniversary} />)}
          </div>
        </BdCard>
      ) : null}

      <div className="sticky bottom-0 z-10 -mx-4 flex items-center gap-3 border-t border-border bg-white/90 px-4 py-3 backdrop-blur-md sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <BdButton onClick={save} disabled={saving} className="!px-6">
          {saving ? "Saving…" : "Create lead"}
        </BdButton>
        <BdButton variant="light" onClick={() => router.push("/leads")}>
          Cancel
        </BdButton>
        {user?.role === "owner" || user?.permissions?.includes("settings.manage") ? (
          <Link href="/settings/lead-form" className="ml-auto text-[12.5px] text-muted-foreground hover:text-primary">
            Customise this form
          </Link>
        ) : null}
      </div>
    </BdPage>
  );
}
