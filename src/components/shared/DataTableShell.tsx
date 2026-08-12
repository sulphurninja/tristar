"use client";

import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTableShellProps {
  title: string;
  count?: number;
  actions?: React.ReactNode;
  search?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  children: React.ReactNode;
  className?: string;
  toolbar?: React.ReactNode;
  footer?: React.ReactNode;
}

function PaginationControls({
  page,
  totalPages,
  onPageChange,
  pageSize,
  onPageSizeChange,
}: {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}) {
  const pages = Math.max(totalPages, 1);
  const windowStart = Math.max(1, page - 2);
  const windowEnd = Math.min(pages, windowStart + 4);
  const nums: number[] = [];
  for (let i = windowStart; i <= windowEnd; i++) nums.push(i);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2.5"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="size-3.5" />
        Previous
      </Button>
      {nums.map((n) => (
        <Button
          key={n}
          type="button"
          variant={n === page ? "default" : "outline"}
          size="sm"
          className="h-8 w-8 px-0"
          onClick={() => onPageChange(n)}
        >
          {n}
        </Button>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 gap-1 px-2.5"
        disabled={page >= pages}
        onClick={() => onPageChange(page + 1)}
      >
        Next
        <ChevronRight className="size-3.5" />
      </Button>
      {onPageSizeChange ? (
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="ml-1 h-8 rounded-md border border-slate-200 bg-white px-2 text-[12.5px] text-slate-700"
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}

export function DataTableShell({
  title,
  count,
  actions,
  search,
  onSearchChange,
  searchPlaceholder = "Search…",
  pageSize = 20,
  onPageSizeChange,
  page = 1,
  totalPages = 1,
  onPageChange,
  children,
  className,
  toolbar,
  footer,
}: DataTableShellProps) {
  return (
    <section
      className={cn(
        "flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 px-4 py-3">
        <h3 className="text-[15px] font-semibold text-slate-900">
          {title}
          {typeof count === "number" ? (
            <span className="ml-1.5 font-normal text-slate-500">
              ({count.toLocaleString()})
            </span>
          ) : null}
        </h3>
        <div className="flex flex-wrap items-center gap-2">{actions}</div>
      </div>

      {(onSearchChange || onPageChange || toolbar) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/60 px-4 py-2.5">
          <div className="flex flex-wrap items-center gap-2">
            {onPageChange ? (
              <PaginationControls
                page={page}
                totalPages={totalPages}
                onPageChange={onPageChange}
                pageSize={pageSize}
                onPageSizeChange={onPageSizeChange}
              />
            ) : null}
            {toolbar}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {onSearchChange ? (
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
                <Input
                  value={search ?? ""}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-8 w-56 pl-8 text-[13px]"
                />
              </div>
            ) : null}
          </div>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-auto">{children}</div>

      {(onPageChange || footer) && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-slate-50/40 px-4 py-2.5">
          <div className="text-[12.5px] text-slate-500">
            {typeof count === "number"
              ? `${count.toLocaleString()} record${count === 1 ? "" : "s"}`
              : null}
          </div>
          <div className="flex items-center gap-3">
            {footer}
            {onPageChange ? (
              <PaginationControls
                page={page}
                totalPages={totalPages}
                onPageChange={onPageChange}
                pageSize={pageSize}
                onPageSizeChange={onPageSizeChange}
              />
            ) : null}
          </div>
        </div>
      )}
    </section>
  );
}

export function TableRoot({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <table className={cn("w-full min-w-[960px] border-collapse text-left text-[13px]", className)}>
      {children}
    </table>
  );
}

export function Th({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <th
      className={cn(
        "sticky top-0 z-[1] whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-slate-500",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("border-b border-slate-100 px-3 py-3 align-middle text-slate-700", className)}>
      {children}
    </td>
  );
}
