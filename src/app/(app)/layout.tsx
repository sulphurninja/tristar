import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import Workspace from "@/models/Workspace";
import { getCurrentSession } from "@/lib/auth";
import { AuthProvider } from "@/contexts/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";
import { Topbar } from "@/components/layout/Topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  await connectDB();
  const workspace = await Workspace.findById(session.workspaceId).lean();
  if (!workspace) redirect("/login");

  return (
    <AuthProvider>
      <div className="flex min-h-screen w-full bg-background">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </AuthProvider>
  );
}
