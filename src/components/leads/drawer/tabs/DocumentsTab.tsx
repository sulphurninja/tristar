"use client";

import { useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { BdButton } from "@/components/bd";
import { api } from "@/components/leads/ui/primitives";
import { fmtDT } from "@/components/leads/list/LeadsTable";
import type { TabCtx } from "../types";

const MAX_MB = 8;

const fmtSize = (n?: number) => {
  if (!n) return "";
  if (n > 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
};

export function DocumentsTab({ ctx }: { ctx: TabCtx }) {
  const { lead, reload } = ctx;
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const docs = lead.documents ?? [];

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > MAX_MB * 1024 * 1024) {
          toast.error(`${file.name} is larger than ${MAX_MB} MB.`);
          continue;
        }
        const fd = new FormData();
        fd.append("file", file);
        await api(`/api/leads/${lead._id}/documents`, { method: "POST", body: fd });
        toast.success(`${file.name} uploaded`);
      }
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };

  const remove = async (id: string, name: string) => {
    if (!window.confirm(`Delete ${name}?`)) return;
    try {
      await api(`/api/leads/${lead._id}/documents?docId=${id}`, { method: "DELETE" });
      toast.success("Document deleted");
      reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    }
  };

  return (
    <div className="rounded-lg border border-border bg-white">
      <header className="flex items-center justify-between border-b border-border/70 px-5 py-3.5">
        <div>
          <h3 className="text-[16px] font-semibold text-foreground">Documents</h3>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted-foreground">KYC, agreements and other files (max {MAX_MB} MB each)</p>
        </div>
        <BdButton onClick={() => input.current?.click()} disabled={busy}>
          <Upload className="size-3.5" /> {busy ? "Uploading…" : "Upload Document"}
        </BdButton>
        <input ref={input} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
      </header>
      <div className="p-5">
        {docs.length === 0 ? (
          <div
            onClick={() => input.current?.click()}
            className="cursor-pointer rounded-lg border-2 border-dashed border-input py-10 text-center text-[13px] text-muted-foreground hover:bg-muted/50"
          >
            No documents yet. Click to upload.
          </div>
        ) : (
          <div className="divide-y divide-border/70">
            {docs.map((d) => (
              <div key={d._id} className="flex items-center justify-between gap-3 py-2.5">
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-3 hover:text-primary">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded bg-primary-50 text-primary">
                    <FileText className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium">{d.name}</span>
                    <span className="block text-[12px] text-muted-foreground">
                      {[fmtSize(d.size), d.uploadedAt ? fmtDT(d.uploadedAt) : ""].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </a>
                <button type="button" aria-label={`Delete ${d.name}`} onClick={() => remove(d._id, d.name)} className="rounded p-1.5 text-destructive hover:bg-destructive/10">
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
