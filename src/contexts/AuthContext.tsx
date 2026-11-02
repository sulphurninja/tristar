"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { DataScope, Permission } from "@/lib/permissions";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
  avatarUrl?: string;
  title?: string;
  teamId?: string | null;
  permissions: Permission[];
  dataScope: DataScope;
}

export interface SessionWorkspace {
  id: string;
  slug: string;
  name: string;
  type: string;
  region: string;
  currency: string;
  timezone: string;
  plan: string;
  trialEndsAt: string;
  branding?: { logoUrl?: string; primaryColor?: string; secondaryColor?: string };
  compliance?: { reraNumber?: string; companyName?: string };
  onboardingCompleted: boolean;
  onboardingStep: string;
}

interface AuthContextValue {
  user: SessionUser | null;
  workspace: SessionWorkspace | null;
  loading: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
  /** True when the signed-in user holds `perm` (the owner holds everything). */
  can: (perm: Permission) => boolean;
  isOwner: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [workspace, setWorkspace] = useState<SessionWorkspace | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json();
      setUser(data.user ?? null);
      setWorkspace(data.workspace ?? null);
    } catch {
      setUser(null);
      setWorkspace(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    setWorkspace(null);
    window.location.href = "/login";
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const isOwner = user?.role === "owner";
  const can = useCallback(
    (perm: Permission) => !!user && (user.role === "owner" || (user.permissions ?? []).includes(perm)),
    [user],
  );

  return (
    <AuthContext.Provider value={{ user, workspace, loading, refresh, signOut, can, isOwner }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
