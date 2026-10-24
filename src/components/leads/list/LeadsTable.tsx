"use client";

import { ChevronDown, ArrowDown, ArrowUp } from "lucide-react";
import { BdEmptyRow, BdTable, BdTd, BdTh } from "@/components/bd";
import { Checkbox, DropMenu, type MenuItem } from "@/components/leads/ui/primitives";
import { sourceLabel, stageLabel, type LeadOptions, type LeadRow } from "@/components/leads/types";
import { cn } from "@/lib/utils";

export interface ColumnDef {
  key: string;
  label: string;
  sort?: string;
  defaultOn: boolean;
}

/** Column order and wording follow the Buildesk Leads table. */
export const COLUMNS: ColumnDef[] = [
  { key: "index", label: "#", defaultOn: true },
  { key: "leadNumber", label: "Lead No", defaultOn: false },
  { key: "created", label: "Created Date", sort: "createdAt", defaultOn: true },
  { key: "assigned", label: "Assigned Date", sort: "assignedAt", defaultOn: true },
  { key: "status", label: "Status", defaultOn: true },
  { key: "name", label: "Name", sort: "name", defaultOn: true },
  { key: "phone", label: "Primary No", sort: "phone", defaultOn: true },
  { key: "email", label: "E-Mail", defaultOn: false },
  { key: "stage", label: "Lead Stage", sort: "stage", defaultOn: true },
  { key: "stageReason", label: "Stage Reason", defaultOn: true },
  { key: "source", label: "Source", sort: "source", defaultOn: true },
  { key: "project", label: "Project", defaultOn: true },
  { key: "tag", label: "Tag", defaultOn: true },
  { key: "assignedTo", label: "Assigned To", defaultOn: false },
  { key: "channelPartner", label: "Channel Partner", defaultOn: false },
  { key: "category", label: "Lead Category", defaultOn: false },
  { key: "priority", label: "Priority", defaultOn: false },
  { key: "nextFollowup", label: "Next Followup", sort: "nextActionAt", defaultOn: false },
  { key: "lastContacted", label: "Last Contacted", sort: "lastContactedAt", defaultOn: false },
];

export const fmtDT = (d?: string | Date | null) => {
  if (!d) return "-";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "-";
  return dt.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true });
};

const RED = "#d9453f";

export function StatusBadges({ lead }: { lead: Pick<LeadRow, "returning" | "delayDays"> }) {
  return (
    <span className="flex flex-wrap gap-1.5">
      {lead.returning ? <span className="rounded-[2px] px-2 py-[5px] text-[12px] leading-none text-white" style={{ background: RED }}>Returned</span> : null}
      {lead.delayDays ? (
        <span className="whitespace-nowrap rounded-[2px] px-2 py-[5px] text-[12px] leading-none text-white" style={{ background: RED }}>
          Delay - {lead.delayDays} Days
        </span>
      ) : null}
    </span>
  );
}

