"use client";

export const dynamic = "force-dynamic";

import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import {
  BdPage,
  BdCard,
  BdButton,
  BdTable,
  BdTh,
  BdTd,
  BdEmptyRow,
  BdTableToolbar,
} from "@/components/bd";
import { BdKebab, BdRowActions, BdModal, BdConfirm } from "@/components/bd/BdOverlays";
import { CompanyDialog, type CompanyRow } from "@/components/brokers/CompanyDialog";
import { CpFormDialog } from "@/components/brokers/CpFormDialog";
import { toCsv, downloadCsv } from "@/lib/bd-csv";
import { parseCsv } from "@/lib/bd-csv";

const HEADERS = ["Company ID", "Company", "Owner", "Mobile", "Email", "Category", "RERA Number", "Address"];

/** Map a CSV header cell to a company field. */
function fieldFor(h: string): string | null {
  const k = h.toLowerCase().replace(/[^a-z]/g, "");
  if (["company", "companyname", "name"].includes(k)) return "name";
  if (k === "owner") return "owner";
  if (["mobile", "phone", "mobileno"].includes(k)) return "mobile";
  if (k === "email") return "email";
  if (k === "category") return "category";
  if (["reranumber", "rera", "reranumbers"].includes(k)) return "reraNumber";
  if (k === "address") return "address";
  return null;
}

