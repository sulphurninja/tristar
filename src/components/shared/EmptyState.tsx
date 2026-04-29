import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  secondary?: React.ReactNode;
  className?: string;
  variant?: "default" | "embedded";
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  secondary,
  className,
  variant = "default",
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        variant === "default"
          ? "rounded-xl bg-gradient-to-b from-slate-50 to-white px-6 py-16"
          : "px-6 py-10",
        className,
      )}
    >
      {icon ? (
        <div className="mb-4 inline-flex size-12 items-center justify-center rounded-xl bg-white shadow-[0_2px_8px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/60">
          {icon}
        </div>
      ) : null}
      <h3 className="text-[16px] font-semibold tracking-tight text-slate-900">{title}</h3>
      {description ? (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed text-slate-500">
          {description}
        </p>
      ) : null}
      {action || secondary ? (
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          {action}
          {secondary}
        </div>
      ) : null}
    </div>
  );
}
