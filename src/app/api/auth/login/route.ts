import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import User from "@/models/User";
import Workspace from "@/models/Workspace";
import { setAuthCookies, verifyPassword, type Role } from "@/lib/auth";

const LoginSchema = z.object({
  email: z.string().email().toLowerCase(),
  password: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const parsed = LoginSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: "Please enter a valid email and password." }, { status: 400 });
    }

    await connectDB();

    const { email, password } = parsed.data;
    const user = await User.findOne({ email }).select("+passwordHash");

    if (!user) {
      return NextResponse.json(
        { error: "We couldn't find an account with that email. Want to create one?", code: "NO_ACCOUNT" },
        { status: 404 },
      );
    }

    if (user.status === "suspended") {
      return NextResponse.json(
        { error: "Your account has been suspended. Please contact your workspace owner.", code: "SUSPENDED" },
        { status: 403 },
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "That password doesn't match. Try again or reset your password.", code: "BAD_PASSWORD" },
        { status: 401 },
      );
    }

    const workspace = await Workspace.findById(user.workspaceId);
    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found. Contact support." }, { status: 404 });
    }

    user.lastLoginAt = new Date();
    await user.save();

    await setAuthCookies({
      userId: String(user._id),
      workspaceId: String(workspace._id),
      role: user.role as Role,
      email: user.email,
    });

    return NextResponse.json({
      user: { id: user._id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
      workspace: {
        id: workspace._id,
        slug: workspace.slug,
        name: workspace.name,
        onboardingCompleted: workspace.onboardingCompleted,
        onboardingStep: workspace.onboardingStep,
      },
    });
  } catch (err) {
    console.error("[tristar] /api/auth/login error:", err);
    return NextResponse.json({ error: "Something went wrong signing you in. Please try again." }, { status: 500 });
  }
}