function CompaniesInner() {
  const router = useRouter();
  const [rows, setRows] = useState<CompanyRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [qd, setQd] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyRow | null>(null);
  const [cpFor, setCpFor] = useState<string | null>(null);
  const [del, setDel] = useState<CompanyRow | null>(null);
  const [busy, setBusy] = useState(false);

  const [importOpen, setImportOpen] = useState(false);
  const [preview, setPreview] = useState<Array<Record<string, string>>>([]);
  const [importErr, setImportErr] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setQd(q), 300);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    setLoading(true);
    const u = new URLSearchParams({ limit: String(pageSize), skip: String((page - 1) * pageSize) });
    if (qd) u.set("q", qd);
    fetch(`/api/cp-companies?${u}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        setRows(d.companies ?? []);
        setTotal(d.total ?? 0);
      })
      .catch(() => toast.error("Could not load companies"))
      .finally(() => setLoading(false));
  }, [qd, page, pageSize]);

  useEffect(load, [load]);
  useEffect(() => setPage(1), [qd, pageSize]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const exportCsv = async () => {
    const t = toast.loading("Preparing export…");
    try {
      const u = new URLSearchParams({ export: "1" });
      if (qd) u.set("q", qd);
      const d = await fetch(`/api/cp-companies?${u}`, { cache: "no-store" }).then((r) => r.json());
      const list: CompanyRow[] = d.companies ?? [];
      downloadCsv(
        "channel-partner-companies.csv",
        toCsv(
          HEADERS,
          list.map((c) => [c.companyId, c.name, c.owner ?? "", c.mobile ?? "", c.email ?? "", c.category ?? "", c.reraNumber ?? "", c.address ?? ""]),
        ),
      );
      toast.success(`Exported ${list.length} companies`, { id: t });
    } catch {
      toast.error("Export failed", { id: t });
    }
  };

  const onFile = async (file?: File) => {
    setImportErr("");
    setPreview([]);
    if (!file) return;
    const text = await file.text();
    const table = parseCsv(text);
    if (table.length < 2) return setImportErr("The file has no data rows.");
    const map = table[0].map(fieldFor);
    if (!map.includes("name")) return setImportErr('A "Company" column is required in the header row.');
    const out = table.slice(1).map((r) => {
      const o: Record<string, string> = {};
      map.forEach((f, i) => {
        if (f) o[f] = (r[i] ?? "").trim();
      });
      return o;
    });
    setPreview(out);
  };

  const doImport = async () => {
    setBusy(true);
    try {
      const res = await fetch("/api/cp-companies/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: preview }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(d.error ?? "Import failed");
      toast.success(`Imported ${d.created} companies${d.skipped ? `, ${d.skipped} duplicates skipped` : ""}${d.errors?.length ? `, ${d.errors.length} invalid rows` : ""}`);
      setImportOpen(false);
      setPreview([]);
      load();
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!del) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/cp-companies/${del._id}`, { method: "DELETE" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) return toast.error(d.error ?? "Could not delete company");
      toast.success("Company deleted");
      setDel(null);
      load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <BdPage>
      <BdCard
        title={`Channel Partner Company (${total})`}
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center overflow-hidden rounded-[3px] bg-[#3a5dc2] text-[13px] font-medium text-white hover:bg-[#2f4ca0]"
            >
              <span className="flex size-[34px] items-center justify-center bg-[#2f4ca0]">
                <Plus className="size-4" />
              </span>
              <span className="px-3">Add Company</span>
            </button>
            <BdKebab
              items={[
                { label: "Export CSV", onSelect: exportCsv },
                { label: "Import CSV", onSelect: () => setImportOpen(true) },
                { label: "Refresh", onSelect: load },
              ]}
            />
          </>
        }
      >
        <BdTableToolbar
          page={page}
          totalPages={totalPages}
          onPage={setPage}
          search={q}
          onSearch={setQ}
          pageSize={pageSize}
          onPageSize={setPageSize}
        />
        <BdTable minWidth={1100}>
          <thead>
            <tr>
              <BdTh>SR. NO.</BdTh>
              <BdTh>COMPANY ID</BdTh>
              <BdTh>COMPANY</BdTh>
              <BdTh>OWNER</BdTh>
              <BdTh>MOBILE</BdTh>
              <BdTh>EMAIL</BdTh>
              <BdTh>CATEGORY</BdTh>
              <BdTh>RERA NUMBER</BdTh>
              <BdTh>ADDRESS</BdTh>
              <BdTh>ACTION</BdTh>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <BdEmptyRow colSpan={10} loading={loading} />
            ) : (
              rows.map((c, i) => (
                <tr key={c._id}>
                  <BdTd>{(page - 1) * pageSize + i + 1}</BdTd>
                  <BdTd>{c.companyId}</BdTd>
                  <BdTd>{c.name}</BdTd>
                  <BdTd>{c.owner || "-"}</BdTd>
                  <BdTd className="whitespace-nowrap">{c.mobile ? (c.mobile.startsWith("91-") || c.mobile.startsWith("+") ? c.mobile : `91-${c.mobile.replace(/\D/g, "").slice(-10)}`) : "-"}</BdTd>
                  <BdTd>{c.email || "-"}</BdTd>
                  <BdTd>{c.category || ""}</BdTd>
                  <BdTd>{c.reraNumber || "-"}</BdTd>
                  <BdTd>{c.address || "-"}</BdTd>
                  <BdTd>
                    <BdRowActions
                      items={[
                        {
                          label: "Edit",
                          onSelect: () => {
                            setEditing(c);
                            setFormOpen(true);
                          },
                        },
                        { label: `View Channel Partners${c.cpCount ? ` (${c.cpCount})` : ""}`, onSelect: () => router.push(`/brokers?companyId=${c._id}`) },
                        { label: "Add Channel Partner", onSelect: () => setCpFor(c._id) },
                        { label: "Delete", danger: true, onSelect: () => setDel(c) },
                      ]}
                    />
                  </BdTd>
                </tr>
              ))
            )}
          </tbody>
        </BdTable>
      </BdCard>

      <CompanyDialog open={formOpen} company={editing} onClose={() => setFormOpen(false)} onSaved={load} />
      <CpFormDialog
        open={!!cpFor}
        defaultCompanyId={cpFor ?? undefined}
        onClose={() => setCpFor(null)}
        onSaved={() => {
          load();
          toast.success("Channel partner added to company");
        }}
      />
      <BdConfirm
        open={!!del}
        message={`Delete company "${del?.name}"? This cannot be undone.`}
        busy={busy}
        onClose={() => setDel(null)}
        onConfirm={remove}
      />
      <BdModal
        open={importOpen}
        title="Import Companies (CSV)"
        onClose={() => setImportOpen(false)}
        width={900}
        footer={
          <>
            <BdButton variant="light" onClick={() => setImportOpen(false)}>
              Cancel
            </BdButton>
            <BdButton disabled={busy || preview.length === 0} onClick={doImport}>
              {busy ? "Importing…" : `Import ${preview.length || ""} rows`}
            </BdButton>
          </>
        }
      >
        <p className="mb-3 text-[13px] text-[#5a6072]">
          Header row columns: Company (required), Owner, Mobile, Email, Category, RERA Number, Address. Companies with the same name and mobile are skipped.
        </p>
        <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={(e) => onFile(e.target.files?.[0])} className="text-[13px]" />
        {importErr ? <p className="mt-3 text-[13px] text-[#e5484d]">{importErr}</p> : null}
        {preview.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-[13px] font-medium">
              Preview (first {Math.min(10, preview.length)} of {preview.length} rows)
            </p>
            <BdTable minWidth={760}>
              <thead>
                <tr>
                  <BdTh>COMPANY</BdTh>
                  <BdTh>OWNER</BdTh>
                  <BdTh>MOBILE</BdTh>
                  <BdTh>EMAIL</BdTh>
                  <BdTh>CATEGORY</BdTh>
                  <BdTh>RERA NUMBER</BdTh>
                  <BdTh>ADDRESS</BdTh>
                </tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    <BdTd>{r.name || <span className="text-[#e5484d]">missing</span>}</BdTd>
                    <BdTd>{r.owner || "-"}</BdTd>
                    <BdTd>{r.mobile || "-"}</BdTd>
                    <BdTd>{r.email || "-"}</BdTd>
                    <BdTd>{r.category || "-"}</BdTd>
                    <BdTd>{r.reraNumber || "-"}</BdTd>
                    <BdTd>{r.address || "-"}</BdTd>
                  </tr>
                ))}
              </tbody>
            </BdTable>
          </div>
        ) : null}
      </BdModal>
    </BdPage>
  );
}

export default function CompaniesPage() {
  return (
    <Suspense fallback={null}>
      <CompaniesInner />
    </Suspense>
  );
}
