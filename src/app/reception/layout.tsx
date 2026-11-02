import type { Metadata, Viewport } from "next";
import { redirect } from "next/navigation";
import { connectDB } from "@/lib/mongodb";
import { getCurrentSession } from "@/lib/auth";
import { can, loadAccess } from "@/lib/access";
import { AuthProvider } from "@/contexts/AuthContext";

export const metadata: Metadata = { title: "Reception" };
export const viewport: Viewport = { width: "device-width", initialScale: 1, maximumScale: 1, themeColor: "#ffffff" };

/** Full-screen kiosk outside the CRM shell — for the front-desk tablet. */
export default async function ReceptionLayout({ children }: { children: React.ReactNode }) {
  const token = await getCurrentSession();
  if (!token) redirect("/login?next=/reception");
  await connectDB();
  const session = await loadAccess(token);
  if (!session) redirect("/api/auth/logout");
  if (!can(session, "reception.manage")) redirect("/dashboard");
  return <AuthProvider>{children}</AuthProvider>;
}
