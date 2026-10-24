"use client";

import { useMemo, useState } from "react";
import {
  reportQuery,
  type ReportDateState,
  type ReportRange,
} from "@/components/reports/ReportShell";
import type { TeamAgentValue } from "@/components/bd/TeamAgentSelects";

const NO_SCOPE: TeamAgentValue = { team: "", agent: "" };

export function useReportFilters(defaultRange: ReportRange = "30d") {
  const [range, setRange] = useState<ReportRange>(defaultRange);
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();
  const [scope, setScope] = useState<TeamAgentValue>(NO_SCOPE);

  const query = useMemo(() => {
    const state: ReportDateState = { range, from, to };
    const p = new URLSearchParams(reportQuery(state));
    if (scope.team) p.set("team", scope.team);
    if (scope.agent) p.set("agent", scope.agent);
    return p.toString();
  }, [range, from, to, scope]);

  const onDatesChange = (dates: { from?: Date; to?: Date }) => {
    setFrom(dates.from);
    setTo(dates.to);
  };

  const reset = () => {
    setRange(defaultRange);
    setFrom(undefined);
    setTo(undefined);
    setScope(NO_SCOPE);
  };

  return {
    range,
    setRange,
    from,
    to,
    onDatesChange,
    scope,
    setScope,
    reset,
    query,
    /** Ready to fetch - custom needs both ends */
    ready: range !== "custom" || (!!from && !!to),
  };
}

export type ReportFilters = ReturnType<typeof useReportFilters>;
