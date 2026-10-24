import mongoose from "mongoose";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import Task from "@/models/Task";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";
import { hasRole } from "@/lib/auth";

/**
 * PATCH body: { action: "set_status", status: "lead" | "unqualified" }
 *           | { action: "convert_back" }
 *           | { action: "update", name?, phone?, email?, assignedTo?, projectId?, description? }
 */
export const PATCH = withAuth<{ id: string }>(async ({ req, session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  const body = (await req.json()) as Record<string, unknown>;
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const lead = await Lead.findOne({ _id: params.id, workspaceId, isContact: true });
  if (!lead) return bad("Contact not found", 404);

  const userId = new mongoose.Types.ObjectId(session.userId);
  const actor = await User.findById(userId).select("name").lean();
  const log = (description: string) =>
    LeadActivity.create({
      workspaceId,
      leadId: lead._id,
      actorId: userId,
      actorName: actor?.name,
      actorType: "user",
      type: "field_updated",
      description,
      occurredAt: new Date(),
    });

  switch (body.action) {
    case "set_status": {
      if (body.status !== "lead" && body.status !== "unqualified") return bad("Invalid status.");
      lead.contactStatus = body.status;
      await lead.save();
      await log(`Contact marked ${body.status === "lead" ? "Lead" : "Unqualified"}.`);
      break;
    }
    case "convert_back": {
      lead.isContact = false;
      lead.convertedToContactAt = undefined;
      await lead.save();
      await log("Contact converted back to lead.");
      break;
    }
    case "update": {
      if (typeof body.name === "string" && body.name.trim()) {
        const n = body.name.trim();
        lead.contact.name = n;
        lead.contact.firstName = n.split(" ")[0];
        lead.contact.lastName = n.split(" ").slice(1).join(" ");
      }
      if (typeof body.phone === "string" && body.phone.trim()) lead.contact.primaryPhone = body.phone.trim();
      if (typeof body.email === "string") {
        const e = body.email.trim().toLowerCase();
        if (e && !/^\S+@\S+\.\S+$/.test(e)) return bad("Enter a valid email address.");
        lead.contact.email = e || undefined;
      }
      if (typeof body.description === "string") lead.description = body.description;
      if (typeof body.assignedTo === "string" && mongoose.isValidObjectId(body.assignedTo)) {
        const u = await User.findOne({ _id: body.assignedTo, workspaceId }).select("_id").lean();
        if (!u) return bad("Agent not found.");
        lead.assignedTo = u._id;
        lead.assignedAt = new Date();
      }
      if (typeof body.projectId === "string") {
        if (body.projectId === "") {
          lead.primaryProjectId = undefined;
        } else if (mongoose.isValidObjectId(body.projectId)) {
          lead.primaryProjectId = new mongoose.Types.ObjectId(body.projectId);
        }
      }
      await lead.save();
      await log("Contact details updated.");
      break;
    }
    default:
      return bad("Unknown action.");
  }
  return ok({ contact: lead });
});

/** Permanently removes a contact together with its activity log and tasks. */
export const DELETE = withAuth<{ id: string }>(async ({ session, params }) => {
  if (!mongoose.isValidObjectId(params.id)) return bad("Invalid id");
  if (!hasRole(session.role, "manager")) return bad("Only managers and above can delete contacts.", 403);
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const lead = await Lead.findOneAndDelete({ _id: params.id, workspaceId, isContact: true });
  if (!lead) return bad("Contact not found", 404);
  await Promise.all([
    LeadActivity.deleteMany({ workspaceId, leadId: lead._id }),
    Task.deleteMany({ workspaceId, leadId: lead._id }),
  ]);
  return ok({ ok: true });
});
