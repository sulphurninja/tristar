import mongoose from "mongoose";
import User from "@/models/User";
import Team from "@/models/Team";
import { withAuth, ok, bad } from "@/lib/api";
import { ROLE_HIERARCHY } from "@/lib/roles";
import { hashPassword } from "@/lib/auth";
import { outranks } from "@/lib/roles";
import { normalizeUsername, suggestUsername, usernameProblem, usernameTaken } from "@/lib/username";

/**
 * GET /api/users            → everyone except deleted users (pickers, lists)
 * GET /api/users?deleted=1  → only deleted users (Users → Deleted)
 */
export const GET = withAuth(async ({ req, session }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const deleted = new URL(req.url).searchParams.get("deleted") === "1";

  /* Give older accounts a username the first time the list is read. */
  const missing = await User.find({ workspaceId, $or: [{ username: null }, { username: "" }] }).select("name email").lean();
  for (const u of missing) {
    await User.updateOne({ _id: u._id }, { $set: { username: await suggestUsername(u.name, u.email) } }).catch(() => undefined);
  }

  /* Permission overrides are only visible to the Super Administrator. */
  const hidden = session.role === "owner" ? "-passwordHash" : "-passwordHash -permissionOverrides";
  const users = await User.find({ workspaceId, status: deleted ? "deleted" : { $ne: "deleted" } })
    .select(hidden)
    .sort({ name: 1 })
    .lean();
  return ok({ users });
});

export const POST = withAuth(async ({ req, session }) => {

  const body = (await req.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" ? body.role : "sales_executive";
  if (!(role in ROLE_HIERARCHY)) return bad("Invalid role.");
  if (role === "owner" && session.role !== "owner") return bad("Only an owner can create another owner.", 403);
  if (outranks(role, session.role)) return bad("You can't create a user with a higher role than your own.", 403);
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
  const title = typeof body.title === "string" ? body.title.trim() : undefined;
  const region = typeof body.region === "string" && body.region.trim() ? body.region.trim() : undefined;

  if (!name || !email || password.length < 8) {
    return bad("Name, email and password (8+ chars) are required.");
  }

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  let teamId: mongoose.Types.ObjectId | undefined;
  if (typeof body.teamId === "string" && body.teamId) {
    if (!mongoose.isValidObjectId(body.teamId) || !(await Team.exists({ _id: body.teamId, workspaceId }))) {
      return bad("Team not found.");
    }
    teamId = new mongoose.Types.ObjectId(body.teamId);
  }
  const existing = await User.findOne({ workspaceId, email });
  if (existing) {
    return bad("A user with this email already exists in your workspace.", 409);
  }
  let username = normalizeUsername(body.username);
  if (username) {
    const problem = usernameProblem(username);
    if (problem) return bad(problem);
    if (await usernameTaken(username)) return bad("That username is already taken.", 409);
  } else username = await suggestUsername(name, email);

  const user = await User.create({
    workspaceId,
    name,
    email,
    username,
    phone,
    title,
    region,
    role,
    teamId,
    passwordHash: await hashPassword(password),
    invitedBy: new mongoose.Types.ObjectId(session.userId),
    invitedAt: new Date(),
    status: "active",
  });

  const safe = user.toObject();
  delete (safe as Record<string, unknown>).passwordHash;
  return ok({ user: safe }, { status: 201 });
});
