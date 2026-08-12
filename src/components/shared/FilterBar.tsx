"use client";

import { useState } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface FilterBarProps {
  children: React.ReactNode;
  advanced?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  advancedTitle?: string;
  advancedDescription?: string;
}

export function FilterBar({
  children,
  advanced,
  actions,
  className,
  advancedTitle = "Advanced filters",
  advancedDescription = "Narrow results with additional criteria.",
}: FilterBarProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap items-end gap-2.5 rounded-lg border border-border bg-card px-4 py-3",
          className,
        )}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-end gap-2.5">{children}</div>
        <div className="flex shrink-0 items-center gap-2">
          {advanced ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => setOpen(true)}
            >
              <Filter className="size-3.5" strokeWidth={1.75} />
              More
            </Button>
          ) : null}
          {actions}
        </div>
      </div>

      {advanced ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="right" width="md" className="flex flex-col">
            <SheetHeader>
              <SheetTitle>{advancedTitle}</SheetTitle>
              <SheetDescription>{advancedDescription}</SheetDescription>
            </SheetHeader>
            <div className="mt-6 flex flex-1 flex-col gap-4 overflow-y-auto">
              {advanced}
            </div>
            <div className="mt-4 flex justify-end gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" size="sm" onClick={() => setOpen(false)}>
                <X className="mr-1.5 size-3.5" />
                Close
              </Button>
              <Button type="button" size="sm" onClick={() => setOpen(false)}>
                Apply
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      ) : null}
    </>
  );
}
