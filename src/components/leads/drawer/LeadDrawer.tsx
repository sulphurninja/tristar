"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CalendarCheck,
  ChevronsLeft,
  ChevronsRight,
  Clock,
  FileText,
  LayoutGrid,
  Lightbulb,
  Mail,
  MapPin,
  MessageCircle,
  MessageSquare,
  Phone,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { CallLogDialog, NoteDialog, TaskDialog } from "@/components/leads/dialogs/ActionDialogs";
import { EditLeadDialog } from "@/components/leads/dialogs/EditLeadDialog";
import { ChannelPartnerDialog, ConfirmDialog, UserPickDialog } from "@/components/leads/dialogs/simple";
import { api } from "@/components/leads/ui/primitives";
import { cn } from "@/lib/utils";
import { LeftPanel, type MenuAction, type QuickAction } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { SuggestionTab } from "./tabs/SuggestionTab";
import { TimelineTab } from "./tabs/TimelineTab";
import { FollowupTab } from "./tabs/FollowupTab";
import { SiteVisitTab } from "./tabs/SiteVisitTab";
import { ChannelTab } from "./tabs/ChannelTab";
import { ProjectsTab } from "./tabs/ProjectsTab";
import { DocumentsTab } from "./tabs/DocumentsTab";
import type { Detail, TabCtx } from "./types";

const TABS = [
  { key: "suggestion", label: "Suggestion", icon: Lightbulb },
  { key: "timeline", label: "Timeline", icon: Clock },
  { key: "followup", label: "Followup", icon: CalendarCheck },
  { key: "sitevisit", label: "Site Visit", icon: MapPin },
  { key: "meeting", label: "Meeting", icon: Users },
  { key: "email", label: "E-Mail", icon: Mail },
  { key: "call", label: "Call", icon: Phone },
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { key: "projects", label: "Projects", icon: LayoutGrid },
  { key: "documents", label: "Documents", icon: FileText },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const waNumber = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return d.length === 10 ? `91${d}` : d;
};

type Dlg = "note" | "call" | "task" | "transfer" | "addOwner" | "removeOwner" | "addCp" | "removeCp" | "edit" | "convert" | "delete" | null;

