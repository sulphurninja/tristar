import mongoose from "mongoose";
import User from "@/models/User";
import Team from "@/models/Team";
import { withAuth, ok, bad } from "@/lib/api";
import { ROLE_HIERARCHY } from "@/lib/roles";
import { hashPassword, hasRole, type Role } from "@/lib/auth";

export const GET = withAuth(async ({ session }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const users = await User.find({ workspaceId }).select("-passwordHash").lean();
  return ok({ users });
});

export const POST = withAuth(async ({ req, session }) => {
  if (!hasRole(session.role as Role, "admin")) {
    return bad("You need admin access to create users.", 403);
  }

  const body = (await req.json()) as Record<string, unknown>;
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email =
    typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body.password === "string" ? body.password : "";
  const role = typeof body.role === "string" ? body.role : "sales_executive";
  if (!(role in ROLE_HIERARCHY)) return bad("Invalid role.");
  if (role === "owner" && session.role !== "owner") return bad("Only an owner can create another owner.", 403);
  const phone = typeof body.phone === "string" ? body.phone.trim() : undefined;
  const title = typeof body.title === "string" ? body.title.trim() : undefined;

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

  const user = await User.create({
    workspaceId,
    name,
    email,
    phone,
    title,
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
