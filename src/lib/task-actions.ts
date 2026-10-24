import mongoose from "mongoose";
import Lead from "@/models/Lead";
import LeadActivity from "@/models/LeadActivity";
import type { TaskDoc } from "@/models/Task";

const CHANNEL: Record<string, "call" | "whatsapp" | "email" | "site_visit" | "meeting"> = {
  call: "call",
  whatsapp: "whatsapp",
  email: "email",
  site_visit: "site_visit",
  meeting: "meeting",
};

/** Side effects of completing a task: lead timeline entry + lastContactedAt. */
export async function recordTaskCompleted(
  task: Pick<TaskDoc, "_id" | "workspaceId" | "leadId" | "title" | "type" | "remark">,
  userId: string,
  userName?: string,
) {
  if (!task.leadId) return;
  const now = new Date();
  const set: Record<string, unknown> = { lastContactedAt: now };
  const ch = CHANNEL[task.type as string];
  if (ch) set.lastContactChannel = ch;
  await Lead.updateOne({ _id: task.leadId, workspaceId: task.workspaceId }, { $set: set });
  await LeadActivity.create({
    workspaceId: task.workspaceId,
    leadId: task.leadId,
    actorId: new mongoose.Types.ObjectId(userId),
    actorName: userName,
    actorType: "user",
    type: "other",
    description: `Task completed: ${task.title}${task.remark ? ` — ${task.remark}` : ""}`,
    metadata: { taskId: String(task._id), taskType: task.type },
    occurredAt: now,
  });
}
