"use client";

import { useEffect, useState } from "react";

export interface StageOpt {
  key: string;
  label: string;
  type: "open" | "won" | "lost";
  color: string;
}
export interface LeadOptions {
  stages: StageOpt[];
  projects: Array<{ _id: string; name: string; code?: string; city?: string }>;
  brokers: Array<{ _id: string; name: string; firmName?: string; phone?: string }>;
  sources: Array<{ value: string; label: string }>;
  tags: string[];
}

const EMPTY: LeadOptions = { stages: [], projects: [], brokers: [], sources: [], tags: [] };
let cache: LeadOptions | null = null;
let inflight: Promise<LeadOptions> | null = null;

export function refreshLeadOptions() {
  cache = null;
  inflight = null;
}

/** Dropdown vocabulary (stages, projects, sources, brokers, tags) - fetched once per page load. */
export function useLeadOptions(): LeadOptions {
  const [opts, setOpts] = useState<LeadOptions>(cache ?? EMPTY);
  useEffect(() => {
    if (cache) return;
    inflight ??= fetch("/api/leads/options", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        cache = { ...EMPTY, ...d };
        return cache as LeadOptions;
      });
    inflight.then(setOpts).catch(() => {
      inflight = null;
    });
  }, []);
  return opts;
}

export interface LeadRow {
  _id: string;
  leadNumber?: string;
  contact: { name: string; primaryPhone: string; email?: string; altPhone?: string };
  stage: string;
  stageReason?: string;
  priority?: string;
  category?: string;
  source?: { primary?: string };
  primaryProjectId?: { _id: string; name: string; code?: string } | null;
  assignedTo?: { _id: string; name: string } | null;
  brokerId?: { _id: string; name: string; firmName?: string } | null;
  tags?: string[];
  createdAt: string;
  assignedAt?: string;
  nextActionAt?: string;
  lastContactedAt?: string;
  delayDays: number | null;
  returning: boolean;
  isContact?: boolean;
}

export const CATEGORY_OPTIONS = ["End User", "Investor", "NRI", "Corporate", "Channel Partner"];
export const COUNTRY_OPTIONS = [
  "India",
  "United Arab Emirates",
  "United States",
  "United Kingdom",
  "Canada",
  "Australia",
  "Singapore",
  "Saudi Arabia",
  "Qatar",
  "Kuwait",
  "Oman",
  "Bahrain",
  "Germany",
  "New Zealand",
  "Other",
];
export const EMPLOYMENT_TYPES = ["Salaried", "Self Employed", "Business", "Professional", "Retired", "Student", "Homemaker"];

export function sourceLabel(opts: LeadOptions, key?: string) {
  if (!key) return "-";
  return opts.sources.find((s) => s.value === key)?.label ?? key.replace(/_/g, " ");
}
export function stageLabel(opts: LeadOptions, key?: string) {
  if (!key) return "-";
  return opts.stages.find((s) => s.key === key)?.label ?? key.replace(/_/g, " ");
}

/** "Rs 60 Lac" style budget text for select options. */
export function formatBudget(n: number) {
  if (n >= 10_000_000) return `${+(n / 10_000_000).toFixed(2)} Cr`;
  if (n >= 100_000) return `${+(n / 100_000).toFixed(2)} Lac`;
  return n.toLocaleString("en-IN");
}

export const BUDGET_STEPS = [
  500_000, 1_000_000, 2_000_000, 3_000_000, 4_000_000, 5_000_000, 6_000_000, 7_500_000, 10_000_000, 12_500_000,
  15_000_000, 20_000_000, 30_000_000, 50_000_000, 100_000_000,
];
