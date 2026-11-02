import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import Workspace from "@/models/Workspace";
import { getCurrentSession } from "@/lib/auth";
import { loadAccess } from "@/lib/access";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  await connectDB();
  const [workspace, access] = await Promise.all([
    Workspace.findById(session.workspaceId).lean(),
    loadAccess(session),
  ]);
  /* Deleted or suspended users lose the app immediately, even with a valid token. */
  if (!workspace || !access) redirect("/api/auth/logout");

  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
