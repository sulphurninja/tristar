"use client";

import { useMemo, useState } from "react";
import {
  reportQuery,
  type ReportDateState,
  type ReportRange,
} from "@/components/reports/ReportShell";

export function useReportFilters(defaultRange: ReportRange = "30d") {
  const [range, setRange] = useState<ReportRange>(defaultRange);
  const [from, setFrom] = useState<Date | undefined>();
  const [to, setTo] = useState<Date | undefined>();

  const state: ReportDateState = { range, from, to };
  const query = useMemo(() => reportQuery(state), [range, from, to]);

  const onDatesChange = (dates: { from?: Date; to?: Date }) => {
    setFrom(dates.from);
    setTo(dates.to);
  };

  return {
    range,
    setRange,
    from,
    to,
    onDatesChange,
    query,
    /** Ready to fetch — custom needs both ends */
    ready: range !== "custom" || (!!from && !!to),
  };
}
