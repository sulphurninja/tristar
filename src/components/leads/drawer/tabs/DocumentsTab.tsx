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
    <div className="rounded-[3px] border border-[#e6e9f2] bg-white">
      <header className="flex items-center justify-between border-b border-[#eef0f6] px-5 py-3.5">
        <div>
          <h3 className="text-[16px] font-semibold text-[#2b2f3a]">Documents</h3>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-[#6b7186]">KYC, agreements and other files (max {MAX_MB} MB each)</p>
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
            className="cursor-pointer rounded-[3px] border-2 border-dashed border-[#dfe3ee] py-10 text-center text-[13px] text-[#8b90a0] hover:bg-[#f6f8fd]"
          >
            No documents yet. Click to upload.
          </div>
        ) : (
          <div className="divide-y divide-[#eef0f6]">
            {docs.map((d) => (
              <div key={d._id} className="flex items-center justify-between gap-3 py-2.5">
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-3 hover:text-[#3a5dc2]">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded bg-[#eef1fa] text-[#3a5dc2]">
                    <FileText className="size-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium">{d.name}</span>
                    <span className="block text-[12px] text-[#8b90a0]">
                      {[fmtSize(d.size), d.uploadedAt ? fmtDT(d.uploadedAt) : ""].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </a>
                <button type="button" aria-label={`Delete ${d.name}`} onClick={() => remove(d._id, d.name)} className="rounded p-1.5 text-[#c93c41] hover:bg-[#fdecec]">
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