export function LeadsTable({
  rows,
  loading,
  opts,
  visible,
  page,
  pageSize,
  sort,
  dir,
  onSort,
  selected,
  onSelect,
  onSelectAll,
  onOpen,
  actions,
}: {
  rows: LeadRow[];
  loading: boolean;
  opts: LeadOptions;
  visible: string[];
  page: number;
  pageSize: number;
  sort: string;
  dir: "asc" | "desc";
  onSort: (field: string) => void;
  selected: Set<string>;
  onSelect: (id: string, on: boolean) => void;
  onSelectAll: (on: boolean) => void;
  onOpen: (id: string) => void;
  actions: (lead: LeadRow) => MenuItem[];
}) {
  const cols = COLUMNS.filter((c) => visible.includes(c.key));
  const allOn = rows.length > 0 && rows.every((r) => selected.has(r._id));
  const someOn = rows.some((r) => selected.has(r._id));

  const cell = (c: ColumnDef, l: LeadRow, i: number) => {
    switch (c.key) {
      case "index":
        return (page - 1) * pageSize + i + 1;
      case "leadNumber":
        return l.leadNumber ?? "-";
      case "created":
        return <span className="whitespace-nowrap">{fmtDT(l.createdAt)}</span>;
      case "assigned":
        return <span className="whitespace-nowrap">{fmtDT(l.assignedAt)}</span>;
      case "status":
        return <StatusBadges lead={l} />;
      case "name":
        return (
          <button
            type="button"
            onClick={() => onOpen(l._id)}
            className="text-left text-[#3a5dc2] underline underline-offset-2 hover:text-[#2f4ca0]"
          >
            {l.contact.name}
          </button>
        );
      case "phone":
        return <span className="whitespace-nowrap">{l.contact.primaryPhone}</span>;
      case "email":
        return l.contact.email || "-";
      case "stage":
        return stageLabel(opts, l.stage);
      case "stageReason":
        return l.stageReason || "";
      case "source":
        return sourceLabel(opts, l.source?.primary);
      case "project":
        return l.primaryProjectId?.name ?? "-";
      case "tag":
        return (l.tags ?? []).length ? (
          <span className="flex flex-wrap gap-1">
            {l.tags!.slice(0, 3).map((t) => (
              <span key={t} className="rounded-[2px] bg-[#eceff8] px-1.5 py-[2px] text-[11.5px]">{t}</span>
            ))}
          </span>
        ) : (
          ""
        );
      case "assignedTo":
        return l.assignedTo?.name ?? <span className="text-[#8b90a0]">Unassigned</span>;
      case "channelPartner":
        return l.brokerId ? l.brokerId.name : "-";
      case "category":
        return l.category || "-";
      case "priority":
        return <span className="capitalize">{l.priority ?? "-"}</span>;
      case "nextFollowup":
        return <span className="whitespace-nowrap">{fmtDT(l.nextActionAt)}</span>;
      case "lastContacted":
        return <span className="whitespace-nowrap">{fmtDT(l.lastContactedAt)}</span>;
      default:
        return null;
    }
  };

  return (
    <BdTable minWidth={1100}>
      <thead>
        <tr>
          <BdTh className="w-10">
            <Checkbox checked={allOn} indeterminate={someOn} onChange={onSelectAll} label="Select all on this page" />
          </BdTh>
          {cols.map((c) => (
            <BdTh key={c.key}>
              {c.sort ? (
                <button type="button" onClick={() => onSort(c.sort!)} className="inline-flex items-center gap-1 uppercase hover:text-[#3a5dc2]">
                  {c.label}
                  {sort === c.sort ? (dir === "asc" ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />) : null}
                </button>
              ) : (
                c.label
              )}
            </BdTh>
          ))}
          <BdTh>Action</BdTh>
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? <BdEmptyRow colSpan={cols.length + 2} loading={loading} /> : null}
        {rows.map((l, i) => (
          <tr key={l._id} className={cn(selected.has(l._id) && "!bg-[#eef1fa]", loading && "opacity-60")}>
            <BdTd>
              <Checkbox checked={selected.has(l._id)} onChange={(on) => onSelect(l._id, on)} label={`Select ${l.contact.name}`} />
            </BdTd>
            {cols.map((c) => (
              <BdTd key={c.key}>{cell(c, l, i)}</BdTd>
            ))}
            <BdTd>
              <DropMenu
                trigger={
                  <button
                    type="button"
                    aria-label={`Actions for ${l.contact.name}`}
                    className="inline-flex size-[26px] items-center justify-center rounded-[3px] bg-[#3a5dc2] text-white hover:bg-[#2f4ca0]"
                  >
                    <ChevronDown className="size-4" />
                  </button>
                }
                items={actions(l)}
              />
            </BdTd>
          </tr>
        ))}
      </tbody>
    </BdTable>
  );
}
