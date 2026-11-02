import User from "@/models/User";

export const USERNAME_RE = /^[a-z0-9][a-z0-9._-]{2,29}$/;

export function normalizeUsername(v: unknown) {
  return typeof v === "string" ? v.trim().toLowerCase() : "";
}

/** Human-readable reason, or null when valid. */
export function usernameProblem(u: string) {
  if (!u) return "Username is required.";
  if (u.includes("@")) return "Usernames can't contain @.";
  if (!USERNAME_RE.test(u)) return "Use 3–30 letters, numbers, dots, dashes or underscores.";
  return null;
}

/** Usernames are global (people sign in without picking a workspace). */
export async function usernameTaken(u: string, exceptUserId?: string) {
  const hit = await User.findOne({ username: u }).select("_id").lean();
  return !!hit && String(hit._id) !== exceptUserId;
}

/** Suggest a free username from a name, e.g. "Akanksha Padole" → "akanksha", "akanksha.p", "akanksha2". */
export async function suggestUsername(name: string, email?: string) {
  const parts = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9 ]/g, "")
    .split(/\s+/)
    .filter(Boolean);
  const fromEmail = (email ?? "").split("@")[0].toLowerCase().replace(/[^a-z0-9._-]/g, "");
  const first = parts[0] ?? fromEmail ?? "user";
  const candidates = [
    first,
    parts[1] ? `${first}.${parts[1][0]}` : "",
    parts[1] ? `${first}.${parts[1]}` : "",
    fromEmail,
  ].filter((c) => c && USERNAME_RE.test(c));
  for (const c of candidates) if (!(await usernameTaken(c))) return c;
  const base = (candidates[0] ?? "user").slice(0, 24);
  for (let i = 2; i < 10000; i++) {
    const c = `${base}${i}`;
    if (!(await usernameTaken(c))) return c;
  }
  return `${base}${Date.now().toString(36)}`;
}
