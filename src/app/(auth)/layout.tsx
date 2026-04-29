import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import {
  Building2,
  CalendarCheck,
  Users,
  PieChart,
  Shield,
  Handshake,
} from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        {/* Left: form column */}
        <div className="flex flex-col px-6 py-8 lg:px-16">
          <div className="flex items-center justify-between">
            <Link href="/" className="inline-flex">
              <Logo size="md" />
            </Link>
            <Link
              href="mailto:support@tristarrealtors.in"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Need help?
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-12">
            <div className="w-full max-w-md">{children}</div>
          </div>

          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <p>© {new Date().getFullYear()} Tristar Realtors</p>
            <div className="flex items-center gap-4">
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-foreground">
                Terms
              </Link>
            </div>
          </div>
        </div>

        {/* Right: marketing column */}
        <div className="relative hidden overflow-hidden lg:block">
          <div className="absolute inset-0 bg-mesh-emerald" />
          <div className="absolute inset-0 bg-grid opacity-[0.35]" />

          <div className="relative flex h-full flex-col justify-between p-16">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-white/70 px-3 py-1 text-xs font-medium text-primary-700 backdrop-blur">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" /> The Tristar
                Realtors operating system
              </div>
              <h2 className="mt-6 max-w-md text-4xl font-bold leading-tight tracking-tight text-foreground">
                One CRM for{" "}
                <span className="text-brand-gradient">every Tristar lead, visit and booking.</span>
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                Track inquiries the moment they land, auto-assign telecallers, run site
                visits, manage your channel partner network and close deals — all from one
                operations console built for the Tristar group.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <FeatureRow
                icon={<Building2 className="size-5" />}
                title="Projects, units & inventory"
                desc="Every Tristar project, every BHK, every floor — kept in sync with the sales team."
              />
              <FeatureRow
                icon={<Users className="size-5" />}
                title="Lead pipeline & telecalling"
                desc="From walk-in to booked — auto-assignment, follow-up reminders and stage tracking."
              />
              <FeatureRow
                icon={<CalendarCheck className="size-5" />}
                title="Site visit scheduling"
                desc="Calendar view, SVP dashboard, post-visit feedback and automatic SVC reports."
              />
              <FeatureRow
                icon={<Handshake className="size-5" />}
                title="Channel partner ops"
                desc="Onboard brokers, log RERA, track lead source attribution and pay commissions."
              />
              <FeatureRow
                icon={<PieChart className="size-5" />}
                title="Reports your team actually uses"
                desc="Lead volume, source mix, team performance, backlog, activity, SVC — all live."
              />
              <FeatureRow
                icon={<Shield className="size-5" />}
                title="RERA-ready & RBAC compliant"
                desc="Role-based access, full audit trail, project-scoped API keys."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-white/60 bg-white/60 p-4 backdrop-blur">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
      </div>
    </div>
  );
}
