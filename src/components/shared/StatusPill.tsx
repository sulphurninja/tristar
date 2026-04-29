import { cn } from "@/lib/utils";

type Tone = "neutral" | "info" | "success" | "warning" | "danger" | "primary";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200/60",
  info: "bg-sky-50 text-sky-700 ring-sky-200/60",
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
  warning: "bg-amber-50 text-amber-700 ring-amber-200/60",
  danger: "bg-red-50 text-red-700 ring-red-200/60",
  primary: "bg-emerald-50 text-emerald-700 ring-emerald-200/60",
};

const dotClasses: Record<Tone, string> = {
  neutral: "bg-slate-400",
  info: "bg-sky-500",
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  primary: "bg-emerald-500",
};

interface Props {
  children: React.ReactNode;
  tone?: Tone;
  dot?: boolean;
  className?: string;
}

export function StatusPill({ children, tone = "neutral", dot, className }: Props) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset",
        toneClasses[tone],
        className,
      )}
    >
      {dot ? <span className={cn("size-1.5 rounded-full", dotClasses[tone])} /> : null}
      {children}
    </span>
  );
}
