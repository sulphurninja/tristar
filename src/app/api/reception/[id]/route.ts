import mongoose from "mongoose";
import Reception, { RECEPTION_PURPOSES, RECEPTION_STATUSES } from "@/models/Reception";
import Project from "@/models/Project";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole } from "@/lib/auth";
import { createWalkinLead, findLeadByPhone } from "@/lib/reception-lead";

/**
 * PATCH body: { action: "mark_met" | "check_out" | "set_status" | "convert_to_lead" | "update", ... }
 */
export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const b = (await req.json()) as Record<string, unknown>;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const userId = new mongoose.Types.ObjectId(session.userId);
  const visit = await Reception.findOne({ _id: params.id, workspaceId });
  if (!visit) return bad("Visitor not found", 404);
  const now = new Date();
  let message: string | undefined;

  switch (b.action) {
    case "mark_met":
      if (visit.visitStatus === "completed" || visit.visitStatus === "left") return bad("This visit is already closed.");
      visit.visitStatus = "met";
      visit.metAt = now;
      break;
    case "check_out":
      if (visit.checkOutAt) return bad("Visitor is already checked out.");
      // A visitor who was met leaves as Completed; one who never met anyone is marked Left.
      visit.visitStatus = visit.visitStatus === "met" ? "completed" : "left";
      visit.checkOutAt = now;
      break;
    case "set_status": {
      if (!(RECEPTION_STATUSES as readonly string[]).includes(b.status as string)) return bad("Invalid status.");
      visit.visitStatus = b.status as (typeof RECEPTION_STATUSES)[number];
      if (b.status === "met" && !visit.metAt) visit.metAt = now;
      if ((b.status === "completed" || b.status === "left") && !visit.checkOutAt) visit.checkOutAt = now;
      if (b.status === "waiting" || b.status === "met") visit.checkOutAt = undefined;
      break;
    }
    case "convert_to_lead": {
      if (visit.leadId) return bad("This visitor is already linked to a lead.");
      const existing = await findLeadByPhone(workspaceId, visit.visitorPhone);
      if (existing) {
        visit.leadId = existing._id;
        message = `Linked to existing lead ${existing.leadNumber ?? ""}`.trim();
      } else {
        const lead = await createWalkinLead({
          workspaceId,
          userId,
          name: visit.visitorName,
          phone: visit.visitorPhone,
          email: visit.visitorEmail ?? undefined,
          projectId: visit.projectId ?? undefined,
          assignedTo: visit.meetWith ?? undefined,
          description: visit.remarks ?? undefined,
        });
        visit.leadId = lead._id;
        message = `Lead ${lead.leadNumber} created`;
      }
      break;
    }
    case "update": {
      if (typeof b.visitorName === "string" && b.visitorName.trim()) visit.visitorName = b.visitorName.trim();
      if (typeof b.visitorPhone === "string" && b.visitorPhone.trim()) visit.visitorPhone = b.visitorPhone.trim();
      if (typeof b.visitorEmail === "string") visit.visitorEmail = b.visitorEmail.trim().toLowerCase() || undefined;
      if (typeof b.remarks === "string") visit.remarks = b.remarks;
      if (b.visitorCount !== undefined) visit.visitorCount = Math.max(1, Number(b.visitorCount) || 1);
      if ((RECEPTION_PURPOSES as readonly string[]).includes(b.purpose as string)) {
        visit.purpose = b.purpose as (typeof RECEPTION_PURPOSES)[number];
      }
      if (typeof b.source === "string" && b.source) visit.source = b.source;
      if (typeof b.projectId === "string") {
        if (b.projectId === "") {
          visit.projectId = undefined;
          visit.projectName = undefined;
        } else if (mongoose.isValidObjectId(b.projectId)) {
          const p = await Project.findOne({ _id: b.projectId, workspaceId }).select("name").lean();
          if (!p) return bad("Project not found.");
          visit.projectId = p._id;
          visit.projectName = p.name;
        }
      }
      if (typeof b.meetWith === "string") {
        if (b.meetWith === "") {
          visit.meetWith = undefined;
          visit.meetWithName = undefined;
        } else if (mongoose.isValidObjectId(b.meetWith)) {
          const u = await User.findOne({ _id: b.meetWith, workspaceId }).select("name").lean();
          if (!u) return bad("User not found.");
          visit.meetWith = u._id;
          visit.meetWithName = u.name;
        }
      }
      break;
    }
    default:
      return bad("Unknown action.");
  }
  await visit.save();
  return ok({ visit, message });
});

export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  if (!hasRole(session.role, "supervisor")) return bad("Only supervisors and above can delete visitor records.", 403);
  const r = await Reception.findOneAndDelete({ _id: params.id, workspaceId: session.workspaceId });
  if (!r) return bad("Visitor not found", 404);
  return ok({ ok: true });
});
