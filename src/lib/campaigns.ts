import { str } from "@/lib/cp";

const CHANNELS = ["facebook", "instagram", "google", "whatsapp", "sms", "email", "other"];
const STATUSES = ["draft", "active", "paused", "completed"];

/** Validate + whitelist a campaign create/update body into $set / $unset. */
export function parseCampaignBody(body: Record<string, unknown>, partial: boolean) {
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, 1> = {};
  let error: string | null = null;
  if (body.name !== undefined || !partial) {
    const n = str(body.name);
    if (!n) error = "Name is required.";
    else $set.name = n;
  }
  if (body.channel !== undefined) {
    if (!CHANNELS.includes(String(body.channel))) error = "Invalid channel.";
    else $set.channel = body.channel;
  }
  if (body.status !== undefined) {
    if (!STATUSES.includes(String(body.status))) error = "Invalid status.";
    else $set.status = body.status;
  }
  for (const k of ["utmSource", "utmMedium", "utmCampaign", "notes"] as const) {
    if (body[k] === undefined) continue;
    const v = str(body[k]);
    if (v) $set[k] = v;
    else $unset[k] = 1;
  }
  if (body.budget !== undefined) {
    if (body.budget === "" || body.budget === null) $unset.budget = 1;
    else {
      const b = Number(body.budget);
      if (!(b >= 0)) error = "Budget must be a positive number.";
      else $set.budget = b;
    }
  }
  for (const k of ["startDate", "endDate"] as const) {
    if (body[k] === undefined) continue;
    if (!body[k]) $unset[k] = 1;
    else {
      const d = new Date(body[k] as string);
      if (Number.isNaN(d.getTime())) error = "Invalid date.";
      else $set[k] = d;
    }
  }
  const s = ($set.startDate ?? null) as Date | null;
  const e = ($set.endDate ?? null) as Date | null;
  if (s && e && e < s) error = "End date cannot be before start date.";
  return { $set, $unset, error };
}
