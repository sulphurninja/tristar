"use client";

import { useEffect, useMemo, useState } from "react";
import { BdSelect } from "@/components/bd";
import { cn } from "@/lib/utils";

export interface AgentUser {
  _id: string;
  name: string;
  role?: string;
  teamId?: string | null;
  status?: string;
}
export interface TeamRow {
  _id: string;
  name: string;
}

let cache: { users: AgentUser[]; teams: TeamRow[] } | null = null;

/** Workspace users + teams, fetched once per page load and shared. */
export function useDirectory() {
  const [dir, setDir] = useState(cache ?? { users: [], teams: [] });
  useEffect(() => {
    if (cache) return;
    Promise.all([
      fetch("/api/users", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/teams", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([u, t]) => {
        cache = { users: u.users ?? [], teams: t.teams ?? [] };
        setDir(cache);
      })
      .catch(() => undefined);
  }, []);
  return dir;
}

export interface TeamAgentValue {
  team: string;
  agent: string;
}

/** The "Select Team" + "Select Sales Agent" dropdown pair used across the CRM. */
export function TeamAgentSelects({
  value,
  onChange,
  agentPlaceholder = "Select Sales Agent",
  className,
  selectClassName,
}: {
  value: TeamAgentValue;
  onChange: (v: TeamAgentValue) => void;
  agentPlaceholder?: string;
  className?: string;
  selectClassName?: string;
}) {
  const { users, teams } = useDirectory();
  const agents = useMemo(
    () =>
      users
        .filter((u) => u.status !== "suspended")
        .filter((u) => !value.team || String(u.teamId ?? "") === value.team),
    [users, value.team],
  );
  return (
    <div className={cn("flex flex-wrap items-center gap-4", className)}>
      <BdSelect
        className={cn("w-[260px] sm:w-[365px]", selectClassName)}
        placeholder="Select Team"
        value={value.team}
        onChange={(team) => onChange({ team, agent: "" })}
        options={teams.map((t) => ({ value: t._id, label: t.name }))}
      />
      <BdSelect
        className={cn("w-[260px] sm:w-[365px]", selectClassName)}
        placeholder={agentPlaceholder}
        value={value.agent}
        onChange={(agent) => onChange({ ...value, agent })}
        options={agents.map((u) => ({ value: u._id, label: u.name }))}
      />
    </div>
  );
}

export function scopeQuery(v: TeamAgentValue) {
  const u = new URLSearchParams();
  if (v.team) u.set("team", v.team);
  if (v.agent) u.set("agent", v.agent);
  return u;
}
