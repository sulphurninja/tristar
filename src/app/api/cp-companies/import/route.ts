import mongoose from "mongoose";
import CpCompany from "@/models/CpCompany";
import { withAuth, ok, bad } from "@/lib/api";
import { str } from "@/lib/cp";

/** Bulk-create companies from parsed CSV rows. Rows whose name+mobile already exist are skipped. */
export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as { rows?: Array<Record<string, unknown>> };
  const rows = Array.isArray(body.rows) ? body.rows : [];
  if (!rows.length) return bad("No rows to import.");
  if (rows.length > 5000) return bad("Import at most 5000 rows at a time.");
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);

  const existing = await CpCompany.find({ workspaceId }).select("name mobile companyId").lean();
  const seen = new Set(existing.map((c) => `${c.name.toLowerCase()}|${c.mobile ?? ""}`));
  let next = Math.max(0, ...existing.map((c) => c.companyId)) + 1;

  const docs: Record<string, unknown>[] = [];
  let skipped = 0;
  const errors: string[] = [];
  rows.forEach((r, i) => {
    const name = str(r.name);
    if (!name) {
      errors.push(`Row ${i + 1}: company name missing`);
      return;
    }
    const mobile = str(r.mobile) || undefined;
    const key = `${name.toLowerCase()}|${mobile ?? ""}`;
    if (seen.has(key)) {
      skipped++;
      return;
    }
    seen.add(key);
    docs.push({
      workspaceId,
      companyId: next++,
      name,
      owner: str(r.owner) || undefined,
      mobile,
      email: str(r.email) || undefined,
      category: str(r.category) || undefined,
      reraNumber: str(r.reraNumber) || undefined,
      address: str(r.address) || undefined,
      createdBy: userId,
    });
  });
  if (docs.length) await CpCompany.insertMany(docs);
  return ok({ created: docs.length, skipped, errors });
});
