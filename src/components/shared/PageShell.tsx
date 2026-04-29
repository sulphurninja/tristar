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
        "flex flex-col gap-4 border-b border-slate-200/70 px-6 py-5 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-6",
        className,
      )}
    >
      <div className="min-w-0">
        {title ? (
          <h2 className="truncate text-[22px] font-bold tracking-tight text-slate-900">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p className="mt-1 max-w-2xl text-[13px] leading-relaxed text-slate-500">
            {description}
          </p>
        ) : null}
        {meta ? <div className="mt-3">{meta}</div> : null}
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
  return <div className={cn("flex-1 px-6 py-6 lg:px-8 lg:py-8", className)}>{children}</div>;
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
    <section className={cn("space-y-4", className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            {title ? (
              <h3 className="text-[15px] font-semibold text-slate-900">{title}</h3>
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
