"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, CheckCircle2, Download, FileSpreadsheet, Upload, UserRound } from "lucide-react";
import { BdButton, BdCard, BdKpi, BdPage, BdPageHeader } from "@/components/bd";
import { CheckboxField } from "@/components/ui/checkbox";

const COLUMNS: Array<{ name: string; note: string; key?: boolean }> = [
  { name: "Name", note: "Full name (or First name + Last name)", key: true },
  { name: "Mobile", note: "Matches existing leads; required for new ones", key: true },
  { name: "Username", note: "Assigns the lead to that user, e.g. trakanksha", key: true },
  { name: "Email", note: "" },
  { name: "Project", note: "Project name or code" },
  { name: "Source", note: "e.g. Walk In, Marketing Ads" },
  { name: "Stage", note: "Stage name or key" },
  { name: "Pre-sales", note: "Pre-sales agent's username" },
  { name: "Budget", note: "e.g. 85L-1.2Cr" },
  { name: "Configuration", note: "e.g. 2BHK" },
  { name: "Tags", note: "Comma or ; separated" },
  { name: "Remark", note: "Saved as the lead description" },
  { name: "Lead number", note: "Optional — updates that exact lead" },
];

const MAX_BYTES = 10 * 1024 * 1024;

interface ImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  assigned: Array<{ name: string; count: number }>;
  ignoredColumns: string[];
  errors: Array<{ row: number; reason: string }>;
  warnings: Array<{ row: number; reason: string }>;
}

