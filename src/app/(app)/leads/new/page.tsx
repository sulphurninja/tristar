"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, X } from "lucide-react";
import { toast } from "sonner";
import { BdPage, BdCard, BdField, BdInput, BdSelect, BdButton } from "@/components/bd";
import { BdSearchSelect } from "@/components/bd/BdSearchSelect";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { useAuth } from "@/contexts/AuthContext";
import { ROLE_LABELS, type Role } from "@/lib/roles";
import { CATEGORY_OPTIONS, useLeadOptions } from "@/components/leads/types";

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
  const shown = value
    ? new Date(`${value}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : "";
  return (
    <div className="relative flex">
      <div className={`bd-input flex items-center ${shown ? "" : "text-[#9aa1b5]"}`}>{shown || placeholder || "Select Date"}</div>
      <span className="flex w-10 shrink-0 items-center justify-center border border-l-0 border-[#dfe3ee] bg-[#eef0f6] text-[#4a4f5c]">
        <Calendar className="size-4" />
      </span>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder ?? "Date"}
        onClick={(e) => (e.currentTarget as HTMLInputElement & { showPicker?: () => void }).showPicker?.()}
        className="absolute inset-0 cursor-pointer opacity-0"
      />
    </div>
  );
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
      <select value={cc} onChange={(e) => onCc(e.target.value)} className="bd-input !w-[150px] shrink-0">
        {COUNTRY_CODES.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>
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
    if (!firstName.trim() && !lastName.trim()) return toast.error("First Name is required.");
    if (phone.length < 6) return toast.error("Primary Phone Number is required.");
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
  const suggestedTags = opts.tags.filter((t) => !tags.includes(t) && t.toLowerCase().includes(tagInput.toLowerCase())).slice(0, 8);

  return (
    <BdPage>
      <BdCard
        title="Lead Details (New)"
        actions={
          <BdSearchSelect
            className="w-[300px] sm:w-[577px]"
            placeholder="Search & Select Contacts"
            value={contactId}
            selectedLabel={contactLabel}
            onSearch={searchContacts}
            onChange={(v, o) => void pickContact(v, o?.label)}
          />
        }
      >
        <div className="grid gap-x-8 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          <BdField label="Date">
            <DateField value={date} onChange={setDate} />
          </BdField>
          <BdField label="First Name">
            <BdInput value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="First Name" />
          </BdField>
          <BdField label="Last Name">
            <BdInput value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Last Name" />
          </BdField>

          <BdField label="Email">
            <BdInput type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
          </BdField>
          <BdField label="Primary Phone">
            <PhoneField cc={cc1} onCc={setCc1} value={phone} onChange={setPhone} placeholder="Primary Phone Number (9767654343)" />
          </BdField>
          <BdField label="Secondary Phone">
            <PhoneField cc={cc2} onCc={setCc2} value={phone2} onChange={setPhone2} placeholder="Secondary Phone Number (9999555500)" />
          </BdField>

          <BdField label="Alternate Numbers">
            <BdInput
              value={alternates}
              onChange={(e) => setAlternates(e.target.value)}
              placeholder="Phone number (9767654343,9876543210)"
            />
          </BdField>
          <BdField label="Type of Visitor">
            <BdSelect
              value={visitorType}
              onChange={setVisitorType}
              placeholder="Type of Visitor"
              options={VISITOR_TYPES.map((v) => ({ value: v, label: v }))}
            />
          </BdField>
          <BdField label="Lead Stage">
            <BdSelect value={stage} onChange={setStage} placeholder="Select Lead Stage" options={stageOptions} />
          </BdField>

          <BdField label="Lead Category">
            <BdSelect
              value={category}
              onChange={setCategory}
              placeholder="Select Lead Category"
              options={CATEGORY_OPTIONS.map((c) => ({ value: c, label: c }))}
            />
          </BdField>
          <div>
            <label className="bd-label">
              Channel Partner{" "}
              <Link href="/brokers?new=1" target="_blank" className="font-bold text-[#3a5dc2]">
                (+ Add Channel Partner )
              </Link>
            </label>
            <BdSearchSelect
              value={brokerId}
              onChange={setBrokerId}
              placeholder="Search & Select Channel Partner"
              options={opts.brokers.map((b) => ({
                value: b._id,
                label: `${b.name}${b.firmName ? ` - ${b.firmName}` : ""}${b.phone ? ` (${b.phone})` : ""}`,
              }))}
            />
          </div>
          <BdField label="Sourcing Manager">
            <BdSelect value={sourcingManagerId} onChange={setSourcingManagerId} placeholder="Select Sourcing Manager" options={agents} />
          </BdField>

          <BdField label="Source">
            <BdSelect value={source} onChange={setSource} placeholder="Select Source" options={opts.sources} />
          </BdField>
          <BdField label="Pre Sales Agent">
            <BdSelect value={preSalesAgentId} onChange={setPreSalesAgentId} placeholder="Select Pre Sales Agent" options={agents} />
          </BdField>
          <BdField label="Sales Agent">
            <BdSelect value={assignedTo} onChange={setAssignedTo} placeholder="Select Sales Agent" options={agents} />
          </BdField>

          <BdField label="Co-Owner">
            <BdSelect
              value=""
              onChange={(v) => v && !coOwners.includes(v) && setCoOwners((c) => [...c, v])}
              placeholder="Select Co-Owner"
              options={agents.filter((a) => !coOwners.includes(a.value) && a.value !== assignedTo)}
            />
            {coOwners.length ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {coOwners.map((id) => (
                  <span key={id} className="inline-flex items-center gap-1 rounded-[3px] bg-[#e4e9f8] px-2 py-1 text-[12px] text-[#2f4ca0]">
                    {agents.find((a) => a.value === id)?.label ?? id}
                    <button type="button" aria-label="Remove" onClick={() => setCoOwners((c) => c.filter((x) => x !== id))}>
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </BdField>
          <BdField label="Address">
            <BdInput value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Address" />
          </BdField>
          <BdField label="Country">
            <BdSelect
              value={country}
              onChange={setCountry}
              placeholder="Select Lead Country"
              options={COUNTRIES.map((c) => ({ value: c, label: c }))}
            />
          </BdField>

          <BdField label="Date Of Birth">
            <DateField value={dob} onChange={setDob} placeholder="Select Date" />
          </BdField>
          <BdField label="Date Of Anniversary">
            <DateField value={anniversary} onChange={setAnniversary} placeholder="Select Date" />
          </BdField>
        </div>

        <div className="mt-6 max-w-[calc(66%-1rem)] min-w-[300px]">
          <label className="bd-label">Tags</label>
          <div className="flex flex-wrap items-center gap-1.5 border-b border-[#dfe3ee] pb-1.5">
            {tags.map((t) => (
              <span key={t} className="inline-flex items-center gap-1 rounded-[3px] bg-[#e4e9f8] px-2 py-1 text-[12px] text-[#2f4ca0]">
                {t}
                <button type="button" aria-label={`Remove ${t}`} onClick={() => setTags((x) => x.filter((y) => y !== t))}>
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
              placeholder="Select Or Enter Tags"
              className="min-w-[160px] flex-1 px-2 py-1.5 text-[14px] outline-none"
            />
          </div>
          {tagInput && suggestedTags.length ? (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {suggestedTags.map((t) => (
                <button key={t} type="button" onClick={() => addTag(t)} className="rounded-[3px] border border-[#dfe3ee] px-2 py-1 text-[12px] text-[#3a5dc2] hover:bg-[#eef1fa]">
                  {t}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center gap-3 text-[14px] text-[#2b2f3a]">
          <span className="font-bold">Is Related Source ?</span>
          <label className="flex cursor-pointer items-center gap-1.5">
            Yes
            <input type="radio" name="related" checked={isRelated} onChange={() => setIsRelated(true)} className="accent-[#3a5dc2]" />
          </label>
          <label className="flex cursor-pointer items-center gap-1.5">
            No
            <input type="radio" name="related" checked={!isRelated} onChange={() => setIsRelated(false)} className="accent-[#3a5dc2]" />
          </label>
        </div>

        <div className="mt-8 flex gap-3 border-t border-[#eef0f6] pt-5">
          <BdButton onClick={save} disabled={saving} className="!px-6 !py-2.5">
            {saving ? "Saving…" : "Save"}
          </BdButton>
          <BdButton variant="light" onClick={() => router.push("/leads")} className="!px-6 !py-2.5">
            Cancel
          </BdButton>
        </div>
      </BdCard>
    </BdPage>
  );
}
