import { NextResponse } from "next/server";
import { z } from "zod";
import { connectDB } from "@/lib/mongodb";
import Workspace from "@/models/Workspace";
import { requireSession, hasRole, type Role } from "@/lib/auth";

/**
 * Updates workspace branding + compliance fields. Renamed from "onboard" but
 * the route lives here for backwards-compatibility with the settings UI.
 */
const Schema = z.object({
  logoUrl: z.string().optional().or(z.literal("")),
  primaryColor: z.string().optional(),
  secondaryColor: z.string().optional(),
  reraNumber: z.string().optional(),
  gstNumber: z.string().optional(),
  companyName: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    const session = await requireSession();
    if (!hasRole(session.role as Role, "admin")) {
      return NextResponse.json(
        { error: "Only admins can change workspace settings." },
        { status: 403 },
      );
    }

    const parsed = Schema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid input", details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const d = parsed.data;

    await connectDB();

    const workspace = await Workspace.findById(session.workspaceId);
    if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

    workspace.branding = {
      ...(workspace.branding ?? {}),
      logoUrl: d.logoUrl || workspace.branding?.logoUrl,
      primaryColor: d.primaryColor || workspace.branding?.primaryColor,
      secondaryColor: d.secondaryColor || workspace.branding?.secondaryColor,
    };

    workspace.compliance = {
      ...(workspace.compliance ?? {}),
      reraNumber: d.reraNumber || workspace.compliance?.reraNumber,
      gstNumber: d.gstNumber || workspace.compliance?.gstNumber,
      companyName: d.companyName || workspace.compliance?.companyName,
      city: d.city || workspace.compliance?.city,
      state: d.state || workspace.compliance?.state,
    };

    workspace.onboardingCompleted = true;
    workspace.onboardingStep = "completed";
    await workspace.save();

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Not signed in" }, { status: 401 });
    }
    console.error("[tristar] /api/workspace/onboard error:", err);
    return NextResponse.json({ error: "Couldn't save workspace settings." }, { status: 500 });
  }
}
