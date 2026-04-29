import mongoose from "mongoose";
import { customAlphabet } from "nanoid";
import bcrypt from "bcryptjs";
import ApiKey from "@/models/ApiKey";
import Project from "@/models/Project";
import User from "@/models/User";
import { withAuth, ok, bad } from "@/lib/api";

const generateKey = customAlphabet("abcdef0123456789", 24);
const generateSecret = customAlphabet(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  32,
);

export const GET = withAuth(async ({ session }) => {
  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);
  const keys = await ApiKey.find({ workspaceId })
    .sort({ createdAt: -1 })
    .populate({ path: "userId", select: "name email" })
    .populate({ path: "projectId", select: "name code" })
    .lean();
  return ok({ keys });
});

export const POST = withAuth(async ({ req, session }) => {
  const body = (await req.json()) as Record<string, unknown>;
  const sourceKey = typeof body.sourceKey === "string" ? body.sourceKey : "";
  const sourceLabel = typeof body.sourceLabel === "string" ? body.sourceLabel : "";
  const userId = typeof body.userId === "string" ? body.userId : "";
  const projectId = typeof body.projectId === "string" ? body.projectId : "";

  if (!sourceKey || !sourceLabel || !userId || !projectId) {
    return bad("Source, user and project are required.");
  }

  const workspaceId = new mongoose.Types.ObjectId(session.workspaceId);

  const [user, project] = await Promise.all([
    User.findOne({ _id: userId, workspaceId }).select("name email"),
    Project.findOne({ _id: projectId, workspaceId }).select("name code"),
  ]);
  if (!user) return bad("User not found in this workspace.", 404);
  if (!project) return bad("Project not found in this workspace.", 404);

  const key = generateKey();
  const secret = generateSecret();
  const secretHash = await bcrypt.hash(secret, 10);

  const created = await ApiKey.create({
    workspaceId,
    sourceKey,
    sourceLabel,
    userId: user._id,
    userName: user.name,
    projectId: project._id,
    projectName: project.name,
    key,
    secretHash,
    isActive: true,
    createdBy: new mongoose.Types.ObjectId(session.userId),
  });

  /* Return the secret ONLY at creation time. */
  return ok(
    {
      apiKey: {
        _id: created._id,
        key: created.key,
        secret,
        sourceKey: created.sourceKey,
        sourceLabel: created.sourceLabel,
        projectName: created.projectName,
        userName: created.userName,
        createdAt: created.createdAt,
      },
    },
    { status: 201 },
  );
});
