"use client";

import { useState } from "react";
import { Building2, Trash2 } from "lucide-react";
import { BdButton, BdSelect } from "@/components/bd";
import { useLeadOptions, formatBudget } from "@/components/leads/types";
import type { TabCtx } from "../types";

export function ProjectsTab({ ctx }: { ctx: TabCtx }) {
  const { lead, patch } = ctx;
  const opts = useLeadOptions();
  const [pick, setPick] = useState("");
  const have = new Set((lead.interestedProjects ?? []).map((p) => p._id));
  const props = lead.interestedProperties ?? [];

  return (
    <div className="rounded-[3px] border border-[#e6e9f2] bg-white">
      <header className="border-b border-[#eef0f6] px-5 py-3.5">
        <h3 className="text-[16px] font-semibold text-[#2b2f3a]">Interested Projects</h3>
        <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[#6b7186]">Projects and properties this lead is interested in</p>
      </header>
      <div className="space-y-4 p-5">
        <div className="flex gap-3">
          <BdSelect
            className="flex-1"
            value={pick}
            onChange={setPick}
            placeholder="Select Project"
            options={opts.projects.filter((p) => !have.has(p._id)).map((p) => ({ value: p._id, label: p.name }))}
          />
          <BdButton
            disabled={!pick}
            onClick={async () => {
              if (await patch({ addInterestedProject: pick }, "Project added")) setPick("");
            }}
          >
            Add Project
          </BdButton>
        </div>

        {(lead.interestedProjects ?? []).length === 0 && props.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[#8b90a0]">No interested projects yet. Add one above or from the Suggestion tab.</p>
        ) : null}

        <div className="divide-y divide-[#eef0f6]">
          {(lead.interestedProjects ?? []).map((p) => (
            <div key={p._id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded bg-[#eef1fa] text-[#3a5dc2]">
                  <Building2 className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium">{p.name}</p>
                  <p className="truncate text-[12.5px] text-[#6b7186]">
                    {[p.code, p.location?.locality, p.location?.city].filter(Boolean).join(" · ") || "-"}
                    {lead.primaryProjectId?._id === p._id ? " · Primary" : ""}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label={`Remove ${p.name}`}
                onClick={() => patch({ removeInterestedProject: p._id }, "Project removed")}
                className="rounded p-1.5 text-[#c93c41] hover:bg-[#fdecec]"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          {props.map((p) => (
            <div key={p._id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[14px] font-medium">{p.title}</p>
                <p className="truncate text-[12.5px] text-[#6b7186]">
                  {[p.location, p.city, p.configuration, p.price ? formatBudget(p.price) : ""].filter(Boolean).join(" · ") || "Property"}
                </p>
              </div>
              <button
                type="button"
                aria-label={`Remove ${p.title}`}
                onClick={() => patch({ removeInterestedProperty: p._id }, "Property removed")}
                className="rounded p-1.5 text-[#c93c41] hover:bg-[#fdecec]"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
