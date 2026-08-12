import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import Workspace from "@/models/Workspace";
import { getCurrentSession } from "@/lib/auth";
import { AuthProvider } from "@/contexts/AuthContext";
import { AppShell } from "@/components/layout/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  await connectDB();
  const workspace = await Workspace.findById(session.workspaceId).lean();
  if (!workspace) redirect("/login");

  return (
    <AuthProvider>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  );
}
