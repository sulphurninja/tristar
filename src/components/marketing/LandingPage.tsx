"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CalendarCheck,
  Handshake,
  KanbanSquare,
  ListChecks,
  PieChart,
  BookOpen,
  ShieldCheck,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import {
  HeroProductPlane,
  LeadTableShowcase,
  MetricsShowcase,
  PipelineShowcase,
  ReportsShowcase,
  VisitTaskShowcase,
} from "@/components/marketing/ProductShowcases";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  }),
};

const FEATURES = [
  {
    id: "leads",
    title: "Lead desk & advanced filters",
    desc: "Search, stage, priority, assignee — plus project, source and date range in More.",
    icon: ListChecks,
    visual: <LeadTableShowcase />,
  },
  {
    id: "pipeline",
    title: "Kanban pipeline",
    desc: "Drag-ready board across New, Warm, Site Visit and beyond — same stages your team lives in.",
    icon: KanbanSquare,
    visual: <PipelineShowcase />,
  },
  {
    id: "pulse",
    title: "Operational pulse",
    desc: "Metric strips and stage analysis so managers see today’s volume and overdue work at a glance.",
    icon: PieChart,
    visual: <MetricsShowcase className="lg:grid-cols-4" />,
  },
  {
    id: "visits",
    title: "Visits & tasks",
    desc: "Schedule site visits, log follow-ups, and keep every promise on the calendar.",
    icon: CalendarCheck,
    visual: <VisitTaskShowcase />,
  },
  {
    id: "reports",
    title: "Enterprise reports",
    desc: "Presets, custom date ranges and live charts — Lead Volume, Team PRF, SVC, Backlog and more.",
    icon: Building2,
    visual: <ReportsShowcase />,
  },
  {
    id: "partners",
    title: "Partners, bookings & accounts",
    desc: "Channel partners, bookings with approvals, ledger & vouchers with GST, TDS and snapshots.",
    icon: Handshake,
    visual: (
      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { label: "Channel partners", value: "142", hint: "Active CPs" },
          { label: "Bookings MTD", value: "28", hint: "₹4.2 Cr" },
          { label: "Open vouchers", value: "19", hint: "This week" },
        ].map((x) => (
          <div
            key={x.label}
            className="rounded-xl border border-slate-200/80 bg-white px-3 py-3 shadow-xs"
          >
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {x.label}
            </p>
            <p className="mt-1 text-[22px] font-semibold tabular-nums text-emerald-700">{x.value}</p>
            <p className="text-[12px] text-slate-500">{x.hint}</p>
          </div>
        ))}
      </div>
    ),
  },
];

