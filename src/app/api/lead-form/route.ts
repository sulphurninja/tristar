import Workspace from "@/models/Workspace";
import { withAuth, ok, bad } from "@/lib/api";
import { LEAD_FORM_SECTIONS, cleanFormConfig, type FormConfig } from "@/lib/lead-form";

/** The workspace's lead form layout. Readable by anyone who can open the form. */
export const GET = withAuth(async ({ session }) => {
  const ws = await Workspace.findById(session.workspaceId).select("leadFormConfig").lean();
  return ok({ config: ((ws as { leadFormConfig?: FormConfig } | null)?.leadFormConfig ?? {}) as FormConfig });
});

/** Replace the layout. Guarded by `settings.manage` in the route policy. */
export const PUT = withAuth(async ({ req, session }) => {
  const body = (await req.json().catch(() => null)) as { config?: unknown } | null;
  if (!body) return bad("Invalid body.");
  const config = cleanFormConfig(LEAD_FORM_SECTIONS, body.config);
  await Workspace.updateOne({ _id: session.workspaceId }, { $set: { leadFormConfig: config } });
  return ok({ config });
});
