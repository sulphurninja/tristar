"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BdField, BdSelect, BdInput } from "@/components/bd";
import { useDirectory } from "@/components/bd/TeamAgentSelects";
import { Modal, ModalActions } from "@/components/leads/ui/primitives";
import { useLeadOptions } from "@/components/leads/types";

/** Confirm / destructive prompt. */
export function ConfirmDialog({
  open,
  onClose,
  title,
  message,
  confirmLabel = "Confirm",
  danger,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={440}
      footer={
        <ModalActions
          onCancel={onClose}
          busy={busy}
          danger={danger}
          submitLabel={confirmLabel}
          onSubmit={async () => {
            setBusy(true);
            try {
              await onConfirm();
              onClose();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Something went wrong");
            } finally {
              setBusy(false);
            }
          }}
        />
      }
    >
      <div className="text-[14px] text-[#2b2f3a]">{message}</div>
    </Modal>
  );
}

/** Pick one workspace user (Transfer Lead / Add Owner / Remove Lead Owner / pre-sales agent). */
export function UserPickDialog({
  open,
  onClose,
  title,
  fieldLabel = "Sales Agent",
  placeholder = "Select Sales Agent",
  confirmLabel = "Save",
  onlyIds,
  excludeIds,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  fieldLabel?: string;
  placeholder?: string;
  confirmLabel?: string;
  /** Restrict choices to these user ids (e.g. current owners when removing). */
  onlyIds?: string[];
  excludeIds?: string[];
  onConfirm: (userId: string) => Promise<void>;
}) {
  const { users } = useDirectory();
  const [uid, setUid] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setUid("");
  }, [open]);
  const list = users
    .filter((u) => u.status !== "suspended")
    .filter((u) => !onlyIds || onlyIds.includes(u._id))
    .filter((u) => !excludeIds || !excludeIds.includes(u._id));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      width={440}
      footer={
        <ModalActions
          onCancel={onClose}
          busy={busy}
          disabled={!uid}
          submitLabel={confirmLabel}
          onSubmit={async () => {
            setBusy(true);
            try {
              await onConfirm(uid);
              onClose();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Something went wrong");
            } finally {
              setBusy(false);
            }
          }}
        />
      }
    >
      <BdField label={fieldLabel}>
        <BdSelect
          value={uid}
          onChange={setUid}
          placeholder={placeholder}
          options={list.map((u) => ({ value: u._id, label: u.name }))}
        />
      </BdField>
      {list.length === 0 ? <p className="mt-3 text-[13px] text-[#8b90a0]">No users available.</p> : null}
    </Modal>
  );
}

/** Link a Broker / Channel Partner to the lead. */
export function ChannelPartnerDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: (brokerId: string) => Promise<void>;
}) {
  const opts = useLeadOptions();
  const [id, setId] = useState("");
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setId("");
      setQ("");
    }
  }, [open]);
  const list = opts.brokers.filter((b) => !q || `${b.name} ${b.firmName ?? ""} ${b.phone ?? ""}`.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Channel Partner"
      width={460}
      footer={
        <ModalActions
          onCancel={onClose}
          busy={busy}
          disabled={!id}
          submitLabel="Add"
          onSubmit={async () => {
            setBusy(true);
            try {
              await onConfirm(id);
              onClose();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Something went wrong");
            } finally {
              setBusy(false);
            }
          }}
        />
      }
    >
      <BdField label="Search Channel Partner">
        <BdInput value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, company or mobile" />
      </BdField>
      <div className="mt-3 max-h-[260px] overflow-y-auto rounded-[3px] border border-[#e3e6ef]">
        {list.length === 0 ? (
          <p className="px-3 py-6 text-center text-[13px] text-[#8b90a0]">No channel partners found</p>
        ) : (
          list.slice(0, 200).map((b) => (
            <label
              key={b._id}
              className="flex cursor-pointer items-center gap-3 border-b border-[#f0f2f8] px-3 py-2 last:border-0 hover:bg-[#f6f8fd]"
            >
              <input type="radio" name="cp" checked={id === b._id} onChange={() => setId(b._id)} className="accent-[#3a5dc2]" />
              <span className="text-[13.5px]">
                {b.name}
                {b.firmName ? <span className="text-[#8b90a0]"> - {b.firmName}</span> : null}
                {b.phone ? <span className="block text-[12px] text-[#8b90a0]">{b.phone}</span> : null}
              </span>
            </label>
          ))
        )}
      </div>
    </Modal>
  );
}
