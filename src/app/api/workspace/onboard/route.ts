import { z } from "zod";
import Workspace from "@/models/Workspace";
import { withAuth, ok, bad } from "@/lib/api";

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

/** Guarded by `settings.manage` in the route policy. */
export const POST = withAuth(async ({ req, session }) => {
  const parsed = Schema.safeParse(await req.json());
  if (!parsed.success) return bad("Invalid input");
  const d = parsed.data;

  const workspace = await Workspace.findById(session.workspaceId);
  if (!workspace) return bad("Workspace not found", 404);

  workspace.branding = {
    ...(workspace.branding ?? {}),
    logoUrl: d.logoUrl || workspace.branding?.logoUrl,
    primaryColor: d.primaryColor || workspace.branding?.primaryColor,
    secondaryColor: d.secondaryColor || workspace.branding?.secondaryColor,
  };

  workspace.compliance = {
    ...(workspace.compliance ?? {}),
    reraNumber: d.reraNumber !== undefined ? d.reraNumber.trim() : workspace.compliance?.reraNumber,
    gstNumber: d.gstNumber !== undefined ? d.gstNumber.trim() : workspace.compliance?.gstNumber,
    companyName: d.companyName !== undefined ? d.companyName.trim() : workspace.compliance?.companyName,
    city: d.city !== undefined ? d.city.trim() : workspace.compliance?.city,
    state: d.state !== undefined ? d.state.trim() : workspace.compliance?.state,
  };

  workspace.onboardingCompleted = true;
  workspace.onboardingStep = "completed";
  await workspace.save();

  return ok({ ok: true });
});
