import Workspace from "@/models/Workspace";
import { withAuth, ok, bad } from "@/lib/api";
import { cleanFormConfig } from "@/lib/lead-form";
import { RECEPTION_SECTIONS, normalizeReception } from "@/lib/reception-config";

/** Reception kiosk configuration (defaults merged in). */
export const GET = withAuth(async ({ session }) => {
  const ws = await Workspace.findById(session.workspaceId).select("receptionConfig name branding").lean();
  const raw = (ws as { receptionConfig?: unknown } | null)?.receptionConfig;
  return ok({ config: normalizeReception(raw) });
});

/** Replace the configuration. Guarded by `settings.manage` in the route policy. */
export const PUT = withAuth(async ({ req, session }) => {
  const body = (await req.json().catch(() => null)) as { config?: unknown } | null;
  if (!body?.config) return bad("Invalid body.");
  const config = normalizeReception(body.config);
  config.form = cleanFormConfig(RECEPTION_SECTIONS, (body.config as { form?: unknown }).form);
  await Workspace.updateOne({ _id: session.workspaceId }, { $set: { receptionConfig: config } });
  return ok({ config });
});