export function LandingPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      <header className="absolute inset-x-0 top-0 z-40">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-5 lg:px-10">
          <Link href="/" aria-label="Tristar Realtors">
            <Logo size="sm" className="md:hidden" />
            <Logo size="md" className="hidden md:inline-flex" />
          </Link>
          <nav className="hidden items-center gap-7 md:flex">
            <a href="#product" className="text-[13.5px] font-medium text-slate-600 hover:text-slate-900">
              Product
            </a>
            <a href="#features" className="text-[13.5px] font-medium text-slate-600 hover:text-slate-900">
              Features
            </a>
            <a
              href="mailto:support@tristarrealtors.in"
              className="text-[13.5px] font-medium text-slate-600 hover:text-slate-900"
            >
              Support
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-[13.5px] font-semibold text-slate-700 hover:bg-white/70"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-2 text-[13.5px] font-semibold text-white hover:bg-emerald-700"
            >
              Get started
              <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero — one composition: brand, headline, line, CTAs + full-bleed product plane */}
      <section
        id="product"
        className="relative grid min-h-[100svh] grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
      >
        <div className="relative flex flex-col justify-end bg-gradient-to-br from-emerald-50/90 via-white to-sky-50/60 px-5 pb-12 pt-28 sm:px-8 lg:justify-center lg:px-12 lg:pb-0 lg:pt-20 xl:px-16">
          <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
          <div className="relative max-w-xl">
            <motion.div custom={0} variants={fadeUp} initial="hidden" animate="show">
              <Logo size="xl" className="mb-8" />
            </motion.div>
            <motion.h1
              custom={1}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="font-display text-[2.55rem] font-semibold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl xl:text-[3.35rem]"
            >
              The operating system for{" "}
              <span className="text-brand-gradient">Tristar sales.</span>
            </motion.h1>
            <motion.p
              custom={2}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-5 max-w-md text-[16px] leading-relaxed text-slate-600"
            >
              Leads, visits, partners, bookings and accounts — one workspace for every Tristar
              development.
            </motion.p>
            <motion.div
              custom={3}
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="mt-8 flex flex-wrap items-center gap-3"
            >
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-[14px] font-semibold text-white hover:bg-emerald-700"
              >
                Set up workspace
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white/80 px-5 py-3 text-[14px] font-semibold text-slate-800 hover:bg-white"
              >
                Sign in
              </Link>
            </motion.div>
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="relative min-h-[48vh] border-t border-slate-200/60 lg:min-h-0 lg:border-l lg:border-t-0"
        >
          <HeroProductPlane className="absolute inset-0 min-h-0" />
        </motion.div>
      </section>

      {/* Features with real UI */}
      <section id="features" className="border-t border-slate-200/70">
        <div className="mx-auto max-w-[1100px] px-5 py-16 sm:px-8 lg:py-24">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl"
          >
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-emerald-700">
              Platform features
            </p>
            <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
              Built from the screens your team opens every day.
            </h2>
            <p className="mt-3 text-[15px] leading-relaxed text-slate-600">
              Not mockups of some other product — these are the same filters, pills, metrics and
              boards you get inside Tristar CRM.
            </p>
          </motion.div>

          <div className="mt-14 space-y-20">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              const reverse = i % 2 === 1;
              return (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 28 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className={`grid items-center gap-8 lg:grid-cols-2 lg:gap-14 ${
                    reverse ? "lg:[&>*:first-child]:order-2" : ""
                  }`}
                >
                  <div>
                    <div className="inline-flex size-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <Icon className="size-5" strokeWidth={1.75} />
                    </div>
                    <h3 className="font-display mt-4 text-2xl font-semibold tracking-tight text-slate-900">
                      {f.title}
                    </h3>
                    <p className="mt-2 max-w-md text-[15px] leading-relaxed text-slate-600">
                      {f.desc}
                    </p>
                  </div>
                  <div>{f.visual}</div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust / access strip — one job */}
      <section className="border-t border-slate-200/70 bg-gradient-to-b from-slate-50 to-white">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-8 px-5 py-16 sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:py-20">
          <div className="max-w-lg">
            <div className="inline-flex items-center gap-2 text-emerald-700">
              <ShieldCheck className="size-5" />
              <span className="text-[12px] font-semibold uppercase tracking-[0.14em]">
                Roles & compliance
              </span>
            </div>
            <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              RBAC, requests and RERA-ready records.
            </h2>
            <p className="mt-2 text-[15px] text-slate-600">
              Owners, managers and executives see only what they should. Approvals and API keys stay
              under control.
            </p>
          </div>
          <ul className="grid flex-1 gap-3 sm:grid-cols-2">
            {[
              { icon: BookOpen, t: "Ledger & vouchers" },
              { icon: Handshake, t: "Channel partner KYC" },
              { icon: PieChart, t: "Live report exports" },
              { icon: ShieldCheck, t: "Audit-ready activity" },
            ].map(({ icon: Icon, t }) => (
              <li
                key={t}
                className="flex items-center gap-3 border-b border-slate-200/80 py-3 text-[14px] font-medium text-slate-800"
              >
                <Icon className="size-4 text-emerald-600" strokeWidth={1.75} />
                {t}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-slate-200/70">
        <div className="relative mx-auto max-w-[1100px] overflow-hidden px-5 py-16 sm:px-8 lg:py-20">
          <div className="pointer-events-none absolute inset-0 bg-mesh-emerald opacity-80" />
          <div className="relative flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Ready for the next enquiry?
              </h2>
              <p className="mt-2 text-[15px] text-slate-600">
                Sign in to the Tristar workspace or complete first-time setup.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-3 text-[14px] font-semibold text-white hover:bg-emerald-700"
              >
                Sign in
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center rounded-lg border border-slate-300 bg-white px-5 py-3 text-[14px] font-semibold text-slate-800 hover:bg-slate-50"
              >
                Create workspace
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200/70 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Logo size="xs" />
            <p className="mt-2 text-[12px] text-slate-500">
              © {new Date().getFullYear()} Tristar Realtors · Internal CRM
            </p>
          </div>
          <div className="flex gap-5 text-[12.5px] text-slate-500">
            <a href="mailto:support@tristarrealtors.in" className="hover:text-slate-900">
              support@tristarrealtors.in
            </a>
            <Link href="/login" className="hover:text-slate-900">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
