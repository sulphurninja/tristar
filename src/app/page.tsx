import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Users,
  CalendarCheck,
  Handshake,
  PieChart,
  ShieldCheck,
  KeyRound,
  Upload,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900 antialiased">
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 lg:px-10">
          <Logo size="sm" />
          <nav className="hidden items-center gap-6 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Features
            </Link>
            <Link
              href="#reports"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Reports
            </Link>
            <Link
              href="mailto:support@tristarrealtors.in"
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Support
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
            >
              Set up workspace
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-mesh-emerald" />
        <div className="absolute inset-0 bg-grid opacity-[0.35]" />
        <div className="relative mx-auto max-w-7xl px-6 py-20 lg:px-10 lg:py-28">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200/60 bg-white/80 px-3 py-1 text-xs font-medium text-emerald-800 backdrop-blur">
              <span className="size-1.5 rounded-full bg-emerald-500" /> Internal CRM · Tristar
              Realtors
            </div>
            <h1 className="mt-6 text-5xl font-bold tracking-tight text-slate-900 lg:text-6xl">
              One CRM for{" "}
              <span className="text-brand-gradient">
                every Tristar lead, visit and booking.
              </span>
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-slate-600">
              Track inquiries the moment they land, auto-assign telecallers, run site visits,
              manage your channel partner network and report across the entire Tristar group
              of developments — from one focused workspace.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700"
              >
                Set up the Tristar workspace
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section id="features" className="border-t border-slate-200/70 px-6 py-20 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Core CRM features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Everything your sales team needs to close.
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Built specifically for the Tristar Realtors group — projects, leads, visits and
              brokers, all wired into one operational console.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Users}
              title="Lead Management"
              desc="Pipeline, bulk update, hot/warm/cold scoring, auto-assignment and follow-up scheduling."
            />
            <FeatureCard
              icon={Building2}
              title="Projects & inventory"
              desc="Every Tristar tower with RERA, configurations, pricing and unit availability."
            />
            <FeatureCard
              icon={CalendarCheck}
              title="Site Visits & SVP"
              desc="Calendar view, SVP dashboard, post-visit feedback and SVC reports."
            />
            <FeatureCard
              icon={Handshake}
              title="Channel Partners"
              desc="Broker directory, RERA, RM mapping, lead source attribution and commissions."
            />
            <FeatureCard
              icon={PieChart}
              title="Live operational reports"
              desc="Lead Volume, Team Performance, Source, Channel Partner, Backlog, Activity, SVC."
            />
            <FeatureCard
              icon={Upload}
              title="Bulk import / update"
              desc="CSV import for leads with magic field mapping. Update many records at once."
            />
            <FeatureCard
              icon={KeyRound}
              title="Project-scoped API keys"
              desc="Secure programmatic access for kiosks, partner lead-feeds and integrations."
            />
            <FeatureCard
              icon={ShieldCheck}
              title="Roles & access control"
              desc="Owner, admin, manager, supervisor, executive, telecaller — fully RBAC-aware."
            />
            <FeatureCard
              icon={Users}
              title="Requests & approvals"
              desc="Reassignments, status overrides and lead deletions — all logged and approved."
            />
          </div>
        </div>
      </section>

      <section
        id="reports"
        className="border-t border-slate-200/70 bg-slate-50/40 px-6 py-20 lg:px-10"
      >
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">
            Reports
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Reports your team actually opens.
          </h2>
          <p className="mt-3 max-w-2xl text-base text-slate-600">
            Every operational view at the click of a button. Live data, always.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[
              "Lead Volume Report",
              "Team Performance Report",
              "Projects Report",
              "Sources Report",
              "Channel Partner Report",
              "Backlog Report",
              "Closing Manager Backlog",
              "Activity Report",
              "Inactive Lead Report",
              "Inactive Lead Source",
              "SVC User Report",
              "SVC Source Report",
            ].map((label) => (
              <div
                key={label}
                className="rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-[13px] font-medium text-slate-700 shadow-xs"
              >
                {label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/70 px-6 py-10 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <Logo size="xs" />
            <p className="mt-2 text-xs text-slate-500">
              © {new Date().getFullYear()} Tristar Realtors. Internal CRM.
            </p>
          </div>
          <div className="flex items-center gap-5 text-xs text-slate-500">
            <Link href="/privacy" className="hover:text-slate-900">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-slate-900">
              Terms
            </Link>
            <Link href="mailto:support@tristarrealtors.in" className="hover:text-slate-900">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  desc,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-6 shadow-xs transition-all hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md">
      <div className="flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-slate-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{desc}</p>
    </div>
  );
}