export default function ImportLeadsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [createMissing, setCreateMissing] = useState(true);
  const [result, setResult] = useState<ImportResult | null>(null);

  const choose = (f: File | null) => {
    if (f && f.size > MAX_BYTES) return toast.error("File is larger than 10 MB.");
    if (f && !/\.csv$/i.test(f.name)) return toast.error("Please choose a .csv file (in Excel: File → Save as → CSV).");
    setFile(f);
    setResult(null);
  };

  const onUpload = async () => {
    if (!file) return toast.error("Choose a CSV file first.");
    setUploading(true);
    setResult(null);
    try {
      const res = await fetch("/api/leads/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: await file.text(), createMissing }),
      });
      const data = await res.json();
      if (!res.ok) return toast.error(data.error || "Import failed.");
      setResult(data.result as ImportResult);
      toast.success(`Import done — ${data.result.created} new, ${data.result.updated} updated.`);
    } catch {
      toast.error("Network error during import.");
    } finally {
      setUploading(false);
    }
  };

  const downloadSample = () => {
    const csv = `Name,Mobile,Email,Username,Project,Source,Stage,Budget,Configuration,Remark
Rahul Sharma,9876543210,rahul@example.com,trakanksha,MIRAYA,Walk In,New,1Cr-1.5Cr,3BHK,"Wants east facing"
Sneha Patil,9822001122,,trgovind,CAPRI,Marketing Ads,,80L-1Cr,2BHK,
`;
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "tristar-lead-import-sample.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <BdPage className="max-w-5xl">
      <BdPageHeader
        eyebrow="Leads"
        title="Import leads"
        description="Upload a spreadsheet to add new leads and update existing ones. Put a username in each row to assign it straight to that person."
        actions={
          <Link href="/leads" className="bd-btn-light">
            <ArrowLeft className="size-4" /> Back to leads
          </Link>
        }
      />

      <BdCard
        title="1. Choose your file"
        actions={
          <BdButton variant="light" onClick={downloadSample}>
            <Download className="size-4" /> Download sample
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
          className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-input bg-muted/40 px-6 py-10 text-center transition-colors hover:border-primary hover:bg-primary-50/60"
        >
          {file ? (
            <FileSpreadsheet className="size-9 text-primary" strokeWidth={1.5} />
          ) : (
            <Upload className="size-9 text-muted-foreground" strokeWidth={1.5} />
          )}
          <div>
            <p className="text-[14px] font-medium">{file ? file.name : "Click to choose a CSV, or drag it here"}</p>
            <p className="mt-1 text-[12px] text-muted-foreground">
              {file ? `${(file.size / 1024).toFixed(1)} KB — ready` : "First row = column names. Up to 5,000 rows."}
            </p>
          </div>
          <input id="csv" type="file" accept=".csv,text/csv" className="hidden" onChange={(e) => choose(e.target.files?.[0] ?? null)} />
        </label>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <CheckboxField
            checked={createMissing}
            onCheckedChange={setCreateMissing}
            label="Create new leads for rows that don't match an existing lead"
            hint="Turn off to only update leads you already have."
          />
          <div className="flex gap-2">
            {file ? (
              <BdButton variant="light" onClick={() => choose(null)}>
                Remove
              </BdButton>
            ) : null}
            <BdButton onClick={onUpload} disabled={uploading || !file}>
              <Upload className="size-4" /> {uploading ? "Importing…" : "Import"}
            </BdButton>
          </div>
        </div>
      </BdCard>

      {result ? (
        <BdCard
          title={
            <span className="flex items-center gap-2">
              {result.errors.length === 0 ? (
                <CheckCircle2 className="size-5 text-success" />
              ) : (
                <AlertTriangle className="size-5 text-warning" />
              )}
              Import finished
            </span>
          }
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <BdKpi label="Rows" value={result.total} tone="blue" />
            <BdKpi label="New leads" value={result.created} tone="green" />
            <BdKpi label="Updated" value={result.updated} tone="violet" />
            <BdKpi label="Skipped" value={result.skipped} tone="yellow" />
          </div>

          {result.assigned.length ? (
            <div className="mt-5">
              <p className="text-[13px] font-semibold">Assigned to</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {result.assigned.map((a) => (
                  <span key={a.name} className="inline-flex items-center gap-1.5 rounded-full bg-primary-50 px-3 py-1 text-[12.5px] text-primary-700 ring-1 ring-primary/15">
                    <UserRound className="size-3.5" /> {a.name} · <b className="tabular-nums">{a.count}</b>
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          {result.ignoredColumns.length ? (
            <p className="mt-4 text-[12.5px] text-muted-foreground">
              Columns we didn&apos;t recognise and skipped: {result.ignoredColumns.join(", ")}
            </p>
          ) : null}

          {[
            { title: "Rows not imported", list: result.errors, tone: "text-destructive" },
            { title: "Imported with notes", list: result.warnings, tone: "text-warning" },
          ].map((g) =>
            g.list.length ? (
              <div key={g.title} className="mt-4">
                <p className={`text-[13px] font-semibold ${g.tone}`}>
                  {g.title} · {g.list.length}
                </p>
                <ul className="mt-2 max-h-52 space-y-1 overflow-auto rounded-lg bg-muted/50 p-3 text-[12.5px] text-foreground/80">
                  {g.list.slice(0, 200).map((e, i) => (
                    <li key={i}>
                      <span className="font-mono text-muted-foreground">Row {e.row}:</span> {e.reason}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null,
          )}
        </BdCard>
      ) : null}

      <BdCard title="Columns we understand" description="Names are flexible — “Mobile”, “Phone” and “Phone number” all work. Unknown columns are skipped.">
        <div className="grid gap-x-6 gap-y-2.5 sm:grid-cols-2">
          {COLUMNS.map((c) => (
            <div key={c.name} className="flex items-baseline gap-2">
              <span className={`rounded-md px-1.5 py-0.5 text-[12px] font-medium ${c.key ? "bg-primary-50 text-primary-700" : "bg-muted text-foreground/80"}`}>
                {c.name}
              </span>
              <span className="text-[12.5px] text-muted-foreground">{c.note}</span>
            </div>
          ))}
        </div>
        <p className="mt-4 rounded-lg bg-muted/50 p-3 text-[12.5px] text-muted-foreground">
          <b className="text-foreground">Who gets each lead?</b> The user in the Username column. If it&apos;s empty, your
          lead distribution rules (Settings → Users → Distribution) pick the next agent; otherwise the lead stays with you.
        </p>
      </BdCard>
    </BdPage>
  );
}
