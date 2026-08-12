"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";

const ACTIVITY_TYPES = [
  { value: "call", label: "Call" },
  { value: "meeting", label: "Meeting" },
  { value: "site_visit", label: "Site Visit" },
  { value: "follow_up", label: "Follow up" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Email" },
  { value: "other", label: "Other" },
];

const REMINDERS = [
  { value: "5", label: "5 Minute" },
  { value: "15", label: "15 Minute" },
  { value: "30", label: "30 Minute" },
  { value: "60", label: "1 Hour" },
  { value: "120", label: "2 Hour" },
  { value: "1440", label: "1 Day" },
];

interface UserOption {
  _id: string;
  name: string;
  role?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId?: string | null;
  leadName?: string;
  brokerId?: string | null;
  brokerName?: string;
  onCreated?: () => void;
}

function defaultDueLocal() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function titleFrom(type: string, dueLocal: string) {
  const label = ACTIVITY_TYPES.find((t) => t.value === type)?.label ?? "Task";
  const due = dueLocal ? new Date(dueLocal) : new Date();
  const nice = due.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  return `${label} at ${nice}`;
}

export function AddTaskDialog({
  open,
  onOpenChange,
  leadId,
  leadName,
  brokerId,
  brokerName,
  onCreated,
}: Props) {
  const { user } = useAuth();
  const [users, setUsers] = useState<UserOption[]>([]);
  const [type, setType] = useState("call");
  const [assignedTo, setAssignedTo] = useState("");
  const [title, setTitle] = useState("");
  const [remark, setRemark] = useState("");
  const [remindMe, setRemindMe] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [dueAt, setDueAt] = useState(defaultDueLocal);
  const [reminderMinutes, setReminderMinutes] = useState("15");
  const [titleTouched, setTitleTouched] = useState(false);
  const [saving, setSaving] = useState(false);

  const subject = leadName || brokerName || "contact";
  const heading = `Add Task for ${subject}`;

  useEffect(() => {
    if (!open) return;
    fetch("/api/users", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => setUsers(d.users ?? []))
      .catch(() => {});
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const due = defaultDueLocal();
    setType("call");
    setRemark("");
    setRemindMe(true);
    setCompleted(false);
    setDueAt(due);
    setReminderMinutes("15");
    setTitleTouched(false);
    setTitle(titleFrom("call", due));
    setAssignedTo(user?.id ?? "");
  }, [open, user?.id]);

  useEffect(() => {
    if (!titleTouched) setTitle(titleFrom(type, dueAt));
  }, [type, dueAt, titleTouched]);

  const agentOptions = useMemo(() => {
    if (user?.id && !users.some((u) => u._id === user.id)) {
      return [{ _id: user.id, name: user.name ?? "Me", role: user.role }, ...users];
    }
    return users;
  }, [users, user]);

  const submit = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          type,
          remark: remark.trim() || undefined,
          scheduleAt: dueAt ? new Date(dueAt).toISOString() : undefined,
          assignedTo: assignedTo || undefined,
          remindMe,
          reminderMinutes: Number(reminderMinutes) || 15,
          completed,
          leadId: leadId || undefined,
          brokerId: brokerId || undefined,
          entityType: brokerId && !leadId ? "broker" : "lead",
        }),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        toast.error(d.error ?? "Could not create task");
        return;
      }
      toast.success("Task created");
      onOpenChange(false);
      onCreated?.();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="z-[60] max-w-xl p-0">
        <DialogHeader className="border-b border-slate-100 px-5 py-4">
          <DialogTitle className="text-[16px] font-semibold text-slate-800">
            {heading}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-slate-600">Select Activity Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACTIVITY_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-slate-600">Select Sales Agent</Label>
              <Select value={assignedTo} onValueChange={setAssignedTo}>
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select agent" />
                </SelectTrigger>
                <SelectContent>
                  {agentOptions.map((u) => (
                    <SelectItem key={u._id} value={u._id}>
                      {u.name}
                      {u.role ? ` ( ${u.role.replace(/_/g, " ")} )` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] text-slate-600">Title</Label>
            <Input
              className="h-10"
              value={title}
              onChange={(e) => {
                setTitleTouched(true);
                setTitle(e.target.value);
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[12px] text-slate-600">Remark</Label>
            <Textarea
              rows={3}
              placeholder="Enter Remark"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
              <Label className="text-[13px] text-slate-700">Remind me?</Label>
              <Switch checked={remindMe} onCheckedChange={setRemindMe} />
            </div>
            <div className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2.5">
              <Label className="text-[13px] text-slate-700">Completed?</Label>
              <Switch checked={completed} onCheckedChange={setCompleted} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-[12px] text-slate-600">Select Due Date</Label>
              <Input
                type="datetime-local"
                className="h-10"
                value={dueAt}
                onChange={(e) => setDueAt(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[12px] text-slate-600">Reminder</Label>
              <Select
                value={reminderMinutes}
                onValueChange={setReminderMinutes}
                disabled={!remindMe}
              >
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDERS.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-slate-100 bg-slate-50/50 px-5 py-3">
          <Button onClick={submit} disabled={saving} className="min-w-24">
            {saving ? "Saving…" : "Submit"}
          </Button>
          <DialogClose asChild>
            <Button variant="secondary" disabled={saving}>
              Cancel
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
