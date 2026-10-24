"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BdButton, BdField, BdInput } from "@/components/bd";
import { CallLogDialog } from "@/components/leads/dialogs/ActionDialogs";
import { api } from "@/components/leads/ui/primitives";
import { ActivityList, useActivities } from "./TimelineTab";
import type { TabCtx } from "../types";

export type Channel = "email" | "call" | "sms" | "whatsapp";

const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};

const META: Record<Channel, { title: string; type: string; empty: string; send: string }> = {
  email: { title: "E-Mail", type: "email_sent", empty: "No e-mails logged for this lead.", send: "Open E-Mail & Log" },
  call: { title: "Call", type: "call_made", empty: "No calls logged for this lead.", send: "Log Call" },
  sms: { title: "SMS", type: "sms_sent", empty: "No SMS logged for this lead.", send: "Open SMS & Log" },
  whatsapp: { title: "WhatsApp", type: "whatsapp_sent", empty: "No WhatsApp messages logged for this lead.", send: "Open WhatsApp & Log" },
};

/** Per-channel history plus a composer. Nothing is sent from the server - the native app opens and the touch point is logged. */
export function ChannelTab({ ctx, channel }: { ctx: TabCtx; channel: Channel }) {
  const { lead } = ctx;
  const m = META[channel];
  const { rows, reload } = useActivities(lead._id, channel);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const phone = lead.contact.primaryPhone;
  const email = lead.contact.email;

  const compose = async () => {
    if (channel === "email" && !email) return toast.error("This lead has no e-mail address. Add one in Contact Information.");
    if (!body.trim() && channel !== "email") return toast.error("Write a message first.");
    let href = "";
    if (channel === "whatsapp") href = `https://wa.me/${waNumber(phone)}?text=${encodeURIComponent(body)}`;
    if (channel === "sms") href = `sms:${phone}?body=${encodeURIComponent(body)}`;
    if (channel === "email") href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setBusy(true);
    try {
      await api(`/api/leads/${lead._id}/activities`, {
        method: "POST",
        json: {
          type: m.type,
          channel,
          direction: "outbound",
          description: channel === "email" ? `${subject || "(no subject)"}${body ? ` - ${body}` : ""}` : body,
        },
      });
      setSubject("");
      setBody("");
      reload();
      ctx.reload();
      if (href) window.open(href, channel === "whatsapp" ? "_blank" : "_self", "noopener");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not log activity");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-[3px] border border-[#e6e9f2] bg-white">
      <header className="border-b border-[#eef0f6] px-5 py-3.5">
        <h3 className="text-[16px] font-semibold text-[#2b2f3a]">{m.title}</h3>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[#6b7186]">
          {channel === "call" ? `${phone}` : channel === "email" ? (email ?? "No e-mail on file") : phone}
        </p>
      </header>
      <div className="space-y-4 p-5">
        {channel === "call" ? (
          <div className="flex flex-wrap gap-2">
            <a href={`tel:${phone}`} className="bd-btn inline-flex items-center">
              Call {phone}
            </a>
            <BdButton variant="light" onClick={() => setCallOpen(true)}>
              Log Call
            </BdButton>
          </div>
        ) : (
          <div className="space-y-3 rounded-[3px] bg-[#f6f8fd] p-4">
            {channel === "email" ? (
              <BdField label="Subject">
                <BdInput value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" />
              </BdField>
            ) : null}
            <BdField label="Message">
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="bd-input !h-auto py-2"
                placeholder={`Write your ${m.title} message`}
              />
            </BdField>
            <BdButton onClick={compose} disabled={busy}>
              {busy ? "Please wait…" : m.send}
            </BdButton>
          </div>
        )}
        <ActivityList rows={rows} empty={m.empty} />
      </div>
      <CallLogDialog
        open={callOpen}
        onClose={() => setCallOpen(false)}
        leadId={lead._id}
        leadName={lead.contact.name}
        phone={phone}
        onDone={() => {
          reload();
          ctx.reload();
        }}
      />
    </div>
  );
}
