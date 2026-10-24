import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const TaskSchema = new Schema(
  {
    workspaceId: { type: Schema.Types.ObjectId, ref: "Workspace", required: true, index: true },
    leadId: { type: Schema.Types.ObjectId, ref: "Lead", index: true },
    brokerId: { type: Schema.Types.ObjectId, ref: "Broker", index: true },
    title: { type: String, required: true },
    type: {
      type: String,
      enum: ["call", "meeting", "site_visit", "follow_up", "whatsapp", "email", "other"],
      default: "call",
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "upcoming", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    scheduleAt: { type: Date, index: true },
    completedAt: Date,
    completedBy: { type: Schema.Types.ObjectId, ref: "User" },
    rescheduleCount: { type: Number, default: 0 },
    remindMe: { type: Boolean, default: true },
    reminderMinutes: { type: Number, default: 15 },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User" },
    remark: String,
    entityType: { type: String, enum: ["lead", "contact", "broker", "other"], default: "lead" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

TaskSchema.index({ workspaceId: 1, scheduleAt: -1 });
TaskSchema.index({ workspaceId: 1, status: 1, assignedTo: 1 });

// Dev only: re-register on hot reload so schema edits are picked up.
if (process.env.NODE_ENV !== "production") delete mongoose.models.Task;

export type TaskDoc = InferSchemaType<typeof TaskSchema> & { _id: mongoose.Types.ObjectId };

const Task =
  (mongoose.models.Task as Model<TaskDoc>) || mongoose.model<TaskDoc>("Task", TaskSchema);

export default Task;
