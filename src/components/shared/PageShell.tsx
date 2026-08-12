import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  meta?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, actions, meta, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-end lg:justify-between lg:px-7 lg:py-5",
        className,
      )}
    >
      <div className="min-w-0">
        {title ? (
          <h2 className="truncate font-[family-name:var(--font-display)] text-[20px] font-semibold tracking-tight text-slate-900">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-500">
            {description}
          </p>
        ) : null}
        {meta ? <div className="mt-2.5">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

interface PageShellProps {
  children: React.ReactNode;
  className?: string;
}

export function PageShell({ children, className }: PageShellProps) {
  return <div className={cn("flex w-full flex-1 flex-col bg-white", className)}>{children}</div>;
}

export function PageBody({ children, className }: PageShellProps) {
  return <div className={cn("flex-1 space-y-5 px-5 py-5 lg:px-7 lg:py-6", className)}>{children}</div>;
}

interface SectionProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function Section({ title, description, actions, children, className }: SectionProps) {
  return (
    <section className={cn("space-y-3", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h3 className="text-[14px] font-semibold text-slate-900">{title}</h3>
            ) : null}
            {description ? (
              <p className="mt-0.5 text-[12.5px] text-slate-500">{description}</p>
            ) : null}
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </div>
      )}
      {children}
    </section>
  );
}

export function Surface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-lg border border-border bg-card", className)}>{children}</div>
  );
}
