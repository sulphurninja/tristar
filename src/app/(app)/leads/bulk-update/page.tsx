"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Download,
  Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const MAGIC_FIELDS = [
  "leadNumber",
  "stage",
  "priority",
  "description",
  "assignedTo",
  "primaryProjectId",
  "tags",
  "residentialAddress",
  "occupation",
  "configuration",
  "budgetRange",
];

interface BulkResult {
  total: number;
  matched: number;
  updated: number;
  skipped: number;
  errors: Array<{ row: number; reason: string }>;
}

export default function BulkUpdatePage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<BulkResult | null>(null);

  const onUpload = async () => {
    if (!file) {
      toast.error("Pick a CSV file first.");
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const text = await file.text();
      const res = await fetch("/api/leads/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Bulk update failed.");
        return;
      }
      setResult(data.result as BulkResult);
      toast.success(
        `Bulk update complete · ${data.result.updated} updated, ${data.result.skipped} skipped.`,
      );
    } catch (err) {
      console.error(err);
      toast.error("Network error during bulk update.");
    } finally {
      setUploading(false);
    }
  };

  const downloadSample = () => {
    const csv = `leadNumber,stage,priority,description,configuration,budgetRange
TS-2026-00001,warm,high,"Looking for 3BHK in Kothrud","3BHK","85L-1.2Cr"
TS-2026-00002,site_visit_scheduled,medium,"Visit booked for Saturday 11AM","2BHK","60L-90L"
`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tristar-bulk-update-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-4 lg:p-8">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-slate-900">Update Leads</h1>
        <p className="mt-1 text-[13px] text-slate-600">
          Upload a CSV to update existing leads in bulk. Match-by{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">leadNumber</code> or{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-[11px]">contact.primaryPhone</code>
          .
        </p>
      </div>

      <section className="rounded-xl border border-slate-200/70 bg-white p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
            <FileSpreadsheet className="size-5" />
          </div>
          <div className="flex-1">
            <p className="text-[14px] font-semibold text-slate-900">Choose a file</p>
            <p className="mt-1 text-[12.5px] text-slate-500">
              CSV only. The first row must contain column headers.
            </p>
          </div>
        </div>

        <label
          htmlFor="csv"
          className="mt-5 flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center transition-colors hover:border-emerald-400 hover:bg-emerald-50/40"
        >
          <Upload className="size-8 text-slate-400" strokeWidth={1.5} />
          <div>
            <p className="text-[14px] font-semibold text-slate-700">
              {file ? file.name : "Click to choose CSV or drag and drop"}
            </p>
            <p className="mt-1 text-[11.5px] text-slate-500">
              {file
                ? `${(file.size / 1024).toFixed(1)} KB · ready to upload`
                : "Up to 10 MB · UTF-8"}
            </p>
          </div>
          <input
            id="csv"
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </label>

        <div className="mt-5 flex items-center justify-between gap-3">
          <Button variant="outline" onClick={downloadSample} className="gap-1.5">
            <Download className="size-4" strokeWidth={1.75} />
            Sample CSV
          </Button>
          <div className="flex items-center gap-2">
            {file ? (
              <Button variant="ghost" onClick={() => setFile(null)}>
                Remove
              </Button>
            ) : null}
            <Button onClick={onUpload} loading={uploading} className="gap-1.5">
              <Upload className="size-4" strokeWidth={2} />
              Upload &amp; update
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-slate-200/70 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2">
          <Info className="size-4 text-emerald-600" strokeWidth={1.75} />
          <h2 className="text-[14px] font-semibold text-slate-900">
            Magic fields to update
          </h2>
        </div>
        <p className="mt-1 text-[12.5px] text-slate-500">
          Any of these column headers will be picked up automatically.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {MAGIC_FIELDS.map((f) => (
            <span
              key={f}
              className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] text-slate-700"
            >
              {f}
            </span>
          ))}
        </div>
      </section>

      {result ? (
        <section
          className={`rounded-xl border p-6 ${
            result.errors.length === 0
              ? "border-emerald-200 bg-emerald-50/40"
              : "border-amber-200 bg-amber-50/40"
          }`}
        >
          <div className="flex items-center gap-2">
            {result.errors.length === 0 ? (
              <CheckCircle2 className="size-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="size-5 text-amber-600" />
            )}
            <h2 className="text-[14px] font-semibold text-slate-900">
              Bulk update complete
            </h2>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Rows" value={result.total} />
            <Stat label="Matched" value={result.matched} />
            <Stat label="Updated" value={result.updated} tone="success" />
            <Stat label="Skipped" value={result.skipped} tone="warning" />
          </div>
          {result.errors.length > 0 ? (
            <div className="mt-4">
              <p className="text-[12px] font-semibold text-slate-700">
                {result.errors.length} row(s) with issues:
              </p>
              <ul className="mt-2 max-h-48 space-y-1 overflow-auto rounded-md bg-white p-3 text-[11.5px] text-slate-600">
                {result.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    <span className="font-mono">row {e.row}:</span> {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: number;
  tone?: "default" | "success" | "warning";
}) {
  const color =
    tone === "success"
      ? "text-emerald-700"
      : tone === "warning"
        ? "text-amber-700"
        : "text-slate-900";
  return (
    <div className="rounded-lg bg-white px-4 py-3 shadow-xs">
      <p className="text-[10.5px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </p>
      <p className={`mt-1 text-[20px] font-bold tabular-nums ${color}`}>{value}</p>
    </div>
  );
}
