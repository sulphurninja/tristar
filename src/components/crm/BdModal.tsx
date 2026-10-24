"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

/** Buildesk-style modal: blue title bar, white body, footer slot. */
export function BdModal({
  open,
  onClose,
  title,
  children,
  footer,
  width = 640,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: number;
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-slate-900/40" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          style={{ maxWidth: width }}
          className={cn(
            "fixed left-1/2 top-1/2 z-[61] flex max-h-[92vh] w-[calc(100vw-24px)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-[3px] bg-white shadow-xl",
          )}
        >
          <div className="flex items-center justify-between border-b border-[#eef0f6] px-5 py-3.5">
            <DialogPrimitive.Title className="text-[16px] font-medium text-[#2b2f3a]">{title}</DialogPrimitive.Title>
            <DialogPrimitive.Close className="text-[#7c8296] hover:text-[#2b2f3a]" aria-label="Close">
              <X className="size-4" />
            </DialogPrimitive.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
          {footer ? (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[#eef0f6] px-5 py-3">{footer}</div>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
