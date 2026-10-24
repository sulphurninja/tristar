"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload } from "lucide-react";
import { BdButton, BdCard, BdKpi, BdPage } from "@/components/bd";

const MAGIC_FIELDS = [
  "leadNumber",
  "phone",
  "stage",
  "stageReason",
  "priority",
  "category",
  "source",
  "description",
  "assignedTo",
  "primaryProjectId",
  "tags",
  "residentialAddress",
  "occupation",
  "configuration",
  "budgetRange",
];

const MAX_BYTES = 10 * 1024 * 1024;

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

  const choose = (f: File | null) => {
    if (f && f.size > MAX_BYTES) {
      toast.error("File is larger than 10 MB.");
      return;
    }
    setFile(f);
    setResult(null);
  };

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
      toast.success(`Bulk update complete - ${data.result.updated} updated, ${data.result.skipped} skipped.`);
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
    <BdPage className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-medium text-[#2b2f3a]">Bulk Update</h1>
          <p className="mt-1 text-[13px] text-[#6b7186]">
            Upload a CSV to update existing leads in bulk. Leads are matched by <code className="rounded bg-[#eef1fa] px-1">leadNumber</code> or{" "}
            <code className="rounded bg-[#eef1fa] px-1">phone</code> (primary number).
          </p>
        </div>
        <Link href="/leads" className="bd-btn-light inline-flex items-center">
          Back to Leads
        </Link>
      </div>

      <BdCard
        title="Choose a file"
        actions={
          <BdButton variant="light" onClick={downloadSample}>
            <Download className="size-4" /> Sample CSV
          </BdButton>
        }
      >
        <label
          htmlFor="csv"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            choose(e.dataTransfer.files?.[0] ?? null);
          }}
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-[3px] border-2 border-dashed border-[#cfd8f1] bg-[#f6f8fd] px-6 py-10 text-center transition-colors hover:border-[#3a5dc2] hover:bg-[#eef1fa]"
        >
          {file ? <FileSpreadsheet className="size-8 text-[#3a5dc2]" strokeWidth={1.5} /> : <Upload className="size-8 text-[#8b90a0]" strokeWidth={1.5} />}
          <div>
            <p className="text-[14px] font-medium text-[#2b2f3a]">{file ? file.name : "Click to choose CSV or drag and drop"}</p>
            <p className="mt-1 text-[12px] text-[#8b90a0]">
              {file ? `${(file.size / 1024).toFixed(1)} KB - ready to upload` : "CSV only, first row = column headers. Up to 10 MB, 5,000 rows."}
            </p>
          </div>
          <input id="csv" type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => choose(e.target.files?.[0] ?? null)} />
        </label>
        <div className="mt-4 flex items-center justify-end gap-2">
          {file ? (
            <BdButton variant="light" onClick={() => choose(null)}>
              Remove
            </BdButton>
          ) : null}
          <BdButton onClick={onUpload} disabled={uploading || !file}>
            <Upload className="size-4" /> {uploading ? "Updating…" : "Upload & update"}
          </BdButton>
        </div>
      </BdCard>

      <BdCard title="Columns that are applied" bodyClassName="pt-3">
        <p className="text-[13px] text-[#6b7186]">
          Any of these column headers are picked up automatically; <code>assignedTo</code> accepts a user name, e-mail or id and{" "}
          <code>primaryProjectId</code> a project name, code or id.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {MAGIC_FIELDS.map((f) => (
            <span key={f} className="rounded-[3px] bg-[#eef1fa] px-2 py-1 font-mono text-[11.5px] text-[#3a5dc2]">
              {f}
            </span>
          ))}
        </div>
      </BdCard>

      {result ? (
        <BdCard
          title={
            <span className="flex items-center gap-2">
              {result.errors.length === 0 ? <CheckCircle2 className="size-5 text-[#37c47f]" /> : <AlertTriangle className="size-5 text-[#e9b72a]" />}
              Bulk update complete
            </span>
          }
        >
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <BdKpi label="Rows" value={result.total} tone="blue" />
            <BdKpi label="Matched" value={result.matched} tone="violet" />
            <BdKpi label="Updated" value={result.updated} tone="green" />
            <BdKpi label="Skipped" value={result.skipped} tone="yellow" />
          </div>
          {result.errors.length > 0 ? (
            <div className="mt-4">
              <p className="text-[13px] font-medium text-[#2b2f3a]">{result.errors.length} row(s) with issues</p>
              <ul className="mt-2 max-h-52 space-y-1 overflow-auto rounded-[3px] bg-[#f6f8fd] p-3 text-[12.5px] text-[#4a4f5f]">
                {result.errors.slice(0, 100).map((e, i) => (
                  <li key={i}>
                    <span className="font-mono">row {e.row}:</span> {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </BdCard>
      ) : null}
    </BdPage>
  );
}
