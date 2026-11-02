import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Workspace from "@/models/Workspace";
import { getCurrentSession } from "@/lib/auth";
import { loadAccess } from "@/lib/access";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  await connectDB();
  const [user, workspace, access] = await Promise.all([
    User.findById(session.userId),
    Workspace.findById(session.workspaceId),
    loadAccess(session),
  ]);

  if (!user || !workspace || !access) {
    return NextResponse.json({ user: null }, { status: 200 });
  }

  return NextResponse.json({
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      avatarUrl: user.avatarUrl,
      title: user.title,
      preferences: user.preferences,
      teamId: access.teamId ?? null,
      permissions: access.permissions,
      dataScope: access.dataScope,
    },
    workspace: {
      id: workspace._id,
      slug: workspace.slug,
      name: workspace.name,
      type: workspace.type,
      region: workspace.region,
      currency: workspace.currency,
      timezone: workspace.timezone,
      plan: workspace.plan,
      trialEndsAt: workspace.trialEndsAt,
      branding: workspace.branding,
      compliance: workspace.compliance,
      onboardingCompleted: workspace.onboardingCompleted,
      onboardingStep: workspace.onboardingStep,
    },
  });
}
