import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import {
  HeroProductPlane,
  PipelineShowcase,
  VisitTaskShowcase,
} from "@/components/marketing/ProductShowcases";
import { marketingTypeClass } from "@/components/marketing/marketing-fonts";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`min-h-screen w-full bg-white ${marketingTypeClass()}`}>
      <div className="grid min-h-screen lg:grid-cols-2">
        <div className="relative flex flex-col px-6 py-7 sm:px-10 lg:px-14">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex" aria-label="Tristar Realtors home">
              <Logo size="md" />
            </Link>
            <Link
              href="mailto:support@tristarrealtors.in"
              className="text-[13px] font-medium text-slate-500 hover:text-slate-800"
            >
              Need help?
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-[420px]">{children}</div>
          </div>

          <div className="flex items-center justify-between text-[11.5px] text-slate-400">
            <p>© {new Date().getFullYear()} Tristar Realtors</p>
            <Link href="/" className="hover:text-slate-700">
              ← Back to home
            </Link>
          </div>
        </div>

        <div className="relative hidden overflow-hidden border-l border-slate-200/70 lg:block">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-white to-sky-50" />
          <div className="absolute inset-0 bg-grid opacity-35" />

          <div className="relative flex h-full flex-col justify-between p-10 xl:p-12">
            <div>
              <p className="font-display text-[2rem] font-semibold leading-tight tracking-tight text-slate-900 xl:text-[2.35rem]">
                Same CRM your team{" "}
                <span className="text-brand-gradient">already runs on.</span>
              </p>
              <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-slate-600">
                Leads, pipeline, visits and reports — sign in to pick up where you left off.
              </p>
            </div>

            <div className="mt-10 space-y-4">
              <div className="origin-bottom scale-[0.92] xl:scale-100">
                <HeroProductPlane className="min-h-0 rounded-2xl border border-slate-200/70 shadow-md" />
              </div>
              <div className="grid gap-3 xl:grid-cols-2">
                <PipelineShowcase className="hidden xl:grid" />
                <VisitTaskShowcase />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
