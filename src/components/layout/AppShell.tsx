"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { NAV_LINKS, Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";
import { CommandPalette } from "@/components/layout/CommandPalette";
import { useAuth } from "@/contexts/AuthContext";
import { canAccessPage } from "@/lib/permissions";

export function AppShell({ children }: { children: React.ReactNode }) {
  const [navOpen, setNavOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    document.body.classList.add("bd-app");
    if (window.innerWidth < 1024) setNavOpen(false);
    return () => document.body.classList.remove("bd-app");
  }, []);

  const allowed = !user || canAccessPage(pathname, user.role, user.permissions);

  return (
    <div className="flex h-svh w-full overflow-hidden bg-background">
      <Sidebar open={navOpen} onOpenChange={setNavOpen} onSearch={() => setPaletteOpen(true)} />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Topbar onToggleNav={() => setNavOpen((v) => !v)} onSearch={() => setPaletteOpen(true)} />
        <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          {loading ? <ShellSkeleton /> : allowed ? children : <NoAccess />}
        </main>
      </div>
      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1680px] space-y-5 px-4 py-6 sm:px-6 lg:px-8">
      <div className="h-7 w-56 animate-pulse rounded-md bg-muted" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[92px] animate-pulse rounded-xl bg-muted/70" />
        ))}
      </div>
      <div className="h-80 animate-pulse rounded-xl bg-muted/50" />
    </div>
  );
}

function NoAccess() {
  const { user } = useAuth();
  const home = NAV_LINKS.find((l) => canAccessPage(l.href, user?.role, user?.permissions));
  return (
    <div className="flex min-h-full items-center justify-center p-6">
      <div className="ts-rise w-full max-w-md rounded-2xl border border-border bg-white p-8 text-center shadow-[var(--shadow-sm)]">
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary-50 text-primary ring-1 ring-primary/15">
          <Lock className="size-5" />
        </span>
        <h1 className="mt-4 text-[17px] font-semibold tracking-[-0.01em]">You don&apos;t have access to this page</h1>
        <p className="mt-1.5 text-[13px] text-muted-foreground">
          Your role doesn&apos;t include permission for this area. If you need it, ask your Super Administrator to
          update your permissions.
        </p>
        {home ? (
          <Link href={home.href} className="bd-btn mt-5">
            Go to {home.label}
          </Link>
        ) : null}
      </div>
    </div>
  );
}
