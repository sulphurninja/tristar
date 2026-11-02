"use client";

import { BdField, BdInput, BdSelect } from "@/components/bd";
import { DateField } from "@/components/ui/date-field";

export interface DateRangeValue {
  range: string;
  from: string;
  to: string;
}

export const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "last7", label: "Last 7 Days" },
  { value: "last30", label: "Last 30 Days" },
  { value: "thisweek", label: "This Week" },
  { value: "thismonth", label: "This Month" },
  { value: "lastmonth", label: "Last Month" },
  { value: "all", label: "All Time" },
  { value: "custom", label: "Custom Range" },
];

/** "Date Range" select that reveals From / To inputs for a custom range. */
export function DateRangeFields({
  value,
  onChange,
  label = "Date Range",
  options = RANGE_OPTIONS,
}: {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  label?: string;
  options?: Array<{ value: string; label: string }>;
}) {
  return (
    <>
      <BdField label={label}>
        <BdSelect
          value={value.range}
          clearable={false}
          onChange={(range) => onChange({ ...value, range: range || "today" })}
          options={options}
        />
      </BdField>
      {value.range === "custom" ? (
        <>
          <BdField label="From">
            <DateField value={value.from} onChange={(v) => onChange({ ...value, from: v })} clearable />
          </BdField>
          <BdField label="To">
            <DateField value={value.to} onChange={(v) => onChange({ ...value, to: v })} clearable />
          </BdField>
        </>
      ) : null}
    </>
  );
}

export function rangeParams(v: DateRangeValue, u: URLSearchParams) {
  u.set("range", v.range);
  if (v.range === "custom") {
    if (v.from) u.set("from", v.from);
    if (v.to) u.set("to", v.to);
  }
}
