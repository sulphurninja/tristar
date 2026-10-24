import mongoose from "mongoose";
import Lead from "@/models/Lead";
import { withAuth, bad } from "@/lib/api";
import { buildLeadFilter } from "@/lib/lead-filters";
import { hasRole } from "@/lib/auth";

const esc = (v: unknown) => {
  let s = v == null ? "" : String(v);
  // CSV formula-injection guard (phone numbers like +91... are left alone)
  if (/^[=+\-@]/.test(s) && !/^\+?[0-9][0-9\s-]*$/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const dt = (d?: Date | string | null) => (d ? new Date(d).toISOString().replace("T", " ").slice(0, 19) : "");

/** Export every lead matching the current filters (max 50,000 rows). */
export const GET = withAuth(async ({ req, session }) => {
  if (!hasRole(session.role, "supervisor")) return bad("You need supervisor access to export leads.", 403);
  const p = new URL(req.url).searchParams;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const { filter } = await buildLeadFilter(workspaceId, p, session.userId);
  const rows = await Lead.find(filter)
    .select(
      "leadNumber contact stage source tags createdAt assignedAt assignedTo primaryProjectId category priority nextActionAt lastContactedAt",
    )
    .sort({ createdAt: -1 })
    .limit(50_000)
    .populate({ path: "primaryProjectId", select: "name" })
    .populate({ path: "assignedTo", select: "name" })
    .lean();
  const head = [
    "Lead No", "Name", "Phone", "Email", "Stage", "Source", "Project", "Assigned To", "Category",
    "Priority", "Tags", "Created Date", "Assigned Date", "Last Contacted", "Next Followup",
  ];
  const lines = [head.map(esc).join(",")];
  for (const l of rows) {
    const proj = l.primaryProjectId as unknown as { name?: string } | null;
    const asg = l.assignedTo as unknown as { name?: string } | null;
    lines.push(
      [
        l.leadNumber, l.contact?.name, l.contact?.primaryPhone, l.contact?.email, l.stage, l.source?.primary,
        proj?.name, asg?.name, l.category, l.priority, (l.tags ?? []).join("; "),
        dt(l.createdAt), dt(l.assignedAt), dt(l.lastContactedAt), dt(l.nextActionAt),
      ]
        .map(esc)
        .join(","),
    );
  }
  return new Response("﻿" + lines.join("\r\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="leads-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
});
