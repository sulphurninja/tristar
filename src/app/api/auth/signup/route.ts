import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Workspace from "@/models/Workspace";
import User from "@/models/User";
import { ensureDefaultPipeline } from "@/models/Pipeline";
import { hashPassword, setAuthCookies } from "@/lib/auth";
import { slugify } from "@/lib/utils";

const SignupSchema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email().toLowerCase(),
  password: z.string().min(8).max(128),
  workspaceName: z.string().min(2).max(120).optional(),
  workspaceType: z
    .enum(["agency", "builder", "channel_partner_network", "individual_broker", "other"])
    .optional(),
  region: z.enum(["IN", "ME", "SEA", "EU", "US", "OTHER"]).optional(),
  phone: z.string().optional(),
});

/**
 * Tristar Realtors is a single-tenant deployment, so the first signup creates
 * the workspace as the owner and skips the multi-step onboarding flow. Anyone
 * who signs up after that gets an error — they must be invited from the
 * "Manage Users" screen instead.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = SignupSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    await connectDB();

    const {
      name,
      email,
      password,
      workspaceName = "Tristar Realtors",
      phone,
    } = parsed.data;

    /* Single-tenant guard — only allow signup if no workspace exists yet. */
    const existingWorkspaceCount = await Workspace.countDocuments();
    if (existingWorkspaceCount > 0) {
      return NextResponse.json(
        {
          error:
            "The Tristar Realtors workspace is already set up. Please sign in, or ask your admin to invite you from Settings → Manage Users.",
          code: "WORKSPACE_EXISTS",
        },
        { status: 403 },
      );
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try signing in instead." },
        { status: 409 },
      );
    }

    let baseSlug = slugify(workspaceName);
    if (!baseSlug) baseSlug = `tristar-${Date.now().toString(36)}`;

    const workspace = await Workspace.create({
      slug: baseSlug,
      name: workspaceName,
      type: "builder",
      region: "IN",
      timezone: "Asia/Kolkata",
      currency: "INR",
      onboardingCompleted: true,
      onboardingStep: "completed",
      compliance: { companyName: "Tristar Realtors Pvt. Ltd.", country: "IN" },
    });

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      workspaceId: workspace._id,
      name,
      email,
      phone,
      passwordHash,
      role: "owner",
    });

    workspace.createdBy = user._id;
    await workspace.save();

    /* Seed the default sales pipeline so the workspace is usable from minute one. */
    await ensureDefaultPipeline(workspace._id, user._id);

    await setAuthCookies({
      userId: String(user._id),
      workspaceId: String(workspace._id),
      role: "owner",
      email: user.email,
    });

    return NextResponse.json(
      {
        user: { id: user._id, name: user.name, email: user.email, role: user.role },
        workspace: {
          id: workspace._id,
          slug: workspace.slug,
          name: workspace.name,
          onboardingCompleted: true,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[tristar] /api/auth/signup error:", err);
    return NextResponse.json(
      { error: "Something went wrong creating your account. Please try again." },
      { status: 500 },
    );
  }
}