export function LeadDrawer({
  leadId,
  ids,
  onNavigate,
  onClose,
  onChanged,
  onDeleted,
}: {
  leadId: string | null;
  ids: string[];
  onNavigate: (id: string) => void;
  onClose: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [detail, setDetail] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<TabKey>("suggestion");
  const [dlg, setDlg] = useState<Dlg>(null);
  const seq = useRef(0);

  const load = useCallback(
    async (silent = false) => {
      if (!leadId) return;
      const my = ++seq.current;
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const d = await api<Detail>(`/api/leads/${leadId}`);
        if (my === seq.current) setDetail(d);
      } catch (e) {
        if (my === seq.current) {
          toast.error(e instanceof Error ? e.message : "Could not load lead");
          if (!silent) onClose();
        }
      } finally {
        if (my === seq.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [leadId],
  );

  useEffect(() => {
    setDetail(null);
    setDlg(null);
    if (leadId) load();
  }, [leadId, load]);

  /* Esc closes the drawer when no dialog/menu is on top. */
  useEffect(() => {
    if (!leadId) return;
    const h = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.querySelector('[role="dialog"], [role="menu"]')) return;
      onClose();
    };
    window.addEventListener("keydown", h, true);
    return () => window.removeEventListener("keydown", h, true);
  }, [leadId, onClose]);

  const patch = useCallback(
    async (body: Record<string, unknown>, okMsg?: string) => {
      if (!leadId) return false;
      try {
        const d = await api<Detail>(`/api/leads/${leadId}`, { method: "PATCH", json: body });
        setDetail(d);
        if (okMsg) toast.success(okMsg);
        onChanged();
        return true;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Could not save");
        return false;
      }
    },
    [leadId, onChanged],
  );

  if (!leadId) return null;

  const idx = ids.indexOf(leadId);
  const position = idx >= 0 ? `${idx + 1} / ${ids.length}` : "1 / 1";
  const lead = detail?.lead;
  const ctx: TabCtx | null = lead
    ? {
        lead,
        patch,
        reload: () => {
          load(true);
          onChanged();
        },
      }
    : null;

  const logTouch = async (type: string, channel: string, description: string) => {
    try {
      await api(`/api/leads/${leadId}/activities`, { method: "POST", json: { type, channel, direction: "outbound", description } });
      ctx?.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not log activity");
    }
  };

  const onQuick = (a: QuickAction) => {
    if (!lead) return;
    const phone = lead.contact.primaryPhone;
    if (a === "note") return setDlg("note");
    if (a === "task") return setDlg("task");
    if (a === "wa") {
      window.open(`https://wa.me/${waNumber(phone)}`, "_blank", "noopener");
      return void logTouch("whatsapp_sent", "whatsapp", "WhatsApp chat opened");
    }
    if (a === "sms") {
      window.open(`sms:${phone}`, "_self");
      return void logTouch("sms_sent", "sms", "SMS composer opened");
    }
    if (a === "email") {
      if (!lead.contact.email) return toast.error("This lead has no e-mail address. Add one under Contact Information.");
      window.open(`mailto:${lead.contact.email}`, "_self");
      return void logTouch("email_sent", "email", "E-Mail composer opened");
    }
    if (a === "call") {
      window.open(`tel:${phone}`, "_self");
      setDlg("call");
    }
  };

  const onMenu = (a: MenuAction) => {
    if (!lead) return;
    if (a === "removeOwner" && !lead.assignedTo && !(lead.coOwners ?? []).length) return void toast.info("This lead has no owner to remove.");
    if (a === "removeCp" && !lead.brokerId) return void toast.info("No channel partner is linked to this lead.");
    setDlg(a);
  };

  const owners = [
    ...(lead?.assignedTo ? [lead.assignedTo._id] : []),
    ...(lead?.coOwners ?? []).map((c) => c._id),
  ];

  return (
    <div className="fixed inset-y-0 right-0 left-0 z-[55] flex flex-col bg-[#f4f6fb] lg:left-[88px]" role="complementary" aria-label="Lead Information">
      <header className="flex shrink-0 items-center justify-between border-b border-[#e3e6ef] bg-[#f8f9fd] px-5 py-2.5">
        <div>
          <h2 className="text-[19px] font-medium leading-tight text-[#2b2f3a]">Lead Information</h2>
          <p className="text-[13px] text-[#6b7186]">{position}</p>
        </div>
        <div className="flex items-center gap-4 text-[#5a6072]">
          <button
            type="button"
            aria-label="Previous lead"
            disabled={idx <= 0}
            onClick={() => onNavigate(ids[idx - 1])}
            className="rounded p-1 hover:bg-[#e8ecf6] disabled:opacity-30"
          >
            <ChevronsLeft className="size-5" />
          </button>
          <button
            type="button"
            aria-label="Next lead"
            disabled={idx < 0 || idx >= ids.length - 1}
            onClick={() => onNavigate(ids[idx + 1])}
            className="-ml-3 rounded p-1 hover:bg-[#e8ecf6] disabled:opacity-30"
          >
            <ChevronsRight className="size-5" />
          </button>
          <button type="button" aria-label="Close" onClick={onClose} className="rounded p-1 hover:bg-[#e8ecf6]">
            <X className="size-5" />
          </button>
        </div>
      </header>

      {!ctx || !detail ? (
        <div className="flex flex-1 items-center justify-center text-[14px] text-[#8b90a0]">{loading ? "Loading lead…" : ""}</div>
      ) : (
        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-3 xl:grid-cols-[320px_minmax(0,1fr)_370px] xl:overflow-hidden">
          <div className="min-h-0 xl:h-full">
            <LeftPanel ctx={ctx} onQuick={onQuick} onMenu={onMenu} />
          </div>

          <div className="flex min-h-0 min-w-0 flex-col gap-3 xl:h-full">
            <nav className="flex shrink-0 flex-wrap gap-x-1 gap-y-1 rounded-[3px] bg-white p-2 shadow-[0_1px_4px_rgba(30,50,110,0.06)]" aria-label="Lead sections">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-[4px] px-3.5 py-2 text-[14px] font-medium transition-colors",
                    tab === t.key ? "bg-[#3a5dc2] text-white" : "text-[#4a4f5f] hover:bg-[#eef1fa]",
                  )}
                >
                  <t.icon className="size-[15px]" />
                  {t.label}
                </button>
              ))}
            </nav>
            <div className="min-h-0 flex-1 overflow-y-auto" key={`${lead!._id}-${tab}`}>
              {tab === "suggestion" ? <SuggestionTab ctx={ctx} /> : null}
              {tab === "timeline" ? <TimelineTab ctx={ctx} /> : null}
              {tab === "followup" ? <FollowupTab ctx={ctx} kind="followup" /> : null}
              {tab === "sitevisit" ? <SiteVisitTab ctx={ctx} /> : null}
              {tab === "meeting" ? <FollowupTab ctx={ctx} kind="meeting" /> : null}
              {tab === "email" ? <ChannelTab ctx={ctx} channel="email" /> : null}
              {tab === "call" ? <ChannelTab ctx={ctx} channel="call" /> : null}
              {tab === "sms" ? <ChannelTab ctx={ctx} channel="sms" /> : null}
              {tab === "whatsapp" ? <ChannelTab ctx={ctx} channel="whatsapp" /> : null}
              {tab === "projects" ? <ProjectsTab ctx={ctx} /> : null}
              {tab === "documents" ? <DocumentsTab ctx={ctx} /> : null}
            </div>
          </div>

          <div className="min-h-0 xl:h-full">
            <RightPanel ctx={ctx} detail={detail} refreshing={refreshing} onRefresh={() => load(true)} />
          </div>
        </div>
      )}

      {lead ? (
        <>
          <NoteDialog open={dlg === "note"} onClose={() => setDlg(null)} leadId={lead._id} leadName={lead.contact.name} onDone={() => ctx?.reload()} />
          <CallLogDialog
            open={dlg === "call"}
            onClose={() => setDlg(null)}
            leadId={lead._id}
            leadName={lead.contact.name}
            phone={lead.contact.primaryPhone}
            onDone={() => ctx?.reload()}
          />
          <TaskDialog open={dlg === "task"} onClose={() => setDlg(null)} leadId={lead._id} leadName={lead.contact.name} onDone={() => ctx?.reload()} />
          <EditLeadDialog open={dlg === "edit"} lead={lead} onClose={() => setDlg(null)} onSaved={() => ctx?.reload()} />
          <UserPickDialog
            open={dlg === "transfer"}
            onClose={() => setDlg(null)}
            title="Transfer Lead"
            confirmLabel="Transfer"
            onConfirm={async (uid) => void (await patch({ assignedTo: uid }, "Lead transferred"))}
          />
          <UserPickDialog
            open={dlg === "addOwner"}
            onClose={() => setDlg(null)}
            title="Add Owner"
            confirmLabel="Add Owner"
            excludeIds={owners}
            onConfirm={async (uid) => void (await patch({ addCoOwner: uid }, "Owner added"))}
          />
          <UserPickDialog
            open={dlg === "removeOwner"}
            onClose={() => setDlg(null)}
            title="Remove Lead Owner"
            fieldLabel="Lead Owner"
            placeholder="Select Owner"
            confirmLabel="Remove"
            onlyIds={owners}
            onConfirm={async (uid) => void (await patch({ removeOwner: uid }, "Owner removed"))}
          />
          <ChannelPartnerDialog open={dlg === "addCp"} onClose={() => setDlg(null)} onConfirm={async (id) => void (await patch({ brokerId: id }, "Channel partner added"))} />
          <ConfirmDialog
            open={dlg === "removeCp"}
            onClose={() => setDlg(null)}
            title="Remove Channel Partner"
            confirmLabel="Remove"
            danger
            message={`Remove ${lead.brokerId?.name ?? "the channel partner"} from this lead?`}
            onConfirm={async () => void (await patch({ brokerId: null }, "Channel partner removed"))}
          />
          <ConfirmDialog
            open={dlg === "convert"}
            onClose={() => setDlg(null)}
            title="Convert To Contact"
            confirmLabel="Convert"
            message={`Convert ${lead.contact.name} to a contact? The lead moves from the Leads list to CRM → Contacts.`}
            onConfirm={async () => {
              if (await patch({ convertToContact: true }, "Converted to contact")) onDeleted();
            }}
          />
          <ConfirmDialog
            open={dlg === "delete"}
            onClose={() => setDlg(null)}
            title="Delete Lead"
            confirmLabel="Delete"
            danger
            message={`Delete ${lead.contact.name} permanently? Its timeline and open tasks are removed too. This cannot be undone.`}
            onConfirm={async () => {
              await api(`/api/leads/${lead._id}`, { method: "DELETE" });
              toast.success("Lead deleted");
              onDeleted();
            }}
          />
        </>
      ) : null}
    </div>
  );
}
